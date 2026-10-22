import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AttachmentDialog from './AttachmentDialog';
import type { ChannelAttachmentRules } from '../../lib/attachment';

const rules: ChannelAttachmentRules = {
    maxItems: 3,
    contentTypes: null,
    maxSizeBytes: null,
};

function pdf(name: string, content = 'x') {
    return new File([content], name, { type: 'application/pdf' });
}

function renderDialog(files: File[] = []) {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
        <AttachmentDialog files={files} rules={rules} onConfirm={onConfirm} onCancel={onCancel} />,
    );
    return { onConfirm, onCancel };
}

describe('AttachmentDialog', () => {
    it('es un diálogo modal con título, límites y foco inicial dentro', () => {
        renderDialog();

        const dialog = screen.getByRole('dialog', { name: 'Adjuntar archivos' });
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(dialog).toHaveAccessibleDescription(/Hasta 3 archivos de 10\.0 MB cada uno/);
        expect(dialog).toContainElement(document.activeElement as HTMLElement);
    });

    it('parte de los archivos ya adjuntos y los devuelve junto con los nuevos', async () => {
        const { onConfirm } = renderDialog([pdf('previo.pdf')]);
        const user = userEvent.setup();

        await user.upload(screen.getByLabelText('Examinar archivos'), pdf('nuevo.pdf'));
        await user.click(screen.getByRole('button', { name: 'Adjuntar (2)' }));

        expect(onConfirm).toHaveBeenCalledTimes(1);
        const [files] = onConfirm.mock.calls[0] as [File[]];
        expect(files.map((file) => file.name)).toEqual(['previo.pdf', 'nuevo.pdf']);
    });

    it('permite arrastrar y soltar archivos sobre la zona', () => {
        renderDialog();
        const zone = screen.getByText(/Arrastrá los archivos acá/).closest('div') as HTMLElement;

        fireEvent.dragOver(zone);
        expect(zone).toHaveClass('dropzone--active');
        fireEvent.drop(zone, { dataTransfer: { files: [pdf('soltado.pdf')] } });

        expect(zone).not.toHaveClass('dropzone--active');
        expect(screen.getByText(/soltado\.pdf/)).toBeInTheDocument();
    });

    it('quita un archivo de la selección', async () => {
        renderDialog([pdf('uno.pdf'), pdf('dos.pdf')]);
        const user = userEvent.setup();

        await user.click(screen.getByRole('button', { name: 'Quitar uno.pdf' }));

        expect(screen.queryByText(/uno\.pdf/)).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Adjuntar (1)' })).toBeInTheDocument();
    });

    it('mantiene el foco dentro del diálogo con Tab y Shift+Tab', async () => {
        renderDialog();
        const user = userEvent.setup();
        const confirm = screen.getByRole('button', { name: 'Adjuntar (0)' });

        await user.tab({ shift: true });
        expect(confirm).toHaveFocus();
        await user.tab();
        expect(screen.getByLabelText('Examinar archivos')).toHaveFocus();
    });

    it('cancela con Escape y al pulsar el fondo, pero no al pulsar dentro del panel', async () => {
        const { onCancel } = renderDialog();
        const user = userEvent.setup();

        await user.click(screen.getByRole('dialog'));
        expect(onCancel).not.toHaveBeenCalled();

        await user.keyboard('{Escape}');
        expect(onCancel).toHaveBeenCalledTimes(1);

        fireEvent.mouseDown(screen.getByRole('dialog').parentElement!);
        expect(onCancel).toHaveBeenCalledTimes(2);
    });

    it('sigue atrapando el foco y respondiendo a Escape después de pulsar una zona no enfocable', async () => {
        const { onCancel } = renderDialog();
        const user = userEvent.setup();

        await user.click(screen.getByRole('heading', { name: 'Adjuntar archivos' }));
        await user.tab();
        expect(screen.getByRole('dialog')).toContainElement(document.activeElement as HTMLElement);

        await user.click(screen.getByRole('heading', { name: 'Adjuntar archivos' }));
        await user.keyboard('{Escape}');
        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('confirma sin archivos para vaciar la selección', async () => {
        const { onConfirm } = renderDialog([pdf('uno.pdf')]);
        const user = userEvent.setup();

        await user.click(screen.getByRole('button', { name: 'Quitar uno.pdf' }));
        await user.click(screen.getByRole('button', { name: 'Adjuntar (0)' }));

        expect(onConfirm).toHaveBeenCalledWith([]);
    });
});
