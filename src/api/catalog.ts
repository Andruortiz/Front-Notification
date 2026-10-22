import { apiFetch } from '../api/client';
import type { components } from './schema';

type ChannelCatalogResponse = components['schemas']['ChannelCatalogResponse'];

type ProviderCatalogResponse = components['schemas']['ProviderCatalogResponse'];

export function getChannels(): Promise<ChannelCatalogResponse> {
    return apiFetch<ChannelCatalogResponse>('/channels');
}

export function getProviders(): Promise<ProviderCatalogResponse> {
    return apiFetch<ProviderCatalogResponse>('/providers');
}
