import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api/client';
import type { components } from '../api/schema';
import StatusBadge from '../components/StatusBadge';

type NotificationHistoryItem = components['schemas']['NotificationHistoryItem'];

function formatDate(value?: string) {
    return value ? new Date(value).toLocaleString() : 'sin datos';
}

export default function Listado() {
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['notifications'],
        queryFn: () => apiFetch<NotificationHistoryItem[]>('/notifications'),
    });

    return (
        <div>
            <div className="page-header">
                <h1>Notificaciones</h1>
                <p className="page-subtitle">Historial de notificaciones aceptadas por el sistema.</p>
            </div>

            {isLoading && <div className="state-message">Cargando notificaciones...</div>}

            {isError && (
                <div className="state-message state-message--error">
                    No se pudo consultar el historial: {String(error)}
                </div>
            )}

            {!isLoading && !isError && (!data || data.length === 0) && (
                <div className="state-message">Todavía no hay notificaciones.</div>
            )}

            {!isLoading && !isError && data && data.length > 0 && (
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Destinatario</th>
                            <th>Canal</th>
                            <th>Estado</th>
                            <th>Aceptada</th>
                            <th>Intentos</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((n) => (
                            <tr key={n.notificationId}>
                                <td>{n.externalId}</td>
                                <td>{n.channelType}</td>
                                <td>
                                    <StatusBadge status={n.status} />
                                </td>
                                <td className="cell-muted">{formatDate(n.acceptedAt)}</td>
                                <td className="cell-muted">{n.deliveryAttempts?.length ?? 0}</td>
                                <td>
                                    <Link className="link-button" to={`/notificaciones/${n.notificationId}`}>
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
