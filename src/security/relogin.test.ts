import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RELOGIN_MIN_INTERVAL_MS, reloginOnUnauthorized, sessionModeUrl } from './session';

const PDP = 'http://pdp.test';

describe('reloginOnUnauthorized', () => {
    const originalLocation = window.location;
    let assign: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        window.sessionStorage.clear();
        assign = vi.fn();
        Object.defineProperty(window, 'location', {
            value: { href: 'http://localhost:5174/notificaciones/abc', assign },
            writable: true,
        });
    });

    afterEach(() => {
        Object.defineProperty(window, 'location', { value: originalLocation, writable: true });
    });

    it('redirige al login conservando la URL de retorno la primera vez', () => {
        expect(reloginOnUnauthorized(PDP, 1_000_000)).toBe(true);

        expect(assign).toHaveBeenCalledWith(
            `${PDP}/oauth2/authorization/keycloak?return_to=${encodeURIComponent('http://localhost:5174/notificaciones/abc')}`,
        );
    });

    it('no vuelve a redirigir antes de un minuto para evitar bucles', () => {
        reloginOnUnauthorized(PDP, 1_000_000);
        assign.mockClear();

        expect(reloginOnUnauthorized(PDP, 1_000_000 + RELOGIN_MIN_INTERVAL_MS - 1)).toBe(false);
        expect(assign).not.toHaveBeenCalled();
    });

    it('vuelve a redirigir pasado el minuto', () => {
        reloginOnUnauthorized(PDP, 1_000_000);
        assign.mockClear();

        expect(reloginOnUnauthorized(PDP, 1_000_000 + RELOGIN_MIN_INTERVAL_MS)).toBe(true);
        expect(assign).toHaveBeenCalledTimes(1);
    });
});

describe('sessionModeUrl', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('devuelve la URL del PDP cuando no hay token fijo', () => {
        vi.stubEnv('VITE_PDP_URL', PDP);
        vi.stubEnv('VITE_AUTH_TOKEN', '');

        expect(sessionModeUrl()).toBe(PDP);
    });

    it('devuelve null con un token fijo de desarrollo', () => {
        vi.stubEnv('VITE_PDP_URL', PDP);
        vi.stubEnv('VITE_AUTH_TOKEN', 'token');

        expect(sessionModeUrl()).toBeNull();
    });

    it('devuelve null sin URL del PDP', () => {
        vi.stubEnv('VITE_PDP_URL', '');
        vi.stubEnv('VITE_AUTH_TOKEN', '');

        expect(sessionModeUrl()).toBeNull();
    });
});
