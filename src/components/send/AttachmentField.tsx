import { useState } from 'react';
import { formatFileSize, maxFileCount, type ChannelAttachmentRules } from '../../lib/attachment';
import AttachmentDialog from './AttachmentDialog';

interface AttachmentFieldProps {
    files: File[];
    rules: ChannelAttachmentRules | null;
    error?: string;
    disabled?: boolean;
    onChange: (files: File[]) => void;
}

export default function AttachmentField({
    files,
    rules,
    error,
    disabled = false,
    onChange,
}: AttachmentFieldProps) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const supported = rules !== null && maxFileCount(rules) > 0;

    return (
        <div className="form-field">
            <span id="send-attachment-label" className="form-label">
                Archivos adjuntos (opcional)
            </span>
            <div className="attachment-actions">
                <button
                    type="button"
                    className="catalog-action-button"
                    aria-describedby="send-attachment-hint"
                    disabled={disabled || !supported}
                    onClick={() => setDialogOpen(true)}
                >
                    {files.length > 0 ? 'Cambiar archivos' : 'Adjuntar archivos'}
                </button>
            </div>
            {files.length > 0 && (
                <ul className="attachment-list" aria-labelledby="send-attachment-label">
                    {files.map((file) => (
                        <li key={`${file.name}:${file.size}:${file.lastModified}`}>
                            <span>
                                {file.name} ({formatFileSize(file.size)})
                            </span>
                            <button
                                type="button"
                                className="link-button"
                                aria-label={`Quitar ${file.name}`}
                                disabled={disabled}
                                onClick={() => onChange(files.filter((f) => f !== file))}
                            >
                                Quitar
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            <p id="send-attachment-hint" className="field-hint">
                {supported
                    ? `Se abre una ventana para elegir hasta ${maxFileCount(rules)} archivos.`
                    : 'Este canal no admite archivos adjuntos.'}
            </p>
            {error && (
                <p className="field-error" role="alert">
                    {error}
                </p>
            )}
            {dialogOpen && supported && rules && (
                <AttachmentDialog
                    files={files}
                    rules={rules}
                    onConfirm={(selected) => {
                        onChange(selected);
                        setDialogOpen(false);
                    }}
                    onCancel={() => setDialogOpen(false)}
                />
            )}
        </div>
    );
}
