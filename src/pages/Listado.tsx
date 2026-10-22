import { Link, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api/client';
import type { components } from '../api/schema';
import StatusBadge from '../components/StatusBadge';
import LiveConnectionBadge from '../components/LiveConnectionBadge';
import Pagination from '../components/Pagination';
import ChannelIcon from '../components/catalog/ChannelIcon';
import NotificationDetail from '../components/detail/NotificationDetail';
import { NOTIFICATIONS_KEY, useNotificationsLiveFeed } from '../hooks/useNotificationsLiveFeed';
import { useNow } from '../hooks/useNow';
import { formatAgo } from '../lib/notificationTimeline';
import { pageToOffset, parsePageParams } from '../lib/pagination';

type NotificationSearchResponse = components['schemas']['NotificationSearchResponse'];

const SELECTED_PARAM = 'sel';

function formatDate(value?: string) {
    return value
        ? new Date(value).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })
        : 'sin datos';
}

export default function Listado() {
    const [searchParams, setSearchParams] = useSearchParams();
    const { page, size } = parsePageParams(searchParams);
    const offset = pageToOffset({ page, size });
    const selectedId = searchParams.get(SELECTED_PARAM) ?? undefined;
    const now = useNow(30_000);
    const { data, isLoading, isError, error, isPlaceholderData } = useQuery({
        queryKey: [...NOTIFICATIONS_KEY, { limit: size, offset }],
        queryFn: () =>
            apiFetch<NotificationSearchResponse>(`/notifications?limit=${size}&offset=${offset}`),
        placeholderData: keepPreviousData,
        refetchOnMount: offset > 0,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });
    const goToPage = (nextPage: number, nextSize = size) =>
        setSearchParams({ page: String(nextPage), size: String(nextSize) });
    const select = (id: string | undefined) => {
        const next = new URLSearchParams(searchParams);
        if (id) {
            next.set(SELECTED_PARAM, id);
        } else {
            next.delete(SELECTED_PARAM);
        }
        setSearchParams(next);
    };
    const connectionState = useNotificationsLiveFeed();
    const selectedItem = data?.items.find((n) => n.notificationId === selectedId);

    return (
        <div>
            <div className="page-header page-header--with-action">
                <div>
                    <div className="page-title-line">
                        <h1>Notificaciones</h1>
                        <LiveConnectionBadge state={connectionState} />
                    </div>
                    <p className="page-subtitle">
                        Historial de notificaciones aceptadas por el sistema.
                    </p>
                </div>
                <Link className="button" to="/notificaciones/nueva">
                    Nueva notificación
                </Link>
            </div>

            {isLoading && <div className="state-message">Cargando notificaciones...</div>}

            {isError && (
                <div className="state-message state-message--error">
                    No se pudo consultar el historial: {String(error)}
                </div>
            )}

            {!isLoading && !isError && (!data || data.items.length === 0) && page === 1 && (
                <div className="state-message">Todavía no hay notificaciones.</div>
            )}

            {!isLoading &&
                !isError &&
                !isPlaceholderData &&
                data?.items.length === 0 &&
                page > 1 && (
                    <div className="state-message">
                        Esta página no tiene resultados.{' '}
                        <button type="button" className="link-button" onClick={() => goToPage(1)}>
                            Ir a la primera página
                        </button>
                    </div>
                )}

            {!isLoading && !isError && data && data.items.length > 0 && (
                <div className={selectedId ? 'list-split list-split--open' : 'list-split'}>
                    <div className="list-split__main">
                        <div className="table-frame table-scroll">
                            <table className="data-table notif-table">
                                <thead>
                                    <tr>
                                        <th>Destinatario</th>
                                        <th>Canal</th>
                                        <th>Estado</th>
                                        <th className="col-secondary">Proveedor</th>
                                        <th>Aceptada</th>
                                        <th className="col-secondary">Intentos</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.items.map((n) => {
                                        const provider = n.deliveryAttempts?.at(-1)?.providerId;
                                        const accepted = n.acceptedAt
                                            ? Date.parse(n.acceptedAt)
                                            : undefined;
                                        const isSelected = n.notificationId === selectedId;
                                        return (
                                            <tr
                                                key={n.notificationId}
                                                className={isSelected ? 'is-selected' : undefined}
                                                aria-current={isSelected ? 'true' : undefined}
                                                onClick={() => select(n.notificationId)}
                                            >
                                                <td className="cell-strong">
                                                    <span
                                                        className="cell-recipient"
                                                        title={n.recipientId}
                                                    >
                                                        {n.recipientId}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="channel-pill">
                                                        <ChannelIcon channelType={n.channelType} />
                                                        {n.channelType}
                                                    </span>
                                                </td>
                                                <td>
                                                    <StatusBadge status={n.status} />
                                                </td>
                                                <td className="cell-muted col-secondary">
                                                    {provider ? (
                                                        <span className="provider-tag">
                                                            {provider}
                                                        </span>
                                                    ) : (
                                                        'sin intento todavía'
                                                    )}
                                                </td>
                                                <td className="cell-muted cell-when">
                                                    <span title={formatDate(n.acceptedAt)}>
                                                        {accepted === undefined
                                                            ? 'sin datos'
                                                            : formatAgo(now - accepted)}
                                                    </span>
                                                    <small>{formatDate(n.acceptedAt)}</small>
                                                </td>
                                                <td className="cell-muted col-secondary">
                                                    <span className="count-pill">
                                                        {n.deliveryAttempts?.length ?? 0}
                                                    </span>
                                                </td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="link-button"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            select(n.notificationId);
                                                        }}
                                                    >
                                                        Ver detalle
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {selectedId && (
                        <aside className="detail-dock" aria-label="Detalle de la notificación">
                            <header className="detail-dock__head">
                                <h2>Detalle</h2>
                                <Link
                                    className="link-button"
                                    to={`/notificaciones/${encodeURIComponent(selectedId)}`}
                                >
                                    Abrir en página
                                </Link>
                                <button
                                    type="button"
                                    className="detail-dock__close"
                                    aria-label="Cerrar detalle"
                                    onClick={() => select(undefined)}
                                >
                                    ×
                                </button>
                            </header>
                            <div className="detail-dock__body">
                                {selectedItem && (
                                    <dl className="detail-dock__who">
                                        <dt>Destinatario</dt>
                                        <dd title={selectedItem.recipientId}>
                                            {selectedItem.recipientId}
                                        </dd>
                                    </dl>
                                )}
                                <NotificationDetail
                                    id={selectedId}
                                    variant="panel"
                                    historyItem={selectedItem}
                                />
                            </div>
                        </aside>
                    )}
                </div>
            )}

            {!isLoading && !isError && data && (page > 1 || data.items.length > 0) && (
                <Pagination
                    page={page}
                    size={size}
                    offset={offset}
                    count={data.items.length}
                    hasNext={data.hasNext}
                    busy={isPlaceholderData}
                    onPageChange={(nextPage) => goToPage(nextPage)}
                    onSizeChange={(nextSize) => goToPage(1, nextSize)}
                />
            )}
        </div>
    );
}
