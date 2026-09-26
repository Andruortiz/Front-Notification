import { describe, expect, it } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import Detalle from './Detalle';
import {
    emitLiveUpdate,
    notificationHistoryItem,
    notificationStatusResponse,
} from '../test/handlers/notifications';
import { server } from '../test/server';

function renderDetalle(id: string) {
    const client = new QueryClient();
    return render(
        <QueryClientProvider client={client}>
            <MemoryRouter initialEntries={[`/notificaciones/${id}`]}>
                <Routes>
                    <Route path="/notificaciones/:id" element={<Detalle />} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

describe('Detalle', () => {
    it('reflects a live status change without reloading the page', async () => {
        let requestCount = 0;
        server.use(
            http.get('*/notifications/:id', ({ params }) => {
                requestCount += 1;
                const status = requestCount === 1 ? 'PENDING' : 'DELIVERED';
                return HttpResponse.json(
                    notificationStatusResponse({ notificationId: String(params.id), status }),
                );
            }),
        );

        renderDetalle('notif-1');

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
        expect(requestCount).toBe(2);
    });
});
