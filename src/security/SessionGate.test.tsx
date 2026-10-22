import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SessionGate from './SessionGate';
import { checkSession } from './session';

vi.mock('./session', async (importOriginal) => ({
    ...(await importOriginal()),
    checkSession: vi.fn(),
}));

describe('SessionGate', () => {
    beforeEach(() => {
        vi.mocked(checkSession).mockReset();
        vi.stubEnv('VITE_PDP_URL', 'http://pdp.test');
        vi.stubEnv('VITE_AUTH_TOKEN', '');
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('muestra el contenido cuando hay sesión activa', async () => {
        vi.mocked(checkSession).mockResolvedValue(true);

        render(
            <SessionGate>
                <p>panel</p>
            </SessionGate>,
        );

        expect(await screen.findByText('panel')).toBeInTheDocument();
        expect(checkSession).toHaveBeenCalledWith('http://pdp.test');
    });

    it('muestra la pagina de acceso, sin redirigir solo, cuando no hay sesión', async () => {
        vi.mocked(checkSession).mockResolvedValue(false);
        const assign = vi.fn();
        vi.stubGlobal('location', { href: 'http://localhost:5173/', assign });

        render(
            <SessionGate>
                <p>panel</p>
            </SessionGate>,
        );

        await userEvent.click(await screen.findByRole('button', { name: 'Iniciar sesión' }));

        expect(screen.queryByText('panel')).not.toBeInTheDocument();
        expect(assign).toHaveBeenCalledWith(
            `http://pdp.test/oauth2/authorization/keycloak?return_to=${encodeURIComponent('http://localhost:5173/')}`,
        );
        vi.unstubAllGlobals();
    });

    it('muestra el error y permite reintentar cuando la consulta falla', async () => {
        vi.mocked(checkSession).mockRejectedValueOnce(new Error('caído'));
        vi.mocked(checkSession).mockResolvedValueOnce(true);

        render(
            <SessionGate>
                <p>panel</p>
            </SessionGate>,
        );

        expect(await screen.findByRole('alert')).toHaveTextContent('No fue posible consultar');
        await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

        expect(await screen.findByText('panel')).toBeInTheDocument();
        expect(checkSession).toHaveBeenCalledTimes(2);
    });

    it('no consulta la sesión sin VITE_PDP_URL', () => {
        vi.stubEnv('VITE_PDP_URL', '');

        render(
            <SessionGate>
                <p>panel</p>
            </SessionGate>,
        );

        expect(screen.getByText('panel')).toBeInTheDocument();
        expect(checkSession).not.toHaveBeenCalled();
    });

    it('no consulta la sesión cuando hay un token fijo de desarrollo', () => {
        vi.stubEnv('VITE_AUTH_TOKEN', 'token-de-prueba');

        render(
            <SessionGate>
                <p>panel</p>
            </SessionGate>,
        );

        expect(screen.getByText('panel')).toBeInTheDocument();
        expect(checkSession).not.toHaveBeenCalled();
    });
});
