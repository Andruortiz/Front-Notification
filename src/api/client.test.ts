import { beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/server';
import { apiFetch, ApiError } from './client';
import { reloginOnUnauthorized } from '../security/session';

vi.mock('../security/session', async (importOriginal) => ({
    ...(await importOriginal()),
    reloginOnUnauthorized: vi.fn(),
}));

describe('apiFetch ante un 401', () => {
    beforeEach(() => {
        vi.mocked(reloginOnUnauthorized).mockReset();
        vi.unstubAllEnvs();
        server.use(
            http.get('*/api/protegido', () => new HttpResponse(null, { status: 401 })),
            http.get('*/api/ok', () => HttpResponse.json({ ok: true })),
        );
    });

    it('vuelve a pasar por el login en modo sesión y conserva el error', async () => {
        vi.stubEnv('VITE_PDP_URL', 'http://pdp.test');
        vi.stubEnv('VITE_AUTH_TOKEN', '');

        await expect(apiFetch('/protegido')).rejects.toMatchObject({
            name: 'ApiError',
            status: 401,
        });

        expect(reloginOnUnauthorized).toHaveBeenCalledWith('http://pdp.test');
    });

    it('no redirige al login con un token fijo de desarrollo', async () => {
        vi.stubEnv('VITE_PDP_URL', 'http://pdp.test');
        vi.stubEnv('VITE_AUTH_TOKEN', 'token');

        await expect(apiFetch('/protegido')).rejects.toBeInstanceOf(ApiError);

        expect(reloginOnUnauthorized).not.toHaveBeenCalled();
    });

    it('no toca el login cuando la respuesta es correcta', async () => {
        vi.stubEnv('VITE_PDP_URL', 'http://pdp.test');
        vi.stubEnv('VITE_AUTH_TOKEN', '');

        await expect(apiFetch('/ok')).resolves.toEqual({ ok: true });

        expect(reloginOnUnauthorized).not.toHaveBeenCalled();
    });
});
