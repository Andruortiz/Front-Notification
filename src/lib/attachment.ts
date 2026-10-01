export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const EMBED_MAX_BYTES = 1024 * 1024;
export const MAX_FILES = 5;
export const MAX_TOTAL_BYTES = 25 * 1024 * 1024;
export const MAX_FILE_NAME_LENGTH = 255;

export interface ChannelAttachmentRules {
    maxItems: number;
    contentTypes: string[] | null;
    maxSizeBytes: number | null;
}

const CONTENT_TYPES: Record<string, string> = {
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    txt: 'text/plain',
    csv: 'text/csv',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

const FORBIDDEN_EXTENSIONS = [
    'exe',
    'msi',
    'bat',
    'cmd',
    'com',
    'scr',
    'pif',
    'vbs',
    'vbe',
    'js',
    'jse',
    'wsf',
    'wsh',
    'ps1',
    'hta',
    'cpl',
    'msc',
    'reg',
    'lnk',
    'jar',
    'dll',
    'sh',
    'apk',
    'app',
    'gadget',
    'msix',
    'war',
];

export const ATTACHMENT_ACCEPT = Object.keys(CONTENT_TYPES)
    .map((extension) => `.${extension}`)
    .join(',');

export const ATTACHMENT_TYPES_LABEL = 'PDF, PNG, JPG, TXT, CSV, DOCX o XLSX';

function extensionOf(fileName: string): string {
    const trimmed = fileName.replace(/[.\s]+$/, '');
    const index = trimmed.lastIndexOf('.');
    return index === -1 ? '' : trimmed.slice(index + 1).toLowerCase();
}

export function contentTypeOf(file: File): string | null {
    return CONTENT_TYPES[extensionOf(file.name)] ?? null;
}

export function attachmentFingerprint(file: File): string {
    return `${file.name}:${file.size}:${file.lastModified}`;
}

export function attachmentsFingerprint(files: File[]): string | undefined {
    return files.length > 0 ? files.map(attachmentFingerprint).join('|') : undefined;
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

function hasInvalidNameCharacters(fileName: string): boolean {
    return /[\\/]/.test(fileName) || [...fileName].some((char) => char.charCodeAt(0) < 32);
}

export function maxFileBytes(rules: ChannelAttachmentRules | null): number {
    return rules?.maxSizeBytes ? Math.min(MAX_FILE_BYTES, rules.maxSizeBytes) : MAX_FILE_BYTES;
}

export function maxFileCount(rules: ChannelAttachmentRules | null): number {
    return rules ? Math.min(MAX_FILES, rules.maxItems) : MAX_FILES;
}

export function validateAttachmentFile(
    file: File,
    rules: ChannelAttachmentRules | null,
): string | null {
    const name = file.name;
    if (name.length === 0 || name === '.' || name === '..' || hasInvalidNameCharacters(name)) {
        return 'El nombre del archivo no es válido.';
    }
    if (name.length > MAX_FILE_NAME_LENGTH) {
        return `El nombre supera los ${MAX_FILE_NAME_LENGTH} caracteres.`;
    }
    if (FORBIDDEN_EXTENSIONS.includes(extensionOf(name))) {
        return 'Este tipo de archivo está prohibido por seguridad.';
    }
    const contentType = contentTypeOf(file);
    if (!contentType) {
        return `Tipo de archivo no permitido. Permitidos: ${ATTACHMENT_TYPES_LABEL}.`;
    }
    if (rules?.contentTypes && !rules.contentTypes.includes(contentType)) {
        return 'Este canal no admite ese tipo de archivo.';
    }
    if (file.size === 0) {
        return 'El archivo está vacío.';
    }
    const limit = maxFileBytes(rules);
    if (file.size > limit) {
        return `El archivo supera el máximo de ${formatFileSize(limit)}.`;
    }
    return null;
}

export function validateAttachmentSet(
    files: File[],
    rules: ChannelAttachmentRules | null,
): string | null {
    const maxCount = maxFileCount(rules);
    if (files.length > maxCount) {
        return `Se admiten como máximo ${maxCount} archivos.`;
    }
    const total = files.reduce((sum, file) => sum + file.size, 0);
    if (total > MAX_TOTAL_BYTES) {
        return `El total de adjuntos supera ${formatFileSize(MAX_TOTAL_BYTES)}.`;
    }
    return null;
}

export interface RejectedFile {
    name: string;
    reason: string;
}

export interface AddFilesResult {
    files: File[];
    rejected: RejectedFile[];
}

export function addAttachmentFiles(
    current: File[],
    incoming: File[],
    rules: ChannelAttachmentRules | null,
): AddFilesResult {
    const files = [...current];
    const rejected: RejectedFile[] = [];
    const seen = new Set(current.map(attachmentFingerprint));
    const maxCount = maxFileCount(rules);
    let total = current.reduce((sum, file) => sum + file.size, 0);

    for (const file of incoming) {
        const fileError = validateAttachmentFile(file, rules);
        if (fileError) {
            rejected.push({ name: file.name, reason: fileError });
        } else if (seen.has(attachmentFingerprint(file))) {
            rejected.push({ name: file.name, reason: 'Ya está adjunto.' });
        } else if (files.length >= maxCount) {
            rejected.push({
                name: file.name,
                reason: `Se admiten como máximo ${maxCount} archivos.`,
            });
        } else if (total + file.size > MAX_TOTAL_BYTES) {
            rejected.push({
                name: file.name,
                reason: `Superaría el total de ${formatFileSize(MAX_TOTAL_BYTES)}.`,
            });
        } else {
            files.push(file);
            seen.add(attachmentFingerprint(file));
            total += file.size;
        }
    }
    return { files, rejected };
}
