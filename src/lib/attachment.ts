export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export const ALLOWED_ATTACHMENT_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'docx', 'xlsx'];

export const ATTACHMENT_ACCEPT = ALLOWED_ATTACHMENT_EXTENSIONS.map((ext) => `.${ext}`).join(',');

export function validateAttachment(file: File): string | null {
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED_ATTACHMENT_EXTENSIONS.includes(extension)) {
        return 'Tipo de archivo no permitido. Permitidos: PDF, JPG, PNG, DOCX, XLSX.';
    }
    if (file.size === 0) {
        return 'El archivo está vacío.';
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
        return 'El archivo supera el máximo de 10 MB.';
    }
    return null;
}

export function attachmentFingerprint(file: File | null): string | undefined {
    return file ? `${file.name}:${file.size}:${file.lastModified}` : undefined;
}

const CONTENT_TYPES: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

export function contentTypeOf(file: File): string {
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    return CONTENT_TYPES[extension] ?? (file.type || 'application/octet-stream');
}

export function formatFileSize(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
