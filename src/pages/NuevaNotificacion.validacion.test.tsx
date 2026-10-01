import { describe, expect, it } from 'vitest';
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

const provider = {
    providerId: 'simulated',
    preferenceOrder: 1,
    status: 'ENABLED' as const,
    statusReason: null,
};

const catalog: ChannelCatalogResponse = {
    items: [
        { channelType: 'EMAIL', contentSchema: null, providers: [provider] },
        {
            channelType: 'SMS',
            contentSchema:
                '{"type":"object","required":["body"],"properties":{"body":{"type":"string","maxLength":160}}}',
            providers: [provider],
        },
        {
            channelType: 'PUSH',
            contentSchema:
                '{"type":"object","required":["body"],"properties":{"subject":{"maxLength":100},"body":{"type":"string","maxLength":900}}}',
            providers: [provider],
        },
    ],
};

interface SentRequest {
    recipientAddress: string;
    subject?: string;
    body: string;
}

function setup() {
    const sent: SentRequest[] = [];
    server.use(
        http.get('*/channels', () => HttpResponse.json(catalog)),
        http.post('*/notifications', async ({ request }) => {
            sent.push((await request.json()) as SentRequest);
            return HttpResponse.json(sendNotificationResponse({ notificationId: 'n-1' }), {
                status: 202,
            });
        }),
    );
    render(
        <QueryClientProvider client={new QueryClient()}>
            <MemoryRouter initialEntries={['/notificaciones/nueva']}>
                <Routes>
                    <Route path="/notificaciones/nueva" element={<NuevaNotificacion />} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>,
    );
    return { sent, user: userEvent.setup() };
}

type User = ReturnType<typeof userEvent.setup>;

async function chooseChannel(user: User, channel: string) {
    await user.selectOptions(await screen.findByLabelText('Canal'), channel);
}

describe('NuevaNotificacion (validaciones)', () => {
    it('muestra el motivo exacto del correo inválido al salir del campo y lo quita al corregirlo', async () => {
        const { user } = setup();
        await chooseChannel(user, 'EMAIL');
        const address = screen.getByLabelText('Correo electrónico');

        await user.type(address, 'alice');
        await user.tab();
        expect(screen.getByText('Falta el símbolo @ en el correo.')).toBeInTheDocument();
        expect(address).toBeInvalid();

        await user.type(address, '@example');
        expect(screen.getByText(/debe incluir un punto/)).toBeInTheDocument();

        await user.type(address, '.com');
        expect(screen.queryByText(/debe incluir un punto/)).not.toBeInTheDocument();
        expect(address).toBeValid();
    });

    it('no muestra errores antes de que el usuario salga del campo o envíe', async () => {
        const { user } = setup();
        await chooseChannel(user, 'EMAIL');

        await user.type(screen.getByLabelText('Correo electrónico'), 'alice');

        expect(screen.queryByText(/Falta el símbolo/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Corregí los campos/)).not.toBeInTheDocument();
    });

    it('exige el asunto en EMAIL y lo marca como opcional en PUSH', async () => {
        const { user } = setup();
        await chooseChannel(user, 'EMAIL');

        const subject = screen.getByLabelText('Asunto');
        expect(subject).toBeRequired();
        await user.click(subject);
        await user.tab();
        expect(screen.getByText('Escribí un asunto.')).toBeInTheDocument();

        await user.type(subject, 'Hola');
        expect(screen.queryByText('Escribí un asunto.')).not.toBeInTheDocument();

        await chooseChannel(user, 'PUSH');
        expect(screen.getByLabelText('Asunto (opcional)')).not.toBeRequired();
    });

    it('al enviar con todo vacío señala los campos, enfoca el primero y no hace ninguna solicitud', async () => {
        const { user, sent } = setup();
        await chooseChannel(user, 'EMAIL');

        await user.click(screen.getByRole('button', { name: 'Enviar' }));

        expect(screen.getByText('Escribí un correo electrónico.')).toBeInTheDocument();
        expect(screen.getByText('Escribí un asunto.')).toBeInTheDocument();
        expect(screen.getByText('Escribí un mensaje.')).toBeInTheDocument();
        expect(screen.getByLabelText('Correo electrónico')).toHaveFocus();
        expect(sent).toHaveLength(0);
    });

    it('enfoca el asunto cuando es el primer campo inválido', async () => {
        const { user } = setup();
        await chooseChannel(user, 'EMAIL');
        await user.type(screen.getByLabelText('Correo electrónico'), 'alice@example.com');
        await user.type(screen.getByLabelText('Mensaje'), 'Hola');

        await user.click(screen.getByRole('button', { name: 'Enviar' }));

        expect(screen.getByLabelText('Asunto')).toHaveFocus();
    });

    it('envía el asunto sin espacios sobrantes y el correo normalizado', async () => {
        const { user, sent } = setup();
        await chooseChannel(user, 'EMAIL');
        await user.type(screen.getByLabelText('Correo electrónico'), '  Alice@Example.COM ');
        await user.type(screen.getByLabelText('Asunto'), '  Tu pedido  ');
        await user.type(screen.getByLabelText('Mensaje'), 'Hola Alice');

        await user.click(screen.getByRole('button', { name: 'Enviar' }));

        expect(await screen.findByText('Notificación aceptada')).toBeInTheDocument();
        expect(sent[0]).toMatchObject({
            recipientAddress: 'alice@example.com',
            subject: 'Tu pedido',
            body: 'Hola Alice',
        });
    });

    it('en SMS acepta el número con espacios y guiones y lo envía en formato E.164', async () => {
        const { user, sent } = setup();
        await chooseChannel(user, 'SMS');
        await user.type(screen.getByLabelText('Número de teléfono'), '+57 (300) 123-4567');
        await user.type(screen.getByLabelText('Mensaje'), 'Hola');

        await user.click(screen.getByRole('button', { name: 'Enviar' }));

        expect(await screen.findByText('Notificación aceptada')).toBeInTheDocument();
        expect(sent[0].recipientAddress).toBe('+573001234567');
        expect(sent[0].subject).toBeUndefined();
    });

    it.each([
        ['3001234567', /empezar con \+/],
        ['+0573001234567', /no puede empezar con 0/],
        ['+57abc', /solo puede tener dígitos/],
        ['+1', /entre 2 y 15 dígitos/],
    ])('en SMS rechaza %j con su motivo y no envía', async (phone, message) => {
        const { user, sent } = setup();
        await chooseChannel(user, 'SMS');
        await user.type(screen.getByLabelText('Número de teléfono'), phone);
        await user.type(screen.getByLabelText('Mensaje'), 'Hola');

        await user.click(screen.getByRole('button', { name: 'Enviar' }));

        expect(screen.getByText(message)).toBeInTheDocument();
        expect(sent).toHaveLength(0);
    });

    it('muestra el contador de caracteres y el error al superar el límite del canal', async () => {
        const { user } = setup();
        await chooseChannel(user, 'SMS');
        expect(screen.getByText('0 / 160')).toBeInTheDocument();

        const body = screen.getByLabelText('Mensaje');
        await user.click(body);
        await user.paste('a'.repeat(161));
        await user.tab();

        expect(screen.getByText('161 / 160')).toBeInTheDocument();
        expect(
            screen.getByText('El mensaje supera el máximo de 160 caracteres.'),
        ).toBeInTheDocument();

        await user.type(body, '{Backspace}');
        expect(screen.queryByText(/supera el máximo/)).not.toBeInTheDocument();
    });

    it('en EMAIL el mensaje muestra el tope global de 32.768 caracteres', async () => {
        const { user } = setup();
        await chooseChannel(user, 'EMAIL');

        expect(screen.getByText('0 / 32.768')).toBeInTheDocument();
    });

    it('rechaza un mensaje con caracteres de control', async () => {
        const { user, sent } = setup();
        await chooseChannel(user, 'SMS');
        await user.type(screen.getByLabelText('Número de teléfono'), '+573001234567');
        await user.click(screen.getByLabelText('Mensaje'));
        await user.paste('hola\u0000mundo');

        await user.click(screen.getByRole('button', { name: 'Enviar' }));

        expect(screen.getByText(/caracteres de control no permitidos/)).toBeInTheDocument();
        expect(sent).toHaveLength(0);
    });

    it('en PUSH rechaza un token con espacios y limita el título a 100 caracteres', async () => {
        const { user, sent } = setup();
        await chooseChannel(user, 'PUSH');
        await user.type(screen.getByLabelText('Token del dispositivo'), 'token con espacios');
        await user.click(screen.getByLabelText('Asunto (opcional)'));
        await user.paste('t'.repeat(101));
        await user.type(screen.getByLabelText('Mensaje'), 'Hola');

        await user.click(screen.getByRole('button', { name: 'Enviar' }));

        expect(screen.getByText('El token no puede contener espacios.')).toBeInTheDocument();
        expect(
            screen.getByText('El asunto supera el máximo de 100 caracteres.'),
        ).toBeInTheDocument();
        expect(sent).toHaveLength(0);
    });

    it('en varios destinatarios indica el motivo de cada fila inválida y bloquea el envío', async () => {
        const { user, sent } = setup();
        await chooseChannel(user, 'EMAIL');
        await user.type(
            screen.getByLabelText('Correo electrónico'),
            'ok@example.com, sin-arroba, otro@dominio',
        );
        await user.type(screen.getByLabelText('Asunto'), 'Aviso');
        await user.type(screen.getByLabelText('Mensaje'), 'Hola');

        expect(screen.getByText('Falta el símbolo @ en el correo.')).toBeInTheDocument();
        expect(screen.getByText(/debe incluir un punto/)).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Enviar' }));

        expect(
            screen.getByText('Corregí las direcciones con formato inválido.'),
        ).toBeInTheDocument();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(sent).toHaveLength(0);
    });
});
