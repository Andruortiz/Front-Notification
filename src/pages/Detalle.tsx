import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api/client';
import type { components } from '../api/schema';
import StatusBadge from '../components/StatusBadge';
import LiveConnectionBadge from '../components/LiveConnectionBadge';
import { useNotificationLiveStatus } from '../hooks/useNotificationLiveStatus';
import { useRetryNotification, translateRetryError } from '../hooks/useRetryNotification';

type NotificationStatusResponse = components['schemas']['NotificationStatusResponse'];

const RETRYABLE_STATUSES = new Set(['FAILED', 'RECOVERABLE']);

export default function Detalle() {
    const { id } = useParams();

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['notification', id],
        queryFn: () => apiFetch<NotificationStatusResponse>(`/notifications/${id}`),
        enabled: Boolean(id),
    });
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
                            <dt>ID</dt>
                            <dd>
                                <code>{data.notificationId}</code>
                            </dd>
                            <dt>Canal</dt>
                            <dd>{data.channelType}</dd>
                            <dt>Proveedor</dt>
                            <dd>{data.providerId ?? 'sin intento todavía'}</dd>
                            <dt>Última actualización</dt>
                            <dd>
                                {data.lastUpdatedAt
                                    ? new Date(data.lastUpdatedAt).toLocaleString()
                                    : 'sin datos'}
                            </dd>
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
