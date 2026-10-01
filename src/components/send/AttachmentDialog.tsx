import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { createPortal } from 'react-dom';
import {
    ATTACHMENT_ACCEPT,
    ATTACHMENT_TYPES_LABEL,
    MAX_TOTAL_BYTES,
    addAttachmentFiles,
    formatFileSize,
    maxFileBytes,
    maxFileCount,
    type ChannelAttachmentRules,
    type RejectedFile,
} from '../../lib/attachment';

interface AttachmentDialogProps {
    files: File[];
    rules: ChannelAttachmentRules;
    onConfirm: (files: File[]) => void;
    onCancel: () => void;
}

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function AttachmentDialog({
    files,
    rules,
    onConfirm,
    onCancel,
}: AttachmentDialogProps) {
    const [draft, setDraft] = useState<File[]>(files);
    const [rejected, setRejected] = useState<RejectedFile[]>([]);
    const [dragging, setDragging] = useState(false);
    const panelRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        const previouslyFocused = document.activeElement as HTMLElement | null;
        panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
        return () => previouslyFocused?.focus();
    }, []);

    useEffect(() => {
        function handleKeyDown(event: globalThis.KeyboardEvent) {
            if (event.key === 'Escape') {
                onCancel();
                return;
            }
            if (event.key !== 'Tab') {
                return;
            }
            const focusable = Array.from(
                panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [],
            );
            if (focusable.length === 0) {
                return;
            }
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const active = document.activeElement;
            if (!panelRef.current?.contains(active)) {
                event.preventDefault();
                (event.shiftKey ? last : first).focus();
            } else if (event.shiftKey && active === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && active === last) {
                event.preventDefault();
                first.focus();
            }
        }
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onCancel]);

    const maxCount = maxFileCount(rules);
    const total = draft.reduce((sum, file) => sum + file.size, 0);

    function addFiles(incoming: File[]) {
        const result = addAttachmentFiles(draft, incoming, rules);
        setDraft(result.files);
        setRejected(result.rejected);
    }

    function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
        addFiles(Array.from(event.target.files ?? []));
        event.target.value = '';
    }

    function handleDrop(event: DragEvent<HTMLDivElement>) {
        event.preventDefault();
        setDragging(false);
        addFiles(Array.from(event.dataTransfer.files));
    }

    function handleDragOver(event: DragEvent<HTMLDivElement>) {
        event.preventDefault();
        setDragging(true);
    }

    return createPortal(
        <div
            className="dialog-overlay"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onCancel();
                }
            }}
        >
            <div
                ref={panelRef}
                className="dialog-panel dialog-panel--wide"
                role="dialog"
                aria-modal="true"
                aria-labelledby="attachment-dialog-title"
                aria-describedby="attachment-dialog-hint"
                tabIndex={-1}
            >
                <h2 id="attachment-dialog-title">Adjuntar archivos</h2>
                <p id="attachment-dialog-hint" className="field-hint">
                    {ATTACHMENT_TYPES_LABEL}. Hasta {maxCount}{' '}
                    {maxCount === 1 ? 'archivo' : 'archivos'} de{' '}
                    {formatFileSize(maxFileBytes(rules))} cada uno y{' '}
                    {formatFileSize(MAX_TOTAL_BYTES)} en total. Los archivos de más de 1 MB se suben
                    y se verifican antes de enviar.
                </p>

                <div
                    className={`dropzone${dragging ? ' dropzone--active' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                >
                    <p>Arrastrá los archivos acá o</p>
                    <input
                        id="attachment-dialog-input"
                        ref={inputRef}
                        className="visually-hidden"
                        type="file"
                        multiple
                        accept={ATTACHMENT_ACCEPT}
                        onChange={handleInputChange}
                    />
                    <label htmlFor="attachment-dialog-input" className="catalog-action-button">
                        Examinar archivos
                    </label>
                </div>

                {rejected.length > 0 && (
                    <ul role="alert" className="field-error attachment-rejections">
                        {rejected.map((item, index) => (
                            <li key={`${item.name}-${index}`}>
                                {item.name}: {item.reason}
                            </li>
                        ))}
                    </ul>
                )}

                {draft.length > 0 ? (
                    <ul className="attachment-list" aria-label="Archivos seleccionados">
                        {draft.map((file) => (
                            <li key={`${file.name}:${file.size}:${file.lastModified}`}>
                                <span>
                                    {file.name} ({formatFileSize(file.size)})
                                </span>
                                <button
                                    type="button"
                                    className="link-button"
                                    aria-label={`Quitar ${file.name}`}
                                    onClick={() =>
                                        setDraft((previous) => previous.filter((f) => f !== file))
                                    }
                                >
                                    Quitar
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="field-hint">Todavía no seleccionaste archivos.</p>
                )}
                <p className="field-hint" aria-live="polite">
                    {draft.length} de {maxCount} archivos · {formatFileSize(total)} de{' '}
                    {formatFileSize(MAX_TOTAL_BYTES)}
                </p>

                <div className="dialog-actions">
                    <button type="button" className="catalog-action-button" onClick={onCancel}>
                        Cancelar
                    </button>
                    <button
                        type="button"
                        className="catalog-action-button"
                        onClick={() => onConfirm(draft)}
                    >
                        Adjuntar ({draft.length})
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
