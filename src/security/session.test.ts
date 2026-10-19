import { afterEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/server';
import { requireSession } from './session';

const PDP = 'http://pdp.test';

describe('requireSession', () => {
    const originalLocation = window.location;

    afterEach(() => {
        Object.defineProperty(window, 'location', { value: originalLocation, writable: true });
    });

    function stubLocation(href: string) {
        const assign = vi.fn();
        Object.defineProperty(window, 'location', {
            value: { href, assign },
            writable: true,
        });
        return assign;
    }

    it('devuelve true cuando hay sesión activa', async () => {
        server.use(http.get(`${PDP}/api/v1/session`, () => HttpResponse.json({ user: 'demo' })));

        await expect(requireSession(PDP)).resolves.toBe(true);
    });

    it('redirige al login conservando la URL de retorno cuando la sesión no existe', async () => {
        const assign = stubLocation('http://localhost:5173/seguridad');
        server.use(
            http.get(`${PDP}/api/v1/session`, () => new HttpResponse(null, { status: 401 })),
        );

        await expect(requireSession(PDP)).resolves.toBe(false);

        expect(assign).toHaveBeenCalledWith(
            `${PDP}/oauth2/authorization/keycloak?return_to=${encodeURIComponent('http://localhost:5173/seguridad')}`,
        );
    });

    it('falla cuando el PDP responde con un error distinto de 401', async () => {
        server.use(
            http.get(`${PDP}/api/v1/session`, () => new HttpResponse(null, { status: 503 })),
        );

        await expect(requireSession(PDP)).rejects.toThrow('No fue posible consultar la sesión');
    });
});
