import type { components } from '../../api/schema';

type ProviderStatus = components['schemas']['ProviderStatus'];

interface CatalogStatusBadgeProps {
    status: ProviderStatus;
}

const labels: Record<ProviderStatus, string> = {
    ENABLED: 'Habilitado',
    DISABLED: 'Deshabilitado',
    MISSING_ADAPTER: 'Adaptador faltante',
};

export default function CatalogStatusBadge({ status }: CatalogStatusBadgeProps) {
    return (
        <span className={`catalog-status-badge catalog-status-badge--${status.toLowerCase()}`}>
            {labels[status]}
        </span>
    );
}
