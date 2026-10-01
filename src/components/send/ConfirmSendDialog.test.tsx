import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmSendDialog from './ConfirmSendDialog';

describe('ConfirmSendDialog', () => {
    it('enfoca el botón cancelar al abrirse', async () => {
        render(
            <ConfirmSendDialog
                open={true}
                channelType="EMAIL"
                recipientCount={5}
                message="Hola"
                onConfirm={vi.fn()}
                onCancel={vi.fn()}
            />,
        );
        expect(await screen.findByRole('button', { name: 'Cancelar' })).toHaveFocus();
    });

    it('cierra con Escape', async () => {
        const onCancel = vi.fn();
        render(
            <ConfirmSendDialog
                open={true}
                channelType="EMAIL"
                recipientCount={3}
                message="Hola"
                onConfirm={vi.fn()}
                onCancel={onCancel}
            />,
        );
        const user = userEvent.setup();
        await user.keyboard('{Escape}');
        expect(onCancel).toHaveBeenCalled();
    });

    it('devuelve el foco al botón que lo abrió al cerrarse', async () => {
        function Harness() {
            const [open, setOpen] = useState(false);
            return (
                <div>
                    <button type="button" onClick={() => setOpen(true)}>
                        Abrir
                    </button>
                    <ConfirmSendDialog
                        open={open}
                        channelType="EMAIL"
                        recipientCount={2}
                        message="Hola"
                        onConfirm={vi.fn()}
                        onCancel={() => setOpen(false)}
                    />
                </div>
            );
        }

        render(<Harness />);
        const user = userEvent.setup();
        const openButton = screen.getByRole('button', { name: 'Abrir' });
        await user.click(openButton);

        expect(await screen.findByRole('button', { name: 'Cancelar' })).toHaveFocus();
        await user.click(screen.getByRole('button', { name: 'Cancelar' }));

        expect(openButton).toHaveFocus();
    });

    it('muestra canal, cantidad y mensaje', () => {
        render(
            <ConfirmSendDialog
                open={true}
                channelType="SMS"
                recipientCount={42}
                message="Recordatorio"
                onConfirm={vi.fn()}
                onCancel={vi.fn()}
            />,
        );
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('SMS')).toBeInTheDocument();
        expect(screen.getByText('42')).toBeInTheDocument();
        expect(screen.getByText('Recordatorio')).toBeInTheDocument();
    });
});
