import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Layout from './Layout';

function renderLayout() {
    render(
        <MemoryRouter>
            <Layout />
        </MemoryRouter>,
    );
}

describe('Layout', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
    });

    it('muestra Cerrar sesión y cierra la sesión en el PDP en modo sesión', async () => {
        vi.stubEnv('VITE_PDP_URL', 'http://pdp.test');
        vi.stubEnv('VITE_AUTH_TOKEN', '');
        const assign = vi.fn();
        vi.stubGlobal('location', { href: 'http://localhost:5173/', assign });

        renderLayout();
        await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

        expect(assign).toHaveBeenCalledWith('http://pdp.test/api/v1/session/logout');
    });

    it('no muestra Cerrar sesión sin modo sesión', () => {
        vi.stubEnv('VITE_PDP_URL', '');

        renderLayout();

        expect(screen.queryByRole('button', { name: 'Cerrar sesión' })).not.toBeInTheDocument();
    });
});
