import { describe, expect, it } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { applyLiveUpdate, useNotificationsLiveFeed } from './useNotificationsLiveFeed';
import {
    closeLiveConnection,
    emitLiveUpdate,
    notificationHistoryItem,
} from '../test/handlers/notifications';
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

    it('keeps the position of an updated notification instead of moving it to the front', async () => {
        const client = new QueryClient();
        client.setQueryData(['notifications'], {
            items: [
                notificationHistoryItem({ notificationId: 'notif-newest', status: 'PENDING' }),
                notificationHistoryItem({ notificationId: 'notif-1', status: 'PENDING' }),
                notificationHistoryItem({ notificationId: 'notif-oldest', status: 'PENDING' }),
            ],
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
            expect(cache?.items.map((item) => item.notificationId)).toEqual([
                'notif-newest',
                'notif-1',
                'notif-oldest',
            ]);
            expect(cache?.items[1]?.status).toBe('DELIVERED');
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

    it('discards stale rows not present in the snapshot replayed after a reconnect', async () => {
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
            notification: notificationHistoryItem({ notificationId: 'notif-stale' }),
        });
        await waitFor(() => {
            const cache = client.getQueryData<NotificationSearchResponse>(['notifications']);
            expect(cache?.items.map((item) => item.notificationId)).toContain('notif-stale');
        });

        closeLiveConnection();
        await waitFor(() => expect(result.current).toBe('reconnecting'));
        await waitFor(() => expect(result.current).toBe('open'), { timeout: 3000 });

        emitLiveUpdate({
            action: 'UPSERT',
            notification: notificationHistoryItem({ notificationId: 'notif-fresh' }),
        });

        await waitFor(() => {
            const cache = client.getQueryData<NotificationSearchResponse>(['notifications']);
            const ids = cache?.items.map((item) => item.notificationId);
            expect(ids).toContain('notif-fresh');
            expect(ids).not.toContain('notif-stale');
        });
    });
});

function page(
    items: NotificationSearchResponse['items'],
    overrides: Partial<NotificationSearchResponse> = {},
): NotificationSearchResponse {
    return { items, limit: 3, offset: 0, hasNext: false, ...overrides };
}

const at = (hour: number) => `2026-09-25T${String(hour).padStart(2, '0')}:00:00Z`;

describe('applyLiveUpdate', () => {
    it('inserts a new notification in acceptedAt order on the first page', () => {
        const previous = page([
            notificationHistoryItem({ notificationId: 'a', acceptedAt: at(12) }),
            notificationHistoryItem({ notificationId: 'c', acceptedAt: at(10) }),
        ]);

        const next = applyLiveUpdate(previous, {
            action: 'UPSERT',
            notification: notificationHistoryItem({ notificationId: 'b', acceptedAt: at(11) }),
        });

        expect(next?.items.map((item) => item.notificationId)).toEqual(['a', 'b', 'c']);
        expect(next?.hasNext).toBe(false);
    });

    it('keeps the page within its limit and reports there is a next page', () => {
        const previous = page([
            notificationHistoryItem({ notificationId: 'a', acceptedAt: at(12) }),
            notificationHistoryItem({ notificationId: 'b', acceptedAt: at(11) }),
            notificationHistoryItem({ notificationId: 'c', acceptedAt: at(10) }),
        ]);

        const next = applyLiveUpdate(previous, {
            action: 'UPSERT',
            notification: notificationHistoryItem({ notificationId: 'new', acceptedAt: at(13) }),
        });

        expect(next?.items.map((item) => item.notificationId)).toEqual(['new', 'a', 'b']);
        expect(next?.hasNext).toBe(true);
    });

    it('does not let an older notification from the replayed snapshot displace the page', () => {
        const previous = page(
            [
                notificationHistoryItem({ notificationId: 'a', acceptedAt: at(12) }),
                notificationHistoryItem({ notificationId: 'b', acceptedAt: at(11) }),
                notificationHistoryItem({ notificationId: 'c', acceptedAt: at(10) }),
            ],
            { hasNext: true },
        );

        const next = applyLiveUpdate(previous, {
            action: 'UPSERT',
            notification: notificationHistoryItem({ notificationId: 'old', acceptedAt: at(1) }),
        });

        expect(next?.items.map((item) => item.notificationId)).toEqual(['a', 'b', 'c']);
    });

    it('does not insert unknown notifications into pages after the first', () => {
        const previous = page(
            [notificationHistoryItem({ notificationId: 'x', acceptedAt: at(5) })],
            { offset: 3, hasNext: true },
        );

        const next = applyLiveUpdate(previous, {
            action: 'UPSERT',
            notification: notificationHistoryItem({ notificationId: 'new', acceptedAt: at(13) }),
        });

        expect(next).toBe(previous);
    });

    it('still updates in place a notification that belongs to a later page', () => {
        const previous = page(
            [notificationHistoryItem({ notificationId: 'x', status: 'PENDING' })],
            { offset: 3 },
        );

        const next = applyLiveUpdate(previous, {
            action: 'UPSERT',
            notification: notificationHistoryItem({ notificationId: 'x', status: 'DELIVERED' }),
        });

        expect(next?.items[0]?.status).toBe('DELIVERED');
    });

    it('ignores updates when the page has not been loaded yet', () => {
        expect(
            applyLiveUpdate(undefined, {
                action: 'UPSERT',
                notification: notificationHistoryItem(),
            }),
        ).toBeUndefined();
    });
});
