import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import NuevaNotificacion from './NuevaNotificacion';
import { sendNotificationResponse } from '../test/handlers/notifications';
import { server } from '../test/server';
import type { components } from '../api/schema';

async function typeSubject(user: ReturnType<typeof userEvent.setup>) {
    const subject = screen.queryByLabelText(/^Asunto/);
    if (subject) {
        await user.type(subject, 'Asunto de prueba');
    }
}

type ChannelCatalogResponse = components['schemas']['ChannelCatalogResponse'];

const EMAIL_SCHEMA = JSON.stringify({
    type: 'object',
    properties: {
        body: { type: 'string' },
        attachments: {
            type: 'array',
            maxItems: 3,
            items: {
                properties: {
                    contentType: { enum: ['application/pdf', 'image/png', 'text/csv'] },
                    sizeBytes: { maximum: 10485760 },
                },
            },
        },
    },
});

const enabledProvider = {
    providerId: 'simulated',
    preferenceOrder: 1,
    status: 'ENABLED' as const,
    statusReason: null,
};

const catalog: ChannelCatalogResponse = {
    items: [
        { channelType: 'EMAIL', contentSchema: EMAIL_SCHEMA, providers: [enabledProvider] },
        { channelType: 'SMS', contentSchema: null, providers: [enabledProvider] },
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
    await typeSubject(user);
    await user.type(screen.getByLabelText('Mensaje'), 'Hola Alice');
}

async function attachViaDialog(user: User, ...files: File[]) {
    await user.click(screen.getByRole('button', { name: 'Adjuntar archivos' }));
    await user.upload(screen.getByLabelText('Examinar archivos'), files);
    await user.click(screen.getByRole('button', { name: `Adjuntar (${files.length})` }));
}

function pdf(name = 'comprobante.pdf', content = '%PDF') {
    return new File([content], name, { type: 'application/pdf' });
}

function bigPdf(name = 'grande.pdf') {
    return new File([new Uint8Array(1024 * 1024 + 1)], name, { type: 'application/pdf' });
}

interface UploadStep {
    state: 'PENDING_SCAN' | 'CLEAN' | 'INFECTED';
    rejectionReason?: 'MALWARE' | 'CONTENT_TYPE_MISMATCH';
}

function uploadHandlers(id: string, steps: UploadStep[], calls: string[] = []) {
    let polls = 0;
    const uploadUrl = `https://minio.test/bucket/${id}`;
    return [
        http.post('*/attachment-uploads', async ({ request }) => {
            calls.push('issue');
            const body = (await request.json()) as { sizeBytes: number; contentType: string };
            return HttpResponse.json(
                {
                    uploadId: id,
                    state: 'PENDING_SCAN',
                    fileName: 'grande.pdf',
                    contentType: body.contentType,
                    sizeBytes: body.sizeBytes,
                    uploadUrl,
                    expiresAt: '2026-10-01T12:00:00Z',
                },
                { status: 201 },
            );
        }),
        http.post(new RegExp(`/attachment-uploads/${id}:complete$`), () => {
            calls.push('complete');
            return HttpResponse.json(
                { uploadId: id, state: 'PENDING_SCAN', fileName: 'grande.pdf' },
                { status: 202 },
            );
        }),
        http.get(`*/attachment-uploads/${id}`, () => {
            calls.push('poll');
            const next = steps[Math.min(polls, steps.length - 1)];
            polls += 1;
            return HttpResponse.json({ uploadId: id, fileName: 'grande.pdf', ...next });
        }),
    ];
}

interface SentNotification {
    recipientAddress: string;
    attachments?: {
        fileName: string;
        contentType: string;
        sizeBytes: number;
        content?: string;
        url?: string;
    }[];
}

function acceptNotifications(sent: SentNotification[], calls: string[] = []) {
    return http.post('*/notifications', async ({ request }) => {
        calls.push('notify');
        sent.push((await request.json()) as SentNotification);
        return HttpResponse.json(sendNotificationResponse({ notificationId: 'n-1' }), {
            status: 202,
        });
    });
}

describe('NuevaNotificacion (adjuntos)', () => {
    let storagePuts: number;
    let putStatus: number;

    beforeEach(() => {
        storagePuts = 0;
        putStatus = 200;
        server.use(http.get('*/channels', () => HttpResponse.json(catalog)));
        const realFetch = globalThis.fetch;
        vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
            if (
                init?.method === 'PUT' &&
                new Request(input).url.startsWith('https://minio.test/')
            ) {
                storagePuts += 1;
                return Promise.resolve(new Response(null, { status: putStatus }));
            }
            return realFetch(input, init);
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('abre una ventana para adjuntar y lista el archivo elegido en el formulario', async () => {
        renderPage();
        const user = userEvent.setup();
        await fillIndividual(user);

        await user.click(screen.getByRole('button', { name: 'Adjuntar archivos' }));
        const dialog = screen.getByRole('dialog', { name: 'Adjuntar archivos' });
        await user.upload(within(dialog).getByLabelText('Examinar archivos'), pdf());
        expect(within(dialog).getByText(/comprobante\.pdf/)).toBeInTheDocument();
        await user.click(within(dialog).getByRole('button', { name: 'Adjuntar (1)' }));

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(screen.getByText(/comprobante\.pdf/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Cambiar archivos' })).toBeInTheDocument();
    });

    it('hasta 1 MB envía el archivo en Base64 con su tamaño dentro de attachments', async () => {
        const sent: SentNotification[] = [];
        server.use(acceptNotifications(sent));

        renderPage();
        const user = userEvent.setup();
        await fillIndividual(user);
        await attachViaDialog(user, pdf());
        await user.click(screen.getByRole('button', { name: 'Enviar' }));

        expect(await screen.findByText('Notificación aceptada')).toBeInTheDocument();
        expect(sent[0].attachments).toEqual([
            {
                fileName: 'comprobante.pdf',
                contentType: 'application/pdf',
                sizeBytes: 4,
                content: btoa('%PDF'),
            },
        ]);
    });

    it('más de 1 MB lo sube, espera el veredicto CLEAN y referencia la uploadUrl en url', async () => {
        const calls: string[] = [];
        const sent: SentNotification[] = [];
        server.use(
            ...uploadHandlers('up-1', [{ state: 'PENDING_SCAN' }, { state: 'CLEAN' }], calls),
            acceptNotifications(sent, calls),
        );

        renderPage();
        const user = userEvent.setup();
        await fillIndividual(user);
        await attachViaDialog(user, bigPdf());
        await user.click(screen.getByRole('button', { name: 'Enviar' }));

        expect(
            await screen.findByText('Notificación aceptada', {}, { timeout: 5000 }),
        ).toBeInTheDocument();
        expect(calls).toEqual(['issue', 'complete', 'poll', 'poll', 'notify']);
        expect(storagePuts).toBe(1);
        expect(sent[0].attachments).toEqual([
            {
                fileName: 'grande.pdf',
                contentType: 'application/pdf',
                sizeBytes: 1024 * 1024 + 1,
                url: 'https://minio.test/bucket/up-1',
            },
        ]);
    });

    it.each([
        ['MALWARE', /software malicioso/],
        ['CONTENT_TYPE_MISMATCH', /no coincide con su tipo/],
    ] as const)(
        'si el escaneo marca INFECTED por %s, muestra el motivo y no envía',
        async (rejectionReason, message) => {
            const sent: SentNotification[] = [];
            server.use(
                ...uploadHandlers('up-2', [{ state: 'INFECTED', rejectionReason }]),
                acceptNotifications(sent),
            );

            renderPage();
            const user = userEvent.setup();
            await fillIndividual(user);
            await attachViaDialog(user, bigPdf());
            await user.click(screen.getByRole('button', { name: 'Enviar' }));

            expect(await screen.findByText(message, {}, { timeout: 5000 })).toBeInTheDocument();
            expect(sent).toHaveLength(0);
        },
    );

    it('si falla el PUT al almacenamiento, avisa y no envía la notificación', async () => {
        const sent: SentNotification[] = [];
        server.use(...uploadHandlers('up-3', [{ state: 'CLEAN' }]), acceptNotifications(sent));
        putStatus = 403;

        renderPage();
        const user = userEvent.setup();
        await fillIndividual(user);
        await attachViaDialog(user, bigPdf());
        await user.click(screen.getByRole('button', { name: 'Enviar' }));

        expect(await screen.findByText(/No se pudo subir grande\.pdf/)).toBeInTheDocument();
        expect(sent).toHaveLength(0);
    });

    it('un reintento tras un error del servidor no vuelve a subir el archivo', async () => {
        const calls: string[] = [];
        let attempts = 0;
        server.use(
            ...uploadHandlers('up-4', [{ state: 'CLEAN' }], calls),
            http.post('*/notifications', () => {
                attempts += 1;
                return attempts === 1
                    ? HttpResponse.json({ message: 'boom' }, { status: 500 })
                    : HttpResponse.json(sendNotificationResponse({ notificationId: 'n-9' }), {
                          status: 202,
                      });
            }),
        );

        renderPage();
        const user = userEvent.setup();
        await fillIndividual(user);
        await attachViaDialog(user, bigPdf());
        await user.click(screen.getByRole('button', { name: 'Enviar' }));
        await screen.findByText(/error en el servidor/, {}, { timeout: 5000 });
        await user.click(screen.getByRole('button', { name: 'Enviar' }));

        expect(await screen.findByText('Notificación aceptada')).toBeInTheDocument();
        expect(calls.filter((call) => call === 'issue')).toHaveLength(1);
        expect(storagePuts).toBe(1);
    });

    it('rechaza dentro de la ventana los archivos prohibidos, de tipo no admitido o vacíos', async () => {
        renderPage();
        const user = userEvent.setup({ applyAccept: false });
        await fillIndividual(user);

        await user.click(screen.getByRole('button', { name: 'Adjuntar archivos' }));
        await user.upload(screen.getByLabelText('Examinar archivos'), [
            new File(['x'], 'virus.exe'),
            new File(['x'], 'notas.zip'),
            new File([], 'vacio.pdf'),
            new File(['x'], 'sin-extension'),
        ]);

        const alert = within(screen.getByRole('dialog')).getByRole('alert');
        expect(within(alert).getByText(/virus\.exe: .*prohibido/)).toBeInTheDocument();
        expect(within(alert).getByText(/notas\.zip: .*no permitido/)).toBeInTheDocument();
        expect(within(alert).getByText(/vacio\.pdf: .*vacío/)).toBeInTheDocument();
        expect(within(alert).getByText(/sin-extension: .*no permitido/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Adjuntar (0)' })).toBeInTheDocument();
    });

    it('respeta los límites del canal: tipos declarados y cantidad máxima', async () => {
        renderPage();
        const user = userEvent.setup();
        await fillIndividual(user);

        await user.click(screen.getByRole('button', { name: 'Adjuntar archivos' }));
        await user.upload(screen.getByLabelText('Examinar archivos'), [
            pdf('uno.pdf', 'a'),
            pdf('dos.pdf', 'b'),
            pdf('tres.pdf', 'c'),
            pdf('cuatro.pdf', 'd'),
            new File(['x'], 'hoja.xlsx'),
        ]);

        const alert = within(screen.getByRole('dialog')).getByRole('alert');
        expect(within(alert).getByText(/cuatro\.pdf: .*máximo 3 archivos/)).toBeInTheDocument();
        expect(within(alert).getByText(/hoja\.xlsx: .*canal no admite/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Adjuntar (3)' })).toBeInTheDocument();
    });

    it('no adjunta dos veces el mismo archivo', async () => {
        renderPage();
        const user = userEvent.setup();
        await fillIndividual(user);
        const file = pdf();

        await user.click(screen.getByRole('button', { name: 'Adjuntar archivos' }));
        await user.upload(screen.getByLabelText('Examinar archivos'), file);
        await user.upload(screen.getByLabelText('Examinar archivos'), file);

        expect(within(screen.getByRole('dialog')).getByRole('alert')).toHaveTextContent(
            'Ya está adjunto.',
        );
        expect(screen.getByRole('button', { name: 'Adjuntar (1)' })).toBeInTheDocument();
    });

    it('cancelar o pulsar Escape descarta la selección y devuelve el foco al botón', async () => {
        renderPage();
        const user = userEvent.setup();
        await fillIndividual(user);

        await user.click(screen.getByRole('button', { name: 'Adjuntar archivos' }));
        await user.upload(screen.getByLabelText('Examinar archivos'), pdf());
        await user.keyboard('{Escape}');

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        const opener = screen.getByRole('button', { name: 'Adjuntar archivos' });
        expect(opener).toHaveFocus();

        await user.click(opener);
        expect(screen.getByRole('button', { name: 'Adjuntar (0)' })).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Cancelar' }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('no muestra el aviso de errores al elegir canal ni al adjuntar o quitar archivos', async () => {
        renderPage();
        const user = userEvent.setup();
        await fillIndividual(user);
        expect(screen.queryByText(/Corregí los campos señalados/)).not.toBeInTheDocument();

        await attachViaDialog(user, pdf());
        expect(screen.queryByText(/Corregí los campos señalados/)).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Quitar comprobante.pdf' }));
        expect(screen.queryByText(/Corregí los campos señalados/)).not.toBeInTheDocument();
    });

    it('quitar un archivo de la lista del formulario lo elimina del envío', async () => {
        const sent: SentNotification[] = [];
        server.use(acceptNotifications(sent));

        renderPage();
        const user = userEvent.setup();
        await fillIndividual(user);
        await attachViaDialog(user, pdf('uno.pdf', 'a'), pdf('dos.pdf', 'b'));
        await user.click(screen.getByRole('button', { name: 'Quitar uno.pdf' }));
        await user.click(screen.getByRole('button', { name: 'Enviar' }));

        expect(await screen.findByText('Notificación aceptada')).toBeInTheDocument();
        expect(sent[0].attachments?.map((item) => item.fileName)).toEqual(['dos.pdf']);
    });

    it('en un canal que no declara adjuntos el botón está deshabilitado y lo explica', async () => {
        renderPage();
        const user = userEvent.setup();
        await user.selectOptions(await screen.findByLabelText('Canal'), 'SMS');

        expect(screen.getByRole('button', { name: 'Adjuntar archivos' })).toBeDisabled();
        expect(screen.getByText('Este canal no admite archivos adjuntos.')).toBeInTheDocument();
    });

    it('si cambia a un canal sin adjuntos con archivos elegidos, bloquea el envío', async () => {
        const sent: SentNotification[] = [];
        server.use(acceptNotifications(sent));

        renderPage();
        const user = userEvent.setup();
        await fillIndividual(user);
        await attachViaDialog(user, pdf());
        await user.selectOptions(screen.getByLabelText('Canal'), 'SMS');
        await user.clear(screen.getByLabelText('Número de teléfono'));
        await user.type(screen.getByLabelText('Número de teléfono'), '+573001234567');
        await user.click(screen.getByRole('button', { name: 'Enviar' }));

        expect(
            await screen.findByText(/Quitá los archivos o elegí otro canal/),
        ).toBeInTheDocument();
        expect(sent).toHaveLength(0);
    });

    it('con varios destinatarios envía una notificación por destinatario y sube el archivo una vez', async () => {
        const calls: string[] = [];
        const sent: SentNotification[] = [];
        server.use(
            ...uploadHandlers('up-5', [{ state: 'CLEAN' }], calls),
            acceptNotifications(sent, calls),
        );

        renderPage();
        const user = userEvent.setup();
        await user.selectOptions(await screen.findByLabelText('Canal'), 'EMAIL');
        await user.type(
            screen.getByLabelText('Correo electrónico'),
            'alice@example.com, bob@example.com',
        );
        await typeSubject(user);
        await user.type(screen.getByLabelText('Mensaje'), 'Hola');
        await attachViaDialog(user, bigPdf());
        await user.click(screen.getByRole('button', { name: 'Enviar' }));
        await screen.findByRole('dialog', { name: 'Confirmar envío' });
        await user.click(screen.getByRole('button', { name: 'Confirmar envío' }));

        expect(await screen.findAllByText('Aceptada', {}, { timeout: 5000 })).toHaveLength(2);
        expect(sent.map((item) => item.recipientAddress)).toEqual([
            'alice@example.com',
            'bob@example.com',
        ]);
        expect(
            sent.every((item) => item.attachments?.[0].url === 'https://minio.test/bucket/up-5'),
        ).toBe(true);
        expect(calls.filter((call) => call === 'issue')).toHaveLength(1);
    });
});
