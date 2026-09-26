import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api/client';
import type { components } from '../api/schema';
import StatusBadge from '../components/StatusBadge';

type NotificationStatusResponse = components['schemas']['NotificationStatusResponse'];

export default function Detalle() {
    const { id } = useParams();

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['notification', id],
        queryFn: () => apiFetch<NotificationStatusResponse>(`/notifications/${id}`),
        enabled: Boolean(id),
    });

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
                <div className="card">
                    <div
                        style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}
                    >
                        <h1 style={{ marginBottom: 0 }}>Detalle de notificación</h1>
                        <StatusBadge status={data.status} />
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
                </div>
            )}
        </div>
    );
}
