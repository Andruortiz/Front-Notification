import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Seguridad from './Seguridad';
import { mountSecurityUi } from '../security/securityUi';

vi.mock('../security/securityUi', () => ({ mountSecurityUi: vi.fn() }));

describe('Seguridad', () => {
    beforeEach(() => {
        vi.mocked(mountSecurityUi).mockReset();
    });

    it('monta el microfrontend dentro del contenedor de la página', async () => {
        vi.mocked(mountSecurityUi).mockResolvedValue(undefined);

        const { container } = render(<Seguridad />);

        await waitFor(() => expect(mountSecurityUi).toHaveBeenCalledTimes(1));
        expect(mountSecurityUi).toHaveBeenCalledWith(container.querySelector('#security-ui'));
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('muestra el error cuando el microfrontend no se puede cargar', async () => {
        vi.mocked(mountSecurityUi).mockRejectedValue(new Error('Falta configurar VITE_PDP_URL'));

        render(<Seguridad />);

        expect(await screen.findByRole('alert')).toHaveTextContent('Falta configurar VITE_PDP_URL');
    });
});
