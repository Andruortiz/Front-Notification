import { fetchEventSource, EventStreamContentType } from '@microsoft/fetch-event-source';
import { authHeaders } from './client';
import { reloginOnUnauthorized, sessionModeUrl } from '../security/session';
import type { components } from './schema';

type NotificationLiveUpdate = components['schemas']['NotificationLiveUpdate'];
type NotificationStatus = components['schemas']['NotificationStatus'];

export type LiveConnectionState = 'connecting' | 'open' | 'reconnecting' | 'closed';

export interface NotificationUpdatesFilters {
    recipientId?: string;
    channelType?: string;
    status?: NotificationStatus;
    from?: string;
    to?: string;
}

export interface NotificationUpdatesHandlers {
    onUpdate: (update: NotificationLiveUpdate) => void;
    onStateChange: (state: LiveConnectionState) => void;
}

class RetriableError extends Error {}

export function subscribeToNotificationUpdates(
    filters: NotificationUpdatesFilters,
    handlers: NotificationUpdatesHandlers,
    signal: AbortSignal,
): void {
    const params = new URLSearchParams();
    if (filters.recipientId) params.set('recipientId', filters.recipientId);
    if (filters.channelType) params.set('channelType', filters.channelType);
    if (filters.status) params.set('status', filters.status);
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    const query = params.toString();

    handlers.onStateChange('connecting');

    void fetchEventSource(`/api/notifications/stream${query ? `?${query}` : ''}`, {
        headers: authHeaders(),
        credentials: 'include',
        signal,
        onopen(response) {
            if (response.status === 401) {
                const pdpUrl = sessionModeUrl();
                if (pdpUrl) {
                    reloginOnUnauthorized(pdpUrl);
                }
            }
            const contentType = response.headers.get('content-type');
            if (response.ok && contentType?.startsWith(EventStreamContentType)) {
                handlers.onStateChange('open');
                return Promise.resolve();
            }
            return Promise.reject(new RetriableError(`API error ${response.status}`));
        },
        onmessage(message) {
            if (message.event !== 'update' || !message.data) {
                return;
            }
            handlers.onUpdate(JSON.parse(message.data) as NotificationLiveUpdate);
        },
        onclose() {
            throw new RetriableError('La conexion SSE se cerro inesperadamente');
        },
        onerror() {
            handlers.onStateChange('reconnecting');
        },
    });
}
