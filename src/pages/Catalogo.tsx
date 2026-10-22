import { useQuery } from '@tanstack/react-query';
import { getChannels, getProviders } from '../api/catalog';
import CatalogStatusBadge from '../components/catalog/CatalogStatusBadge';
import ChannelIcon from '../components/catalog/ChannelIcon';
import { Link } from 'react-router-dom';

const AVATAR_TONES = 5;

function avatarTone(providerId: string): number {
    return [...providerId].reduce((sum, char) => sum + char.charCodeAt(0), 0) % AVATAR_TONES;
}

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

    const providerTotal = providers?.items.length ?? 0;
    const providersEnabled =
        providers?.items.filter((provider) => provider.status === 'ENABLED').length ?? 0;

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
                    <dl className="cat-stats">
                        <div className="cat-stat cat-stat--ok">
                            <dt>Habilitados</dt>
                            <dd>
                                {providersEnabled}
                                <span className="cat-stat__of"> de {providerTotal}</span>
                            </dd>
                        </div>
                        <div className="cat-stat">
                            <dt>Canales</dt>
                            <dd>{channels?.items.length ?? 0}</dd>
                        </div>
                        <div className="cat-stat">
                            <dt>Proveedores</dt>
                            <dd>{providerTotal}</dd>
                        </div>
                    </dl>

                    <section className="catalog-section">
                        <div className="catalog-section-header">
                            <div>
                                <h2>Canales</h2>
                                <p>Proveedores disponibles para cada canal.</p>
                            </div>
                        </div>

                        {channels?.items.length === 0 ? (
                            <div className="state-message">No hay canales registrados.</div>
                        ) : (
                            <div className="cat-channel-grid">
                                {channels?.items.map((channel) => (
                                    <Link
                                        key={channel.channelType}
                                        to={`/catalogo/${channel.channelType}`}
                                        className="cat-channel"
                                    >
                                        <div className="cat-channel__head">
                                            <span className="cat-icon">
                                                <ChannelIcon channelType={channel.channelType} />
                                            </span>
                                            <div className="cat-channel__title">
                                                <h3>{channel.channelType}</h3>
                                                <span className="cell-muted">
                                                    {channel.providers.length}{' '}
                                                    {channel.providers.length === 1
                                                        ? 'proveedor'
                                                        : 'proveedores'}
                                                </span>
                                            </div>
                                            <span className="cat-channel__go" aria-hidden="true">
                                                →
                                            </span>
                                        </div>

                                        <ol className="cat-chain">
                                            {channel.providers.map((provider) => (
                                                <li
                                                    key={provider.providerId}
                                                    className={`cat-chain__step cat-chain__step--${provider.status.toLowerCase()}`}
                                                >
                                                    <span className="cat-chain__order">
                                                        {provider.preferenceOrder}
                                                    </span>
                                                    <div className="cat-chain__info">
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
                                                </li>
                                            ))}
                                        </ol>
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

                            <span className="catalog-section-count">{providerTotal}</span>
                        </div>

                        {providers?.items.length === 0 ? (
                            <div className="state-message">No hay proveedores registrados.</div>
                        ) : (
                            <div className="cat-provider-grid">
                                {providers?.items.map((provider) => (
                                    <article key={provider.providerId} className="cat-provider">
                                        <div className="cat-provider__head">
                                            <span
                                                className={`cat-avatar cat-avatar--${avatarTone(provider.providerId)}`}
                                                aria-hidden="true"
                                            >
                                                {provider.providerId.charAt(0).toUpperCase()}
                                            </span>
                                            <div>
                                                <h3>{provider.providerId}</h3>
                                                <CatalogStatusBadge status={provider.status} />
                                            </div>
                                        </div>

                                        {provider.statusReason && (
                                            <span className="catalog-status-reason">
                                                {provider.statusReason}
                                            </span>
                                        )}

                                        <div className="cat-provider__channels">
                                            {provider.channels.map((channel) => (
                                                <span
                                                    key={channel.channelType}
                                                    className="cat-chip"
                                                >
                                                    <ChannelIcon
                                                        channelType={channel.channelType}
                                                    />
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
