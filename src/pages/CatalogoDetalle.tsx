import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getChannels } from '../api/catalog';
import CatalogStatusBadge from '../components/catalog/CatalogStatusBadge';

export default function CatalogoDetalle() {
    const { channelType } = useParams<{ channelType: string }>();

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['catalog', 'channels'],
        queryFn: getChannels,
    });

    if (isLoading) {
        return (
            <div>
                <div className="page-header">
                    <h1>Catálogo</h1>
                </div>

                <div className="state-message">Cargando canal...</div>
            </div>
        );
    }

    if (isError) {
        return (
            <div>
                <div className="page-header">
                    <h1>Catálogo</h1>
                </div>

                <div className="state-message state-message--error">
                    No se pudo consultar el catálogo: {String(error)}
                </div>
            </div>
        );
    }

    const channel = data?.items.find((item) => item.channelType === channelType);

    if (!channel) {
        return (
            <div>
                <div className="page-header">
                    <h1>Canal no encontrado</h1>
                </div>

                <div className="state-message">El canal solicitado no existe en el catálogo.</div>

                <Link to="/catalogo" className="link-button">
                    Volver al catálogo
                </Link>
            </div>
        );
    }

    return (
        <div>
            <div className="page-header">
                <Link to="/catalogo" className="catalog-back-link">
                    ← Volver al catálogo
                </Link>

                <h1>{channel.channelType}</h1>

                <p className="page-subtitle">Proveedores configurados para este canal.</p>
            </div>

            <section className="catalog-detail-section">
                <div className="catalog-detail-header">
                    <div>
                        <h2>Proveedores</h2>
                        <p>
                            {channel.providers.length}{' '}
                            {channel.providers.length === 1
                                ? 'proveedor configurado'
                                : 'proveedores configurados'}
                        </p>
                    </div>
                </div>

                <div className="catalog-detail-list">
                    {channel.providers.map((provider) => (
                        <article key={provider.providerId} className="catalog-detail-card">
                            <div className="catalog-detail-card-info">
                                <div>
                                    <h3>{provider.providerId}</h3>

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

                            <div className="catalog-detail-card-action">
                                {provider.status === 'ENABLED' ? (
                                    <button
                                        type="button"
                                        className="catalog-action-button catalog-action-button--danger"
                                        disabled
                                    >
                                        Deshabilitar
                                    </button>
                                ) : provider.status === 'DISABLED' ? (
                                    <button
                                        type="button"
                                        className="catalog-action-button"
                                        disabled
                                    >
                                        Habilitar
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className="catalog-action-button"
                                        disabled
                                        title="No existe un adaptador para este proveedor"
                                    >
                                        Habilitar
                                    </button>
                                )}
                            </div>
                        </article>
                    ))}
                </div>
            </section>
        </div>
    );
}
