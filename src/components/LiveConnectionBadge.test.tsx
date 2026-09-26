import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import LiveConnectionBadge from './LiveConnectionBadge';

describe('LiveConnectionBadge', () => {
    it.each([
        ['connecting', 'Conectando…'],
        ['open', 'En vivo'],
        ['reconnecting', 'Reconectando…'],
        ['closed', 'Desconectado'],
    ] as const)('renders the label for state "%s"', (state, label) => {
        render(<LiveConnectionBadge state={state} />);
        expect(screen.getByText(label)).toBeInTheDocument();
    });

    it('reflects the transition from open to reconnecting and back to open', () => {
        const { rerender } = render(<LiveConnectionBadge state="open" />);
        expect(screen.getByText('En vivo')).toBeInTheDocument();

        rerender(<LiveConnectionBadge state="reconnecting" />);
        expect(screen.getByText('Reconectando…')).toBeInTheDocument();

        rerender(<LiveConnectionBadge state="open" />);
        expect(screen.getByText('En vivo')).toBeInTheDocument();
    });
});
