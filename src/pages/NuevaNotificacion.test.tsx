import { beforeEach, describe, expect, it } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import NuevaNotificacion from './NuevaNotificacion';
import {
    sendNotificationResponse,
    batchAcceptedResponse,
    batchItemResult,
} from '../test/handlers/notifications';
import { server } from '../test/server';
import type { components } from '../api/schema';

async function typeSubject(user: ReturnType<typeof userEvent.setup>) {
    const subject = screen.queryByLabelText(/^Asunto/);
    if (subject) {
        await user.type(subject, 'Asunto de prueba');
    }
}

type ChannelCatalogResponse = components['schemas']['ChannelCatalogResponse'];

function channelCatalog(): ChannelCatalogResponse {
    return {
        items: [
            {
                channelType: 'EMAIL',
                contentSchema: null,
                providers: [
                    {
                        providerId: 'simulated',
                        preferenceOrder: 1,
                        status: 'ENABLED',
                        statusReason: null,
                    },
                ],
            },
            {
                channelType: 'SMS',
                contentSchema: null,
                providers: [
                    {
                        providerId: 'simulated',
                        preferenceOrder: 1,
                        status: 'ENABLED',
                        statusReason: null,
                    },
                ],
            },
        ],
    };
}

function renderPage() {
    const client = new QueryClient();
    return render(
        <QueryClientProvider client={client}>
            <MemoryRouter initialEntries={['/notificaciones/nueva']}>
                <Routes>
                    <Route path="/notificaciones/nueva" element={<NuevaNotificacion />} />
                    <Route path="/notificaciones/:id" element={<div>detalle</div>} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

describe('NuevaNotificacion (individual)', () => {
    beforeEach(() => {
        server.use(http.get('*/channels', () => HttpResponse.json(channelCatalog())));
    });

    it('muestra id y estado cuando el envío es aceptado', async () => {
        server.use(
            http.post('*/notifications', () =>
                HttpResponse.json(
                    sendNotificationResponse({
                        notificationId: 'notif-99',
                        status: 'PENDING',
                        duplicate: false,
                    }),
                    { status: 202 },
                ),
            ),
        );

        renderPage();
        const user = userEvent.setup();

        await user.selectOptions(await screen.findByLabelText('Canal'), 'EMAIL');
        await user.type(screen.getByLabelText('Correo electrónico'), 'alice@example.com');
        await typeSubject(user);
        await user.type(screen.getByLabelText('Mensaje'), 'Hola Alice');
        await user.click(screen.getByRole('button', { name: 'Enviar' }));

        expect(await screen.findByText('Notificación aceptada')).toBeInTheDocument();
        expect(screen.getByText('notif-99')).toBeInTheDocument();
    });

    it('muestra "Ya existía" cuando el servidor marca duplicate y no como error', async () => {
        server.use(
            http.post('*/notifications', () =>
                HttpResponse.json(
                    sendNotificationResponse({ notificationId: 'notif-1', duplicate: true }),
                    { status: 202 },
                ),
            ),
        );

        renderPage();
        const user = userEvent.setup();
        await user.selectOptions(await screen.findByLabelText('Canal'), 'EMAIL');
        await user.type(screen.getByLabelText('Correo electrónico'), 'alice@example.com');
        await typeSubject(user);
        await user.type(screen.getByLabelText('Mensaje'), 'Hola Alice');
        await user.click(screen.getByRole('button', { name: 'Enviar' }));

        expect(await screen.findByText('Ya existía')).toBeInTheDocument();
    });

    it('muestra el mensaje del servidor en un rechazo 400 y conserva lo escrito', async () => {
        server.use(
            http.post('*/notifications', () =>
                HttpResponse.json({ message: 'canal deshabilitado' }, { status: 400 }),
            ),
        );

        renderPage();
        const user = userEvent.setup();
        await user.selectOptions(await screen.findByLabelText('Canal'), 'EMAIL');
        await user.type(screen.getByLabelText('Correo electrónico'), 'alice@example.com');
        await typeSubject(user);
        await user.type(screen.getByLabelText('Mensaje'), 'Hola Alice');
        await user.click(screen.getByRole('button', { name: 'Enviar' }));

        expect(await screen.findByText('canal deshabilitado')).toBeInTheDocument();
        expect(screen.getByLabelText('Correo electrónico')).toHaveValue('alice@example.com');
        expect(screen.getByLabelText('Mensaje')).toHaveValue('Hola Alice');
    });

    it('ajusta los campos visibles y el límite de caracteres al cambiar de canal', async () => {
        renderPage();
        const user = userEvent.setup();
        await user.selectOptions(await screen.findByLabelText('Canal'), 'EMAIL');
        expect(screen.getByLabelText('Asunto')).toBeInTheDocument();

        await user.selectOptions(screen.getByLabelText('Canal'), 'SMS');
        expect(screen.queryByLabelText('Asunto')).not.toBeInTheDocument();
        expect(screen.getByText('0 / 160')).toBeInTheDocument();
    });

    it('un segundo clic en Enviar mientras la mutación está en curso no dispara una segunda solicitud', async () => {
        let requestCount = 0;
        server.use(
            http.post('*/notifications', async () => {
                requestCount += 1;
                await new Promise((resolve) => setTimeout(resolve, 50));
                return HttpResponse.json(sendNotificationResponse({ notificationId: 'notif-1' }), {
                    status: 202,
                });
            }),
        );

        renderPage();
        const user = userEvent.setup();
        await user.selectOptions(await screen.findByLabelText('Canal'), 'EMAIL');
        await user.type(screen.getByLabelText('Correo electrónico'), 'alice@example.com');
        await typeSubject(user);
        await user.type(screen.getByLabelText('Mensaje'), 'Hola Alice');

        const submitButton = screen.getByRole('button', { name: 'Enviar' });
        await user.click(submitButton);
        await user.click(submitButton);

        await screen.findByText('Notificación aceptada');
        expect(requestCount).toBe(1);
    });

    it('reenviar el mismo formulario sin cambios reutiliza el externalId y muestra "Ya existía" tras un fallo de red', async () => {
        let attempt = 0;
        let firstExternalId: string | undefined;
        server.use(
            http.post('*/notifications', async ({ request }) => {
                attempt += 1;
                const body = (await request.json()) as { externalId: string };
                if (attempt === 1) {
                    firstExternalId = body.externalId;
                    return HttpResponse.error();
                }
                expect(body.externalId).toBe(firstExternalId);
                return HttpResponse.json(
                    sendNotificationResponse({ notificationId: 'notif-1', duplicate: true }),
                    { status: 202 },
                );
            }),
        );

        renderPage();
        const user = userEvent.setup();
        await user.selectOptions(await screen.findByLabelText('Canal'), 'EMAIL');
        await user.type(screen.getByLabelText('Correo electrónico'), 'alice@example.com');
        await typeSubject(user);
        await user.type(screen.getByLabelText('Mensaje'), 'Hola Alice');

        const submitButton = screen.getByRole('button', { name: 'Enviar' });
        await user.click(submitButton);
        await screen.findByRole('alert');

        await user.click(submitButton);

        expect(await screen.findByText('Ya existía')).toBeInTheDocument();
        expect(attempt).toBe(2);
    });

    it('"Enviar otra" genera un externalId nuevo aunque se reenvíe el mismo contenido', async () => {
        const seenExternalIds: string[] = [];
        server.use(
            http.post('*/notifications', async ({ request }) => {
                const body = (await request.json()) as { externalId: string };
                seenExternalIds.push(body.externalId);
                return HttpResponse.json(sendNotificationResponse({ notificationId: 'notif-1' }), {
                    status: 202,
                });
            }),
        );

        renderPage();
        const user = userEvent.setup();
        await user.selectOptions(await screen.findByLabelText('Canal'), 'EMAIL');
        await user.type(screen.getByLabelText('Correo electrónico'), 'alice@example.com');
        await typeSubject(user);
        await user.type(screen.getByLabelText('Mensaje'), 'Hola Alice');
        await user.click(screen.getByRole('button', { name: 'Enviar' }));
        await screen.findByText('Notificación aceptada');

        await user.click(screen.getByRole('button', { name: 'Enviar otra' }));
        await user.selectOptions(await screen.findByLabelText('Canal'), 'EMAIL');
        await user.type(screen.getByLabelText('Correo electrónico'), 'alice@example.com');
        await typeSubject(user);
        await user.type(screen.getByLabelText('Mensaje'), 'Hola Alice');
        await user.click(screen.getByRole('button', { name: 'Enviar' }));
        await screen.findByText('Notificación aceptada');

        expect(seenExternalIds).toHaveLength(2);
        expect(seenExternalIds[0]).not.toBe(seenExternalIds[1]);
    });

    it('anuncia los errores de validación y enfoca el primer campo inválido', async () => {
        renderPage();
        const user = userEvent.setup();
        await user.selectOptions(await screen.findByLabelText('Canal'), 'EMAIL');
        await user.click(screen.getByRole('button', { name: 'Enviar' }));

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Corregí los campos señalados antes de enviar.',
        );
        expect(screen.getByLabelText('Correo electrónico')).toHaveFocus();
    });
});

describe('NuevaNotificacion (varios destinatarios en el mismo campo)', () => {
    beforeEach(() => {
        server.use(http.get('*/channels', () => HttpResponse.json(channelCatalog())));
    });

    async function fillChannelAndMessage(user: ReturnType<typeof userEvent.setup>) {
        await user.selectOptions(await screen.findByLabelText('Canal'), 'EMAIL');
        await typeSubject(user);
        await user.type(screen.getByLabelText('Mensaje'), 'Hola a todos');
    }

    it('la dirección repetida se señala y la inválida bloquea el envío hasta corregirla', async () => {
        renderPage();
        const user = userEvent.setup();
        await fillChannelAndMessage(user);

        await user.type(
            screen.getByLabelText('Correo electrónico'),
            'alice@example.com\nalice@example.com\nno-es-correo',
        );

        expect(screen.getByText('Repetida')).toBeInTheDocument();
        expect(screen.getByText(/Falta el símbolo @/)).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Enviar' }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('al confirmar muestra canal, mensaje y cantidad, y el envío produce resultado por destinatario con filtro', async () => {
        server.use(
            http.post('*/notifications:sendBatch', async ({ request }) => {
                const body = (await request.json()) as {
                    items: { externalId: string }[];
                };
                return HttpResponse.json(
                    batchAcceptedResponse({
                        results: body.items.map((item, index) =>
                            batchItemResult({
                                externalId: item.externalId,
                                outcome: index === 1 ? 'REJECTED' : 'ACCEPTED',
                                notificationId: index === 1 ? null : `notif-${index}`,
                                rejectionReason: index === 1 ? 'dirección no admitida' : null,
                            }),
                        ),
                    }),
                    { status: 202 },
                );
            }),
        );

        renderPage();
        const user = userEvent.setup();
        await fillChannelAndMessage(user);
        await user.type(
            screen.getByLabelText('Correo electrónico'),
            'alice@example.com\nbob@example.com\ncarol@example.com',
        );

        await user.click(screen.getByRole('button', { name: 'Enviar' }));

        const dialog = await screen.findByRole('dialog');
        expect(dialog).toHaveTextContent('EMAIL');
        expect(dialog).toHaveTextContent('3');
        expect(dialog).toHaveTextContent('Hola a todos');

        await user.click(screen.getByRole('button', { name: 'Confirmar envío' }));

        expect(await screen.findByText('Rechazada')).toBeInTheDocument();
        expect(screen.getAllByText('Aceptada')).toHaveLength(2);

        await user.click(screen.getByRole('button', { name: 'Rechazadas' }));
        expect(screen.getByText('bob@example.com')).toBeInTheDocument();
        expect(screen.queryByText('alice@example.com')).not.toBeInTheDocument();
    });

    it('reenvía solo los rechazados sin repetir los aceptados', async () => {
        let sendBatchCallCount = 0;
        server.use(
            http.post('*/notifications:sendBatch', async ({ request }) => {
                sendBatchCallCount += 1;
                const body = (await request.json()) as { items: { externalId: string }[] };
                if (sendBatchCallCount === 1) {
                    return HttpResponse.json(
                        batchAcceptedResponse({
                            results: body.items.map((item, index) =>
                                batchItemResult({
                                    externalId: item.externalId,
                                    outcome: index === 1 ? 'REJECTED' : 'ACCEPTED',
                                    notificationId: index === 1 ? null : `notif-${index}`,
                                    rejectionReason: index === 1 ? 'dirección no admitida' : null,
                                }),
                            ),
                        }),
                        { status: 202 },
                    );
                }
                expect(body.items).toHaveLength(1);
                return HttpResponse.json(
                    batchAcceptedResponse({
                        results: [
                            batchItemResult({
                                externalId: body.items[0].externalId,
                                outcome: 'ACCEPTED',
                                notificationId: 'notif-retry',
                            }),
                        ],
                    }),
                    { status: 202 },
                );
            }),
        );

        renderPage();
        const user = userEvent.setup();
        await fillChannelAndMessage(user);
        await user.type(
            screen.getByLabelText('Correo electrónico'),
            'alice@example.com\nbob@example.com\ncarol@example.com',
        );
        await user.click(screen.getByRole('button', { name: 'Enviar' }));
        await screen.findByRole('dialog');
        await user.click(screen.getByRole('button', { name: 'Confirmar envío' }));

        await screen.findByText('Rechazada');
        await user.click(screen.getByRole('button', { name: 'Reenviar rechazados' }));

        await waitFor(() => expect(screen.queryByText('Rechazada')).not.toBeInTheDocument());
        expect(screen.getAllByText('Aceptada')).toHaveLength(3);
        expect(sendBatchCallCount).toBe(2);
    });

    it('trocea lotes de más de 200 en varias solicitudes y agrega los totales', async () => {
        let callCount = 0;
        server.use(
            http.post('*/notifications:sendBatch', async ({ request }) => {
                callCount += 1;
                const body = (await request.json()) as { items: { externalId: string }[] };
                return HttpResponse.json(
                    batchAcceptedResponse({
                        results: body.items.map((item) =>
                            batchItemResult({
                                externalId: item.externalId,
                                outcome: 'ACCEPTED',
                                notificationId: 'notif-x',
                            }),
                        ),
                    }),
                    { status: 202 },
                );
            }),
        );

        renderPage();
        const user = userEvent.setup();
        await fillChannelAndMessage(user);

        const addresses = Array.from({ length: 250 }, (_, i) => `user${i}@example.com`).join('\n');
        fireEvent.change(screen.getByLabelText('Correo electrónico'), {
            target: { value: addresses },
        });

        await user.click(screen.getByRole('button', { name: 'Enviar' }));
        await screen.findByRole('dialog');
        await user.click(screen.getByRole('button', { name: 'Confirmar envío' }));

        await waitFor(() => expect(callCount).toBe(2));
        expect(await screen.findAllByText('Aceptada')).toHaveLength(250);
    });

    it('marca como "sin confirmar" los elementos de una solicitud que falla por red y permite reenviarlos', async () => {
        let attempt = 0;
        server.use(
            http.post('*/notifications:sendBatch', async ({ request }) => {
                attempt += 1;
                if (attempt === 1) {
                    return HttpResponse.error();
                }
                const body = (await request.json()) as { items: { externalId: string }[] };
                return HttpResponse.json(
                    batchAcceptedResponse({
                        results: body.items.map((item) =>
                            batchItemResult({
                                externalId: item.externalId,
                                outcome: 'ACCEPTED',
                                notificationId: 'notif-ok',
                            }),
                        ),
                    }),
                    { status: 202 },
                );
            }),
        );

        renderPage();
        const user = userEvent.setup();
        await fillChannelAndMessage(user);
        await user.type(
            screen.getByLabelText('Correo electrónico'),
            'alice@example.com\nbob@example.com',
        );
        await user.click(screen.getByRole('button', { name: 'Enviar' }));
        await screen.findByRole('dialog');
        await user.click(screen.getByRole('button', { name: 'Confirmar envío' }));

        expect(await screen.findAllByRole('cell', { name: 'Sin confirmar' })).toHaveLength(2);

        await user.click(screen.getByRole('button', { name: 'Reenviar rechazados' }));
        await waitFor(() =>
            expect(screen.queryAllByRole('cell', { name: 'Sin confirmar' })).toHaveLength(0),
        );
        expect(screen.getAllByText('Aceptada')).toHaveLength(2);
    });

    it('bloquea con el conteo y el máximo al superar 1000 destinatarios, sin enviar nada', async () => {
        let sendBatchCalled = false;
        server.use(
            http.post('*/notifications:sendBatch', () => {
                sendBatchCalled = true;
                return HttpResponse.json(batchAcceptedResponse(), { status: 202 });
            }),
        );

        renderPage();
        const user = userEvent.setup();
        await fillChannelAndMessage(user);

        const addresses = Array.from({ length: 1001 }, (_, i) => `user${i}@example.com`).join('\n');
        fireEvent.change(screen.getByLabelText('Correo electrónico'), {
            target: { value: addresses },
        });

        expect(screen.getByText(/el máximo es 1000/)).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Enviar' }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(sendBatchCalled).toBe(false);
    });
});
