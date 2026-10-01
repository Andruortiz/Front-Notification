import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import NuevaNotificacion from './NuevaNotificacion';
import { sendNotificationResponse } from '../test/handlers/notifications';
import { server } from '../test/server';
import type { components } from '../api/schema';

type ChannelCatalogResponse = components['schemas']['ChannelCatalogResponse'];

const catalog: ChannelCatalogResponse = {
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
    ],
};

function renderPage() {
    return render(
        <QueryClientProvider client={new QueryClient()}>
            <MemoryRouter initialEntries={['/notificaciones/nueva']}>
                <Routes>
                    <Route path="/notificaciones/nueva" element={<NuevaNotificacion />} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

type User = ReturnType<typeof userEvent.setup>;

async function fillIndividual(user: User) {
    await user.selectOptions(await screen.findByLabelText('Canal'), 'EMAIL');
    await user.type(screen.getByLabelText('Correo electrónico'), 'alice@example.com');
    await user.type(screen.getByLabelText('Mensaje'), 'Hola Alice');
}

function bigFile(name = 'grande.pdf') {
    return new File([new Uint8Array(1024 * 1024 + 1)], name, { type: 'application/pdf' });
}

function uploadHandlers(id: string, statuses: { status: string; rejectionReason?: string }[]) {
    let polls = 0;
    return [
        http.post('*/attachment-uploads', () =>
            HttpResponse.json({ uploadId: id, uploadUrl: `https://minio.test/bucket/${id}` }),
        ),
        http.post(new RegExp(`/attachment-uploads/${id}:complete$`), () =>
            HttpResponse.json({ uploadId: id, status: 'PENDING_SCAN' }),
        ),
        http.get(`*/attachment-uploads/${id}`, () => {
            const next = statuses[Math.min(polls, statuses.length - 1)];
            polls += 1;
            return HttpResponse.json({ uploadId: id, ...next });
        }),
    ];
}

describe('NuevaNotificacion (adjunto)', () => {
    beforeEach(() => {
        server.use(http.get('*/channels', () => HttpResponse.json(catalog)));
        // jsdom y el fetch de Node no comparten File: el PUT al storage se atiende aqui.
        const realFetch = globalThis.fetch;
        vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) =>
            init?.method === 'PUT' && new Request(input).url.startsWith('https://minio.test/')
                ? Promise.resolve(new Response(null, { status: 200 }))
                : realFetch(input, init),
        );
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('hasta 1 MB embebe el archivo en Base64 dentro del JSON', async () => {
        let sentBody: { attachment?: { fileName: string; contentBase64: string } } = {};
        server.use(
            http.post('*/notifications', async ({ request }) => {
                sentBody = (await request.json()) as typeof sentBody;
                return HttpResponse.json(sendNotificationResponse({ notificationId: 'n-1' }), {
                    status: 202,
                });
            }),
        );

        renderPage();
        const user = userEvent.setup();
        await fillIndividual(user);
        await user.upload(
            screen.getByLabelText(/Archivo adjunto/),
            new File(['%PDF'], 'comprobante.pdf', { type: 'application/pdf' }),
        );
        await user.click(screen.getByRole('button', { name: 'Enviar' }));

        expect(await screen.findByText('Notificación aceptada')).toBeInTheDocument();
        expect(sentBody.attachment?.fileName).toBe('comprobante.pdf');
        expect(sentBody.attachment?.contentBase64).toBe(btoa('%PDF'));
    });

    it('más de 1 MB lo sube al storage, espera el escaneo y referencia el uploadId', async () => {
        const calls: string[] = [];
        let sentBody: { attachmentUploadId?: string; attachment?: unknown } = {};
        server.use(
            ...uploadHandlers('up-1', [{ status: 'PENDING_SCAN' }, { status: 'CLEAN' }]),
            http.post('*/notifications', async ({ request }) => {
                calls.push('notify');
                sentBody = (await request.json()) as typeof sentBody;
                return HttpResponse.json(sendNotificationResponse({ notificationId: 'n-2' }), {
                    status: 202,
                });
            }),
        );

        renderPage();
        const user = userEvent.setup();
        await fillIndividual(user);
        await user.upload(screen.getByLabelText(/Archivo adjunto/), bigFile());
        await user.click(screen.getByRole('button', { name: 'Enviar' }));

        expect(
            await screen.findByText('Notificación aceptada', {}, { timeout: 5000 }),
        ).toBeInTheDocument();
        expect(sentBody.attachmentUploadId).toBe('up-1');
        expect(sentBody.attachment).toBeUndefined();
    });

    it('si el escaneo rechaza el archivo, muestra el motivo y no envía la notificación', async () => {
        let notified = false;
        server.use(
            ...uploadHandlers('up-2', [
                { status: 'REJECTED', rejectionReason: 'Archivo infectado' },
            ]),
            http.post('*/notifications', () => {
                notified = true;
                return HttpResponse.json(sendNotificationResponse(), { status: 202 });
            }),
        );

        renderPage();
        const user = userEvent.setup();
        await fillIndividual(user);
        await user.upload(screen.getByLabelText(/Archivo adjunto/), bigFile());
        await user.click(screen.getByRole('button', { name: 'Enviar' }));

        expect(await screen.findByText('Archivo infectado')).toBeInTheDocument();
        expect(notified).toBe(false);
    });

    it('rechaza un tipo no permitido sin enviar', async () => {
        let called = false;
        server.use(
            http.post('*/notifications', () => {
                called = true;
                return HttpResponse.json(sendNotificationResponse(), { status: 202 });
            }),
        );

        renderPage();
        const user = userEvent.setup({ applyAccept: false });
        await fillIndividual(user);
        await user.upload(
            screen.getByLabelText(/Archivo adjunto/),
            new File(['x'], 'virus.exe', { type: 'application/octet-stream' }),
        );
        await user.click(screen.getByRole('button', { name: 'Enviar' }));

        expect(await screen.findByText(/Tipo de archivo no permitido/)).toBeInTheDocument();
        expect(called).toBe(false);
    });

    it('con varios destinatarios envía una notificación por destinatario con el mismo adjunto', async () => {
        const recipients: string[] = [];
        server.use(
            http.post('*/notifications', async ({ request }) => {
                const body = (await request.json()) as {
                    recipientAddress: string;
                    attachment?: { fileName: string };
                };
                expect(body.attachment?.fileName).toBe('doc.pdf');
                recipients.push(body.recipientAddress);
                return HttpResponse.json(sendNotificationResponse({ notificationId: 'n' }), {
                    status: 202,
                });
            }),
        );

        renderPage();
        const user = userEvent.setup();
        await user.selectOptions(await screen.findByLabelText('Canal'), 'EMAIL');
        await user.type(
            screen.getByLabelText('Correo electrónico'),
            'alice@example.com, bob@example.com',
        );
        await user.type(screen.getByLabelText('Mensaje'), 'Hola');
        await user.upload(
            screen.getByLabelText(/Archivo adjunto/),
            new File(['%PDF'], 'doc.pdf', { type: 'application/pdf' }),
        );
        await user.click(screen.getByRole('button', { name: 'Enviar' }));
        await screen.findByRole('dialog');
        await user.click(screen.getByRole('button', { name: 'Confirmar envío' }));

        expect(await screen.findAllByText('Aceptada')).toHaveLength(2);
        expect(recipients).toEqual(['alice@example.com', 'bob@example.com']);
    });
});
