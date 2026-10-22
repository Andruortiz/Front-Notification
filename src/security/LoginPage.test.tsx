import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from './LoginPage';

describe('LoginPage', () => {
    it('ofrece iniciar sesión con un único botón en la barra', async () => {
        const onLogin = vi.fn();
        render(<LoginPage onLogin={onLogin} />);

        const buttons = screen.getAllByRole('button', { name: 'Iniciar sesión' });
        expect(buttons).toHaveLength(1);

        await userEvent.click(buttons[0]);

        expect(screen.getByRole('heading', { name: /en tiempo real/ })).toBeVisible();
        expect(onLogin).toHaveBeenCalledTimes(1);
    });
});
