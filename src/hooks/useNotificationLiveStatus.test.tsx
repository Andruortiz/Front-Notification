import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useNotificationLiveStatus } from './useNotificationLiveStatus';
import { emitLiveUpdate, notificationHistoryItem } from '../test/handlers/notifications';

function renderWithClient(client: QueryClient, id: string) {
    function wrapper({ children }: { children: ReactNode }) {
        return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    }
    return renderHook(() => useNotificationLiveStatus(id), { wrapper });
}

describe('useNotificationLiveStatus', () => {
    it('invalidates the notification query when a matching event arrives', async () => {
        const client = new QueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderWithClient(client, 'notif-1');
        await waitFor(() => expect(result.current).toBe('open'));

        emitLiveUpdate({
            action: 'UPSERT',
            notification: notificationHistoryItem({
                notificationId: 'notif-1',
                status: 'DELIVERED',
            }),
        });

        await waitFor(() => {
            expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['notification', 'notif-1'] });
        });
    });

    it('ignores events for a different notification id', async () => {
        const client = new QueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderWithClient(client, 'notif-1');
        await waitFor(() => expect(result.current).toBe('open'));

        emitLiveUpdate({
            action: 'UPSERT',
            notification: notificationHistoryItem({
                notificationId: 'notif-other',
                status: 'DELIVERED',
            }),
        });

        await new Promise((resolve) => setTimeout(resolve, 50));
        expect(invalidateSpy).not.toHaveBeenCalled();
    });
});
