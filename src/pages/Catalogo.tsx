import { useQuery } from '@tanstack/react-query';
import { getChannels, getProviders } from '../api/catalog';
import CatalogStatusBadge from '../components/catalog/CatalogStatusBadge';
import { Link } from 'react-router-dom';

export default function Catalogo() {
    const {
        data: channels,
        isLoading: channelsLoading,
        isError: channelsError,
        error: channelsErrorData,
    } = useQuery({
        queryKey: ['catalog', 'channels'],
        queryFn: getChannels,
    });

    const {
        data: providers,
        isLoading: providersLoading,
        isError: providersError,
        error: providersErrorData,
    } = useQuery({
        queryKey: ['catalog', 'providers'],
        queryFn: getProviders,
    });

    const isLoading = channelsLoading || providersLoading;
    const isError = channelsError || providersError;

    const error =
        channelsErrorData?.message ??
        providersErrorData?.message ??
        'No fue posible consultar el catálogo.';

    return (
        <div>
            <div className="page-header">
                <h1>Catálogo</h1>
                <p className="page-subtitle">Canales y proveedores registrados.</p>
            </div>

            {isLoading && <div className="state-message">Cargando catálogo...</div>}

            {isError && (
                <div className="state-message state-message--error">
                    No se pudo consultar el catálogo: {error}
                </div>
            )}

            {!isLoading && !isError && (
                <>
                    <section className="catalog-section">
                        <div className="catalog-section-header">
                            <div>
                                <h2>Canales</h2>
                                <p>Proveedores disponibles para cada canal.</p>
                            </div>

                            <span className="catalog-section-count">
                                {channels?.items.length ?? 0}
                            </span>
                        </div>

                        {channels?.items.length === 0 ? (
                            <div className="state-message">No hay canales registrados.</div>
                        ) : (
                            <div className="catalog-channel-grid">
                                {channels?.items.map((channel) => (
                                    <Link
                                        key={channel.channelType}
                                        to={`/catalogo/${channel.channelType}`}
                                        className="catalog-channel-card catalog-channel-card--link"
                                    >
                                        <div className="catalog-channel-header">
                                            <h3>{channel.channelType}</h3>

                                            <span className="cell-muted">
                                                {channel.providers.length}{' '}
                                                {channel.providers.length === 1
                                                    ? 'proveedor'
                                                    : 'proveedores'}
                                            </span>
                                        </div>

                                        <div className="catalog-provider-list">
                                            {channel.providers.map((provider) => (
                                                <div
                                                    key={provider.providerId}
                                                    className="catalog-provider-row"
                                                >
                                                    <div>
                                                        <strong>{provider.providerId}</strong>

                                                        <span className="catalog-provider-preference">
                                                            Preferencia #{provider.preferenceOrder}
                                                        </span>

                                                        {provider.statusReason && (
                                                            <span className="catalog-status-reason">
                                                                {provider.statusReason}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <CatalogStatusBadge status={provider.status} />
                                                </div>
                                            ))}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="catalog-section">
                        <div className="catalog-section-header">
                            <div>
                                <h2>Proveedores</h2>
                                <p>Proveedores configurados en el sistema.</p>
                            </div>

                            <span className="catalog-section-count">
                                {providers?.items.length ?? 0}
                            </span>
                        </div>

                        {providers?.items.length === 0 ? (
                            <div className="state-message">No hay proveedores registrados.</div>
                        ) : (
                            <div className="catalog-provider-grid">
                                {providers?.items.map((provider) => (
                                    <article
                                        key={provider.providerId}
                                        className="catalog-provider-card"
                                    >
                                        <div>
                                            <h3>{provider.providerId}</h3>

                                            <CatalogStatusBadge status={provider.status} />

                                            {provider.statusReason && (
                                                <span className="catalog-status-reason">
                                                    {provider.statusReason}
                                                </span>
                                            )}
                                        </div>

                                        <div className="catalog-provider-channels">
                                            {provider.channels.map((channel) => (
                                                <span
                                                    key={channel.channelType}
                                                    className="catalog-channel-tag"
                                                >
                                                    {channel.channelType}
                                                </span>
                                            ))}
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}
