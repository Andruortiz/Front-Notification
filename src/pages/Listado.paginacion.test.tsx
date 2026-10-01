import { describe, expect, it } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import Listado from './Listado';
import { emitLiveUpdate, notificationHistoryItem } from '../test/handlers/notifications';
import { server } from '../test/server';

function renderListado(initialEntry = '/notificaciones') {
    return render(
        <QueryClientProvider
            client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
        >
            <MemoryRouter initialEntries={[initialEntry]}>
                <Listado />
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

interface PageRequest {
    limit: string | null;
    offset: string | null;
}

function serveItems(total: number, requests: PageRequest[] = []) {
    server.use(
        http.get('*/notifications', ({ request }) => {
            const url = new URL(request.url);
            const limit = Number(url.searchParams.get('limit') ?? 50);
            const offset = Number(url.searchParams.get('offset') ?? 0);
            requests.push({
                limit: url.searchParams.get('limit'),
                offset: url.searchParams.get('offset'),
            });
            const count = Math.max(0, Math.min(limit, total - offset));
            const items = Array.from({ length: count }, (_, index) =>
                notificationHistoryItem({
                    notificationId: `n-${offset + index + 1}`,
                    recipientId: `destinatario-${offset + index + 1}`,
                }),
            );
            return HttpResponse.json({ items, limit, offset, hasNext: offset + count < total });
        }),
    );
    return requests;
}

describe('Listado (paginación)', () => {
    it('pide la primera página con el tamaño por defecto y deshabilita Anterior', async () => {
        const requests = serveItems(120);

        renderListado();

        expect(await screen.findByText('destinatario-1')).toBeInTheDocument();
        expect(requests[0]).toEqual({ limit: '50', offset: '0' });
        expect(screen.getByText('Mostrando 1–50')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Siguiente' })).toBeEnabled();
        expect(screen.getByText('Página 1')).toBeInTheDocument();
    });

    it('avanza a la página siguiente pidiendo el offset correspondiente', async () => {
        const requests = serveItems(120);
        renderListado();
        const user = userEvent.setup();
        await screen.findByText('destinatario-1');

        await user.click(screen.getByRole('button', { name: 'Siguiente' }));

        expect(await screen.findByText('destinatario-51')).toBeInTheDocument();
        expect(requests.at(-1)).toEqual({ limit: '50', offset: '50' });
        expect(screen.getByText('Página 2')).toBeInTheDocument();
        expect(screen.getByText('Mostrando 51–100')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Anterior' })).toBeEnabled();
    });

    it('en la última página deshabilita Siguiente', async () => {
        serveItems(60);
        renderListado('/notificaciones?page=2&size=50');

        expect(await screen.findByText('destinatario-51')).toBeInTheDocument();
        expect(screen.getByText('Mostrando 51–60')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
    });

    it('lee página y tamaño desde la URL', async () => {
        const requests = serveItems(200);

        renderListado('/notificaciones?page=3&size=25');

        expect(await screen.findByText('destinatario-51')).toBeInTheDocument();
        expect(requests[0]).toEqual({ limit: '25', offset: '50' });
    });

    it('ignora parámetros inválidos y usa los valores por defecto', async () => {
        const requests = serveItems(10);

        renderListado('/notificaciones?page=abc&size=7');

        expect(await screen.findByText('destinatario-1')).toBeInTheDocument();
        expect(requests[0]).toEqual({ limit: '50', offset: '0' });
    });

    it('al cambiar el tamaño de página vuelve a la primera página', async () => {
        const requests = serveItems(200);
        renderListado('/notificaciones?page=2&size=50');
        const user = userEvent.setup();
        await screen.findByText('destinatario-51');

        await user.selectOptions(screen.getByLabelText('Por página'), '25');

        await waitFor(() => expect(requests.at(-1)).toEqual({ limit: '25', offset: '0' }));
        expect(await screen.findByText('destinatario-1')).toBeInTheDocument();
        expect(screen.getByText('Página 1')).toBeInTheDocument();
    });

    it('muestra un aviso y permite volver cuando la página pedida ya no tiene resultados', async () => {
        const requests = serveItems(10);
        renderListado('/notificaciones?page=9&size=50');
        const user = userEvent.setup();

        expect(await screen.findByText(/Esta página no tiene resultados/)).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Ir a la primera página' }));

        expect(await screen.findByText('destinatario-1')).toBeInTheDocument();
        expect(requests.at(-1)).toEqual({ limit: '50', offset: '0' });
    });

    it('sin notificaciones muestra el estado vacío y no muestra la paginación', async () => {
        serveItems(0);

        renderListado();

        expect(await screen.findByText('Todavía no hay notificaciones.')).toBeInTheDocument();
        expect(screen.queryByRole('navigation', { name: 'Paginación' })).not.toBeInTheDocument();
    });

    it('si la consulta falla muestra el error y no muestra la paginación', async () => {
        server.use(http.get('*/notifications', () => new HttpResponse(null, { status: 500 })));

        renderListado();

        expect(await screen.findByText(/No se pudo consultar el historial/)).toBeInTheDocument();
        expect(screen.queryByRole('navigation', { name: 'Paginación' })).not.toBeInTheDocument();
    });

    it('un evento en vivo no inserta filas nuevas en una página posterior a la primera', async () => {
        serveItems(120);
        renderListado('/notificaciones?page=2&size=50');
        await screen.findByText('destinatario-51');
        await waitFor(() => expect(screen.getByText('En vivo')).toBeInTheDocument());

        emitLiveUpdate({
            action: 'UPSERT',
            notification: notificationHistoryItem({
                notificationId: 'recien-llegada',
                recipientId: 'recien-llegada',
                acceptedAt: '2026-12-01T10:00:00Z',
            }),
        });
        emitLiveUpdate({
            action: 'UPSERT',
            notification: notificationHistoryItem({
                notificationId: 'n-51',
                recipientId: 'destinatario-51',
                status: 'DELIVERED',
            }),
        });

        const table = screen.getByRole('table');
        expect(await within(table).findByText('Entregada')).toBeInTheDocument();
        expect(screen.queryByText('recien-llegada')).not.toBeInTheDocument();
        expect(within(table).getAllByRole('row')).toHaveLength(51);
    });
});
