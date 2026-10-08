import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api/client';
import type { components } from '../api/schema';
import StatusBadge from '../components/StatusBadge';
import LiveConnectionBadge from '../components/LiveConnectionBadge';
import { useNotificationLiveStatus } from '../hooks/useNotificationLiveStatus';
import { useRetryNotification, translateRetryError } from '../hooks/useRetryNotification';

type NotificationStatusResponse = components['schemas']['NotificationStatusResponse'];
type NotificationSearchResponse = components['schemas']['NotificationSearchResponse'];

const ATTEMPT_RESULT_LABELS = {
    ACCEPTED: 'Aceptado por el proveedor',
    RECOVERABLE_FAILURE: 'Fallo recuperable',
    PERMANENT_FAILURE: 'Fallo permanente',
} as const;

const ATTEMPT_ORIGIN_LABELS = { MANUAL: 'manual', AUTOMATIC: 'automático' } as const;

function formatDate(value?: string) {
    return value ? new Date(value).toLocaleString() : 'sin datos';
}

const RETRYABLE_STATUSES = new Set(['FAILED', 'RECOVERABLE']);

export default function Detalle() {
    const { id } = useParams();

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['notification', id],
        queryFn: () => apiFetch<NotificationStatusResponse>(`/notifications/${id}`),
        enabled: Boolean(id),
    });
    // El detalle no trae los tiempos; se toman del historial (límite máximo de la API).
    const { data: history } = useQuery({
        queryKey: ['notification', id, 'history'],
        queryFn: () => apiFetch<NotificationSearchResponse>('/notifications?limit=200'),
        select: (res) => res.items.find((n) => n.notificationId === id),
        enabled: Boolean(id),
    });
    const attempts = history?.deliveryAttempts ?? [];
    const connectionState = useNotificationLiveStatus(id);
    const retryMutation = useRetryNotification(id);

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
                    <div className="card card--flush">
                        <div className="detail-toolbar">
                            <div className="detail-statuses">
                                <StatusBadge status={data.status} />
                                <LiveConnectionBadge state={connectionState} />
                            </div>
                            {data.status && RETRYABLE_STATUSES.has(data.status) && (
                                <button
                                    type="button"
                                    className="button"
                                    disabled={retryMutation.isPending}
                                    onClick={() => retryMutation.mutate()}
                                >
                                    {retryMutation.isPending ? 'Reintentando...' : 'Reintentar'}
                                </button>
                            )}
                        </div>
                        <dl className="field-grid">
                            <dt>Canal</dt>
                            <dd>{data.channelType}</dd>
                            <dt>Proveedor</dt>
                            <dd>{data.providerId ?? 'sin intento todavía'}</dd>
                            {history && (
                                <>
                                    <dt>Aceptada</dt>
                                    <dd>{formatDate(history.acceptedAt)}</dd>
                                </>
                            )}
                            <dt>Última actualización</dt>
                            <dd>{formatDate(data.lastUpdatedAt)}</dd>
                            {history && (
                                <>
                                    <dt>Intentos de envío</dt>
                                    <dd>
                                        {attempts.length === 0 ? (
                                            'ninguno todavía'
                                        ) : (
                                            <ol className="attempt-list">
                                                {attempts.map((a, i) => (
                                                    <li key={`${a.occurredOn}-${i}`}>
                                                        {formatDate(a.occurredOn)} ·{' '}
                                                        {a.result
                                                            ? ATTEMPT_RESULT_LABELS[a.result]
                                                            : 'sin resultado'}{' '}
                                                        · {a.providerId ?? 'sin proveedor'}
                                                        {a.origin &&
                                                            ` (${ATTEMPT_ORIGIN_LABELS[a.origin]})`}
                                                    </li>
                                                ))}
                                            </ol>
                                        )}
                                    </dd>
                                </>
                            )}
                        </dl>

                        {retryMutation.isError && (
                            <div
                                role="alert"
                                className="state-message state-message--error form-alert"
                                style={{ margin: 20 }}
                            >
                                {translateRetryError(retryMutation.error)}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
