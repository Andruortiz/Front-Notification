import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SessionGate from './SessionGate';
import { requireSession } from './session';

vi.mock('./session', () => ({ requireSession: vi.fn() }));

describe('SessionGate', () => {
    beforeEach(() => {
        vi.mocked(requireSession).mockReset();
        vi.stubEnv('VITE_PDP_URL', 'http://pdp.test');
        vi.stubEnv('VITE_AUTH_TOKEN', '');
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('muestra el contenido cuando hay sesión activa', async () => {
        vi.mocked(requireSession).mockResolvedValue(true);

        render(
            <SessionGate>
                <p>panel</p>
            </SessionGate>,
        );

        expect(await screen.findByText('panel')).toBeInTheDocument();
        expect(requireSession).toHaveBeenCalledWith('http://pdp.test');
    });

    it('no muestra el contenido mientras se redirige al login', async () => {
        vi.mocked(requireSession).mockResolvedValue(false);

        render(
            <SessionGate>
                <p>panel</p>
            </SessionGate>,
        );

        await waitFor(() => expect(requireSession).toHaveBeenCalledTimes(1));
        expect(screen.getByRole('status')).toHaveTextContent('Verificando la sesión');
        expect(screen.queryByText('panel')).not.toBeInTheDocument();
    });

    it('muestra el error y permite reintentar cuando la consulta falla', async () => {
        vi.mocked(requireSession).mockRejectedValueOnce(new Error('caído'));
        vi.mocked(requireSession).mockResolvedValueOnce(true);

        render(
            <SessionGate>
                <p>panel</p>
            </SessionGate>,
        );

        expect(await screen.findByRole('alert')).toHaveTextContent('No fue posible consultar');
        await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

        expect(await screen.findByText('panel')).toBeInTheDocument();
        expect(requireSession).toHaveBeenCalledTimes(2);
    });

    it('no consulta la sesión sin VITE_PDP_URL', () => {
        vi.stubEnv('VITE_PDP_URL', '');

        render(
            <SessionGate>
                <p>panel</p>
            </SessionGate>,
        );

        expect(screen.getByText('panel')).toBeInTheDocument();
        expect(requireSession).not.toHaveBeenCalled();
    });

    it('no consulta la sesión cuando hay un token fijo de desarrollo', () => {
        vi.stubEnv('VITE_AUTH_TOKEN', 'token-de-prueba');

        render(
            <SessionGate>
                <p>panel</p>
            </SessionGate>,
        );

        expect(screen.getByText('panel')).toBeInTheDocument();
        expect(requireSession).not.toHaveBeenCalled();
    });
});
