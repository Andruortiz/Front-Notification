import { useEffect, useRef } from 'react';

interface ConfirmRetryDialogProps {
    open: boolean;
    providerId?: string | null;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmRetryDialog({
    open,
    providerId,
    onConfirm,
    onCancel,
}: ConfirmRetryDialogProps) {
    const cancelRef = useRef<HTMLButtonElement | null>(null);
    const previouslyFocusedRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (open) {
            previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
            cancelRef.current?.focus();
        } else {
            previouslyFocusedRef.current?.focus();
        }
    }, [open]);

    useEffect(() => {
        if (!open) {
            return;
        }
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                onCancel();
            }
        }
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [open, onCancel]);

    if (!open) {
        return null;
    }

    return (
        <div className="dialog-overlay">
            <div
                className="dialog-panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-retry-title"
            >
                <h2 id="confirm-retry-title">Reintentar envío</h2>
                <p className="page-subtitle">
                    Se enviará de nuevo{providerId ? ` por ${providerId}` : ''}. El intento quedará
                    registrado como manual.
                </p>
                <div className="dialog-actions">
                    <button
                        type="button"
                        ref={cancelRef}
                        className="catalog-action-button"
                        onClick={onCancel}
                    >
                        Cancelar
                    </button>
                    <button type="button" className="button" onClick={onConfirm}>
                        Reintentar ahora
                    </button>
                </div>
            </div>
        </div>
    );
}
