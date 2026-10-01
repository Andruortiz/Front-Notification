import { useEffect, useRef } from 'react';

interface ConfirmSendDialogProps {
    open: boolean;
    channelType: string;
    recipientCount: number;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmSendDialog({
    open,
    channelType,
    recipientCount,
    message,
    onConfirm,
    onCancel,
}: ConfirmSendDialogProps) {
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
                aria-labelledby="confirm-send-title"
            >
                <h2 id="confirm-send-title">Confirmar envío</h2>
                <dl className="field-grid">
                    <dt>Canal</dt>
                    <dd>{channelType}</dd>
                    <dt>Destinatarios</dt>
                    <dd>{recipientCount}</dd>
                    <dt>Mensaje</dt>
                    <dd>{message}</dd>
                </dl>
                <div className="dialog-actions">
                    <button
                        type="button"
                        ref={cancelRef}
                        className="catalog-action-button"
                        onClick={onCancel}
                    >
                        Cancelar
                    </button>
                    <button type="button" className="catalog-action-button" onClick={onConfirm}>
                        Confirmar envío
                    </button>
                </div>
            </div>
        </div>
    );
}
