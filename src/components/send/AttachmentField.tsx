import { useRef } from 'react';
import { ATTACHMENT_ACCEPT, formatFileSize } from '../../lib/attachment';

interface AttachmentFieldProps {
    file: File | null;
    error?: string;
    channelType: string;
    onChange: (file: File | null) => void;
}

export default function AttachmentField({
    file,
    error,
    channelType,
    onChange,
}: AttachmentFieldProps) {
    const inputRef = useRef<HTMLInputElement | null>(null);

    function remove() {
        onChange(null);
        if (inputRef.current) {
            inputRef.current.value = '';
        }
    }

    return (
        <div className="form-field">
            <label htmlFor="send-attachment">Archivo adjunto (opcional)</label>
            <input
                id="send-attachment"
                ref={inputRef}
                type="file"
                accept={ATTACHMENT_ACCEPT}
                onChange={(event) => onChange(event.target.files?.[0] ?? null)}
                aria-invalid={error ? true : undefined}
                aria-describedby="send-attachment-hint"
            />
            {file && (
                <p className="field-hint">
                    {file.name} ({formatFileSize(file.size)}){' '}
                    <button type="button" className="catalog-action-button" onClick={remove}>
                        Quitar
                    </button>
                </p>
            )}
            <p id="send-attachment-hint" className="field-hint">
                PDF, JPG, PNG, DOCX o XLSX, hasta 10 MB. Los archivos de más de 1 MB se suben
                primero y pasan una verificación antes de enviar.
                {channelType && channelType !== 'EMAIL'
                    ? ' En este canal el archivo queda como registro interno y no se entrega al destinatario.'
                    : ''}
            </p>
            {error && <p className="field-error">{error}</p>}
        </div>
    );
}
