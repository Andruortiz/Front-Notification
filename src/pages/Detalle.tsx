import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api/client';
import type { components } from '../api/schema';
import StatusBadge from '../components/StatusBadge';
import AttemptTimeline from '../components/detail/AttemptTimeline';
import ConfirmRetryDialog from '../components/detail/ConfirmRetryDialog';
import { useNotificationLiveStatus } from '../hooks/useNotificationLiveStatus';
import { useNow } from '../hooks/useNow';
import { useRetryNotification, translateRetryError } from '../hooks/useRetryNotification';
import {
    STATUS_EXPLANATIONS,
    STATUS_MARKERS,
    STATUS_TONES,
    buildTimeline,
    elapsedMillis,
    formatAgo,
    formatDuration,
    isTerminal,
    sortAttempts,
    summarizeProviders,
} from '../lib/notificationTimeline';

type NotificationStatusResponse = components['schemas']['NotificationStatusResponse'];
type NotificationSearchResponse = components['schemas']['NotificationSearchResponse'];

const RETRYABLE_STATUSES = new Set(['FAILED', 'RECOVERABLE']);

export default function Detalle() {
    const { id } = useParams();
    const [confirmOpen, setConfirmOpen] = useState(false);
    const now = useNow();

    const { data, isLoading, isError, error, dataUpdatedAt } = useQuery({
        queryKey: ['notification', id],
        queryFn: () => apiFetch<NotificationStatusResponse>(`/notifications/${id}`),
        enabled: Boolean(id),
    });
    const { data: history, isLoading: historyLoading } = useQuery({
        queryKey: ['notification', id, 'history'],
        queryFn: () => apiFetch<NotificationSearchResponse>('/notifications?limit=200'),
        select: (res) => res.items.find((n) => n.notificationId === id),
        enabled: Boolean(id),
    });
    useNotificationLiveStatus(id);
    const retryMutation = useRetryNotification(id);

    const attempts = sortAttempts(history?.deliveryAttempts ?? []);
    const providers = summarizeProviders(attempts);
    const steps = buildTimeline({
        status: data?.status,
        acceptedAt: history?.acceptedAt,
        lastUpdatedAt: data?.lastUpdatedAt,
        attempts,
    });
    const elapsed = elapsedMillis({
        status: data?.status,
        acceptedAt: history?.acceptedAt,
        lastUpdatedAt: data?.lastUpdatedAt,
        now,
    });
    const status = data?.status ?? '';
    const tone = STATUS_TONES[status] ?? 'idle';
    const canRetry = RETRYABLE_STATUSES.has(status);
    const lastProvider = attempts.length > 0 ? attempts[attempts.length - 1].providerId : undefined;

    function confirmRetry() {
        setConfirmOpen(false);
        retryMutation.mutate();
    }

    return (
        <div>
            <div className="page-header">
                <Link className="link-button" to="/">
                    ← Volver al listado
                </Link>
            </div>

            {isLoading && <div className="state-message">Cargando notificación...</div>}

            {isError && (
                <div className="state-message state-message--error">
                    No se pudo consultar la notificación: {String(error)}
                </div>
            )}

            {!isLoading && !isError && !data && (
                <div className="state-message">No se encontró la notificación.</div>
            )}

            {data && (
                <>
                    <div className="page-header">
                        <h1>Detalle de notificación</h1>
                    </div>

                    <section className="card detail-hero" aria-label="Resumen">
                        <div className="detail-hero__head">
                            <div className="detail-hero__status">
                                <span
                                    className={`detail-hero__icon detail-tone--${tone}`}
                                    aria-hidden="true"
                                >
                                    {STATUS_MARKERS[status] ?? '·'}
                                </span>
                                <StatusBadge status={data.status} />
                            </div>
                            <div className="detail-hero__actions">
                                <span className="detail-hero__age">
                                    Actualizado {formatAgo(now - dataUpdatedAt)}
                                </span>
                                {canRetry && (
                                    <button
                                        type="button"
                                        className="button"
                                        disabled={retryMutation.isPending}
                                        onClick={() => setConfirmOpen(true)}
                                    >
                                        {retryMutation.isPending ? 'Reintentando...' : 'Reintentar'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {STATUS_EXPLANATIONS[status] && (
                            <p className={`detail-explain detail-tone--${tone}`}>
                                {STATUS_EXPLANATIONS[status]}
                            </p>
                        )}

                        <dl className="detail-stats">
                            <div className="detail-stat">
                                <dt>Canal</dt>
                                <dd>{data.channelType}</dd>
                            </div>
                            <div className="detail-stat">
                                <dt>Proveedor</dt>
                                <dd>{data.providerId ?? 'sin intento todavía'}</dd>
                            </div>
                            <div className="detail-stat">
                                <dt>Intentos</dt>
                                <dd>{history ? attempts.length : '—'}</dd>
                            </div>
                            <div className="detail-stat">
                                <dt>
                                    {isTerminal(data.status)
                                        ? 'Duración total'
                                        : 'Tiempo desde aceptación'}
                                </dt>
                                <dd>{elapsed === undefined ? '—' : formatDuration(elapsed)}</dd>
                            </div>
                        </dl>
                    </section>

                    <div className="detail-columns">
                        <section className="card">
                            <h2>Línea de tiempo</h2>
                            {historyLoading ? (
                                <p className="detail-muted">Cargando intentos...</p>
                            ) : (
                                <AttemptTimeline steps={steps} />
                            )}
                        </section>

                        <section className="card">
                            <h2>Proveedores</h2>
                            {providers.failed.length === 0 && !providers.deliveredBy ? (
                                <p className="detail-muted">Aún sin intentos.</p>
                            ) : (
                                <ul className="detail-providers">
                                    {providers.failed.map((provider) => (
                                        <li key={`failed-${provider}`}>
                                            <span className="status-badge status-badge--failed">
                                                falló
                                            </span>{' '}
                                            {provider}
                                        </li>
                                    ))}
                                    {providers.deliveredBy && (
                                        <li>
                                            <span className="status-badge status-badge--delivered">
                                                entregó
                                            </span>{' '}
                                            {providers.deliveredBy}
                                        </li>
                                    )}
                                </ul>
                            )}
                        </section>
                    </div>

                    {retryMutation.isError && (
                        <div role="alert" className="state-message state-message--error form-alert">
                            {translateRetryError(retryMutation.error)}
                        </div>
                    )}

                    <ConfirmRetryDialog
                        open={confirmOpen}
                        providerId={lastProvider ?? data.providerId}
                        onConfirm={confirmRetry}
                        onCancel={() => setConfirmOpen(false)}
                    />
                </>
            )}
        </div>
    );
}
