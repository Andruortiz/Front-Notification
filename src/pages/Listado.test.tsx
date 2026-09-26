import { describe, expect, it } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Listado from './Listado';
import { emitLiveUpdate, notificationHistoryItem } from '../test/handlers/notifications';
import { server } from '../test/server';
import { http, HttpResponse } from 'msw';

function renderListado() {
    const client = new QueryClient();
    return render(
        <QueryClientProvider client={client}>
            <MemoryRouter>
                <Listado />
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

describe('Listado', () => {
    it('renders the initial history and then reflects a live status change in place', async () => {
        let searchRequests = 0;
        server.use(
            http.get('*/notifications', () => {
                searchRequests += 1;
                return HttpResponse.json({
                    items: [
                        notificationHistoryItem({ notificationId: 'notif-1', status: 'PENDING' }),
                    ],
                    limit: 50,
                    offset: 0,
                    hasNext: false,
                });
            }),
        );

        renderListado();

        expect(await screen.findByText('order-1')).toBeInTheDocument();
        expect(screen.getByText('Pendiente')).toBeInTheDocument();
        await waitFor(() => expect(screen.getByText('En vivo')).toBeInTheDocument());

        emitLiveUpdate({
            action: 'UPSERT',
            notification: notificationHistoryItem({
                notificationId: 'notif-1',
                status: 'DELIVERED',
            }),
        });

        expect(await screen.findByText('Entregada')).toBeInTheDocument();
        expect(screen.getAllByText('order-1')).toHaveLength(1);
        expect(searchRequests).toBe(1);
    });

    it('does not let a window-focus refetch overwrite the live-updated list', async () => {
        let searchRequests = 0;
        server.use(
            http.get('*/notifications', () => {
                searchRequests += 1;
                return HttpResponse.json({
                    items: [
                        notificationHistoryItem({ notificationId: 'notif-1', status: 'PENDING' }),
                    ],
                    limit: 50,
                    offset: 0,
                    hasNext: false,
                });
            }),
        );

        renderListado();

        expect(await screen.findByText('Pendiente')).toBeInTheDocument();
        await waitFor(() => expect(screen.getByText('En vivo')).toBeInTheDocument());

        emitLiveUpdate({
            action: 'UPSERT',
            notification: notificationHistoryItem({
                notificationId: 'notif-1',
                status: 'DELIVERED',
            }),
        });
        expect(await screen.findByText('Entregada')).toBeInTheDocument();

        window.dispatchEvent(new Event('visibilitychange'));
        window.dispatchEvent(new Event('focus'));

        await new Promise((resolve) => setTimeout(resolve, 50));
        expect(screen.getByText('Entregada')).toBeInTheDocument();
        expect(searchRequests).toBe(1);
    });
});
