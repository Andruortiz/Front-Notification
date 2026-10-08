import { describe, expect, it } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    it('no muestra el ID y sí los tiempos de aceptación e intentos', async () => {
        server.use(
            http.get('*/notifications', () =>
                HttpResponse.json({
                    items: [
                        notificationHistoryItem({
                            notificationId: 'notif-1',
                            deliveryAttempts: [
                                {
                                    occurredOn: '2026-09-25T10:01:00Z',
                                    result: 'RECOVERABLE_FAILURE',
                                    origin: 'AUTOMATIC',
                                    providerId: 'brevo',
                                },
                            ],
                        }),
                    ],
                    limit: 200,
                    offset: 0,
                    hasNext: false,
                }),
            ),
        );

        renderDetalle('notif-1');

        expect(await screen.findByText('Aceptada')).toBeInTheDocument();
        expect(screen.getByText(/Fallo recuperable/)).toBeInTheDocument();
        expect(screen.getByText(/brevo/)).toBeInTheDocument();
        expect(screen.queryByText('ID')).not.toBeInTheDocument();
        expect(screen.queryByText('notif-1')).not.toBeInTheDocument();
    });

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

    it('muestra el botón Reintentar solo en FAILED o RECOVERABLE', async () => {
        server.use(
            http.get('*/notifications/:id', ({ params }) =>
                HttpResponse.json(
                    notificationStatusResponse({
                        notificationId: String(params.id),
                        status: 'DELIVERED',
                    }),
                ),
            ),
        );

        renderDetalle('notif-1');

        await screen.findByText('Entregada');
        expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
    });

    it('reintentar con 202 actualiza el estado sin recargar', async () => {
        server.use(
            http.get('*/notifications/:id', ({ params }) =>
                HttpResponse.json(
                    notificationStatusResponse({
                        notificationId: String(params.id),
                        status: 'FAILED',
                    }),
                ),
            ),
            http.post(/\/notifications\/([^/]+):retry$/, () =>
                HttpResponse.json(
                    notificationStatusResponse({ notificationId: 'notif-1', status: 'PENDING' }),
                    { status: 202 },
                ),
            ),
        );

        renderDetalle('notif-1');
        await screen.findByText('Fallida');

        const user = userEvent.setup();
        await user.click(screen.getByRole('button', { name: 'Reintentar' }));

        expect(await screen.findByText('Pendiente')).toBeInTheDocument();
    });

    it('muestra el mensaje del servidor cuando el reintento devuelve 400', async () => {
        server.use(
            http.get('*/notifications/:id', ({ params }) =>
                HttpResponse.json(
                    notificationStatusResponse({
                        notificationId: String(params.id),
                        status: 'RECOVERABLE',
                    }),
                ),
            ),
            http.post(/\/notifications\/([^/]+):retry$/, () =>
                HttpResponse.json(
                    { message: 'el estado actual no admite reintento' },
                    { status: 400 },
                ),
            ),
        );

        renderDetalle('notif-1');
        await screen.findByText('Reintentando');

        const user = userEvent.setup();
        await user.click(screen.getByRole('button', { name: 'Reintentar' }));

        expect(await screen.findByText('el estado actual no admite reintento')).toBeInTheDocument();
    });

    it('muestra un aviso cuando el reintento devuelve 404', async () => {
        server.use(
            http.get('*/notifications/:id', ({ params }) =>
                HttpResponse.json(
                    notificationStatusResponse({
                        notificationId: String(params.id),
                        status: 'FAILED',
                    }),
                ),
            ),
            http.post(/\/notifications\/([^/]+):retry$/, () =>
                HttpResponse.json({ message: 'no existe' }, { status: 404 }),
            ),
        );

        renderDetalle('notif-1');
        await screen.findByText('Fallida');

        const user = userEvent.setup();
        await user.click(screen.getByRole('button', { name: 'Reintentar' }));

        expect(
            await screen.findByText('La notificación ya no existe para este cliente.'),
        ).toBeInTheDocument();
    });
});
