import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
    subscribeToNotificationUpdates,
    type LiveConnectionState,
    type NotificationUpdatesFilters,
} from '../api/liveUpdates';
import type { components } from '../api/schema';

type NotificationSearchResponse = components['schemas']['NotificationSearchResponse'];

export const NOTIFICATIONS_KEY = ['notifications'] as const;

type NotificationLiveUpdate = components['schemas']['NotificationLiveUpdate'];

function offsetOf(queryKey: readonly unknown[]): number {
    const params = queryKey[1] as { offset?: number } | undefined;
    return params?.offset ?? 0;
}

function emptyResponse(
    previous: NotificationSearchResponse | undefined,
): NotificationSearchResponse | undefined {
    return previous && { ...previous, items: [] };
}

function acceptedTime(item: NotificationSearchResponse['items'][number]): number {
    return item.acceptedAt ? Date.parse(item.acceptedAt) : 0;
}

export function applyLiveUpdate(
    previous: NotificationSearchResponse | undefined,
    update: NotificationLiveUpdate,
): NotificationSearchResponse | undefined {
    if (!previous) {
        return previous;
    }
    const incoming = update.notification;
    const index = previous.items.findIndex(
        (item) => item.notificationId === incoming.notificationId,
    );
    if (update.action === 'REMOVE') {
        return index === -1 ? previous : { ...previous, items: previous.items.toSpliced(index, 1) };
    }
    if (index !== -1) {
        return { ...previous, items: previous.items.toSpliced(index, 1, incoming) };
    }
    if (previous.offset > 0) {
        return previous;
    }
    const position = previous.items.findIndex(
        (item) => acceptedTime(item) < acceptedTime(incoming),
    );
    const merged = previous.items.toSpliced(
        position === -1 ? previous.items.length : position,
        0,
        incoming,
    );
    const overflow = merged.length > previous.limit;
    return {
        ...previous,
        items: overflow ? merged.slice(0, previous.limit) : merged,
        hasNext: previous.hasNext || overflow,
    };
}

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
                        queryClient.setQueriesData<NotificationSearchResponse>(
                            {
                                queryKey: NOTIFICATIONS_KEY,
                                predicate: (query) => offsetOf(query.queryKey) === 0,
                            },
                            emptyResponse,
                        );
                        void queryClient.invalidateQueries({
                            queryKey: NOTIFICATIONS_KEY,
                            predicate: (query) => offsetOf(query.queryKey) > 0,
                        });
                        hasReconnected = false;
                    }
                    setConnectionState(state);
                },
                onUpdate: (update) => {
                    queryClient.setQueriesData<NotificationSearchResponse>(
                        { queryKey: NOTIFICATIONS_KEY },
                        (previous) => applyLiveUpdate(previous, update),
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
