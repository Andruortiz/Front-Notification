import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api/client';
import type { components } from '../api/schema';
import StatusBadge from '../components/StatusBadge';
import LiveConnectionBadge from '../components/LiveConnectionBadge';
import { useNotificationsLiveFeed } from '../hooks/useNotificationsLiveFeed';

type NotificationSearchResponse = components['schemas']['NotificationSearchResponse'];

function formatDate(value?: string) {
    return value ? new Date(value).toLocaleString() : 'sin datos';
}

export default function Listado() {
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['notifications'],
        queryFn: () => apiFetch<NotificationSearchResponse>('/notifications'),
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });
    const connectionState = useNotificationsLiveFeed();

    return (
        <div>
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <h1 style={{ marginBottom: 0 }}>Notificaciones</h1>
                    <LiveConnectionBadge state={connectionState} />
                </div>
                <p className="page-subtitle">
                    Historial de notificaciones aceptadas por el sistema.
                </p>
            </div>

            {isLoading && <div className="state-message">Cargando notificaciones...</div>}

            {isError && (
                <div className="state-message state-message--error">
                    No se pudo consultar el historial: {String(error)}
                </div>
            )}

            {!isLoading && !isError && (!data || data.items.length === 0) && (
                <div className="state-message">Todavía no hay notificaciones.</div>
            )}

            {!isLoading && !isError && data && data.items.length > 0 && (
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Destinatario</th>
                            <th>Canal</th>
                            <th>Estado</th>
                            <th>Proveedor</th>
                            <th>Aceptada</th>
                            <th>Intentos</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.items.map((n) => (
                            <tr key={n.notificationId}>
                                <td>{n.recipientId}</td>
                                <td>{n.channelType}</td>
                                <td>
                                    <StatusBadge status={n.status} />
                                </td>
                                <td className="cell-muted">
                                    {n.deliveryAttempts?.at(-1)?.providerId ??
                                        'sin intento todavía'}
                                </td>
                                <td className="cell-muted">{formatDate(n.acceptedAt)}</td>
                                <td className="cell-muted">{n.deliveryAttempts?.length ?? 0}</td>
                                <td>
                                    <Link
                                        className="link-button"
                                        to={`/notificaciones/${n.notificationId}`}
                                    >
                                        Ver detalle
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
