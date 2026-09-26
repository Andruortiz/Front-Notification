import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
    subscribeToNotificationUpdates,
    type LiveConnectionState,
    type NotificationUpdatesFilters,
} from '../api/liveUpdates';
import type { components } from '../api/schema';

type NotificationSearchResponse = components['schemas']['NotificationSearchResponse'];

const emptyResponse = (previous?: NotificationSearchResponse): NotificationSearchResponse => ({
    items: [],
    limit: previous?.limit ?? 50,
    offset: previous?.offset ?? 0,
    hasNext: previous?.hasNext ?? false,
});

export function useNotificationsLiveFeed(
    filters: NotificationUpdatesFilters = {},
): LiveConnectionState {
    const queryClient = useQueryClient();
    const [connectionState, setConnectionState] = useState<LiveConnectionState>('connecting');

    useEffect(() => {
        const controller = new AbortController();
        let hasReconnected = false;

        subscribeToNotificationUpdates(
            filters,
            {
                onStateChange: (state) => {
                    if (state === 'reconnecting') {
                        hasReconnected = true;
                    }
                    if (state === 'open' && hasReconnected) {
                        queryClient.setQueryData<NotificationSearchResponse>(
                            ['notifications'],
                            emptyResponse,
                        );
                        hasReconnected = false;
                    }
                    setConnectionState(state);
                },
                onUpdate: (update) => {
                    queryClient.setQueryData<NotificationSearchResponse>(
                        ['notifications'],
                        (previous) => {
                            const base = previous ?? emptyResponse();
                            const withoutItem = base.items.filter(
                                (item) =>
                                    item.notificationId !== update.notification.notificationId,
                            );
                            if (update.action === 'REMOVE') {
                                return { ...base, items: withoutItem };
                            }
                            return { ...base, items: [update.notification, ...withoutItem] };
                        },
                    );
                },
            },
            controller.signal,
        );

        return () => {
            controller.abort();
            setConnectionState('closed');
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        queryClient,
        filters.recipientId,
        filters.channelType,
        filters.status,
        filters.from,
        filters.to,
    ]);

    return connectionState;
}
