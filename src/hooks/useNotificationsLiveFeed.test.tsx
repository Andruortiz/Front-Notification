import { describe, expect, it } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useNotificationsLiveFeed } from './useNotificationsLiveFeed';
import { emitLiveUpdate, notificationHistoryItem } from '../test/handlers/notifications';
import type { components } from '../api/schema';

type NotificationSearchResponse = components['schemas']['NotificationSearchResponse'];

function renderWithClient(client: QueryClient) {
    function wrapper({ children }: { children: ReactNode }) {
        return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    }
    return renderHook(() => useNotificationsLiveFeed(), { wrapper });
}

describe('useNotificationsLiveFeed', () => {
    it('reaches the open state once the SSE connection is established', async () => {
        const client = new QueryClient();
        const { result } = renderWithClient(client);

        await waitFor(() => expect(result.current).toBe('open'));
    });

    it('upserts a new notification into the cached list', async () => {
        const client = new QueryClient();
        client.setQueryData(['notifications'], {
            items: [],
            limit: 50,
            offset: 0,
            hasNext: false,
        } satisfies NotificationSearchResponse);
        const { result } = renderWithClient(client);
        await waitFor(() => expect(result.current).toBe('open'));

        emitLiveUpdate({
            action: 'UPSERT',
            notification: notificationHistoryItem({ notificationId: 'notif-new' }),
        });

        await waitFor(() => {
            const cache = client.getQueryData<NotificationSearchResponse>(['notifications']);
            expect(cache?.items.map((item) => item.notificationId)).toContain('notif-new');
        });
    });

    it('updates an existing notification in place instead of duplicating it', async () => {
        const client = new QueryClient();
        client.setQueryData(['notifications'], {
            items: [notificationHistoryItem({ notificationId: 'notif-1', status: 'PENDING' })],
            limit: 50,
            offset: 0,
            hasNext: false,
        } satisfies NotificationSearchResponse);
        const { result } = renderWithClient(client);
        await waitFor(() => expect(result.current).toBe('open'));

        emitLiveUpdate({
            action: 'UPSERT',
            notification: notificationHistoryItem({
                notificationId: 'notif-1',
                status: 'DELIVERED',
            }),
        });

        await waitFor(() => {
            const cache = client.getQueryData<NotificationSearchResponse>(['notifications']);
            expect(cache?.items).toHaveLength(1);
            expect(cache?.items[0]?.status).toBe('DELIVERED');
        });
    });

    it('removes a notification when a REMOVE event arrives', async () => {
        const client = new QueryClient();
        client.setQueryData(['notifications'], {
            items: [notificationHistoryItem({ notificationId: 'notif-1' })],
            limit: 50,
            offset: 0,
            hasNext: false,
        } satisfies NotificationSearchResponse);
        const { result } = renderWithClient(client);
        await waitFor(() => expect(result.current).toBe('open'));

        emitLiveUpdate({
            action: 'REMOVE',
            notification: notificationHistoryItem({ notificationId: 'notif-1' }),
        });

        await waitFor(() => {
            const cache = client.getQueryData<NotificationSearchResponse>(['notifications']);
            expect(cache?.items).toHaveLength(0);
        });
    });
});
