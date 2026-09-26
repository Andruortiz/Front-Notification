import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeToNotificationUpdates, type LiveConnectionState } from '../api/liveUpdates';

export function useNotificationLiveStatus(id: string | undefined): LiveConnectionState {
    const queryClient = useQueryClient();
    const [connectionState, setConnectionState] = useState<LiveConnectionState>('connecting');

    useEffect(() => {
        if (!id) {
            return;
        }

        const controller = new AbortController();

        subscribeToNotificationUpdates(
            {},
            {
                onStateChange: setConnectionState,
                onUpdate: (update) => {
                    if (update.notification.notificationId === id) {
                        void queryClient.invalidateQueries({ queryKey: ['notification', id] });
                    }
                },
            },
            controller.signal,
        );

        return () => {
            controller.abort();
            setConnectionState('closed');
        };
    }, [id, queryClient]);

    return connectionState;
}
