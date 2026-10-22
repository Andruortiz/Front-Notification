import { describe, expect, it } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import Listado from './Listado';
import { notificationHistoryItem } from '../test/handlers/notifications';
import { server } from '../test/server';

function renderListado() {
    return render(
        <QueryClientProvider client={new QueryClient()}>
            <MemoryRouter>
                <Listado />
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

describe('Listado: panel de detalle acoplado', () => {
    it('abre el detalle junto al listado sin cambiar de página y lo cierra', async () => {
        let searchRequests = 0;
        server.use(
            http.get('*/notifications', () => {
                searchRequests += 1;
                return HttpResponse.json({
                    items: [
                        notificationHistoryItem({
                            notificationId: 'notif-1',
                            recipientId: 'ana@uco.edu.co',
                            status: 'PENDING',
                        }),
                    ],
                    limit: 50,
                    offset: 0,
                    hasNext: false,
                });
            }),
        );

        renderListado();
        await userEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }));

        const panel = await screen.findByRole('complementary', {
            name: 'Detalle de la notificación',
        });
        expect(await within(panel).findByText('Línea de tiempo')).toBeInTheDocument();
        expect(within(panel).getByText('ana@uco.edu.co')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Notificaciones' })).toBeInTheDocument();
        expect(searchRequests).toBe(1);

        await userEvent.click(screen.getByRole('button', { name: 'Cerrar detalle' }));

        expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    });
});
