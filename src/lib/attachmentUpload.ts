import {
    completeAttachmentUpload,
    getAttachmentUpload,
    issueAttachmentUpload,
} from '../api/notifications';
import { ApiError } from '../api/client';
import type { components } from '../api/schema';
import { EMBED_MAX_BYTES, contentTypeOf } from './attachment';

export type AttachmentPayload = components['schemas']['Attachment'];
type AttachmentUploadResponse = components['schemas']['AttachmentUploadResponse'];

export const SCAN_POLL_INTERVAL_MS = 1000;
export const SCAN_POLL_TIMEOUT_MS = 60_000;

export class AttachmentError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AttachmentError';
    }
}

const REJECTION_MESSAGES: Record<string, string> = {
    MALWARE: 'contiene software malicioso.',
    CONTENT_TYPE_MISMATCH: 'su contenido no coincide con su tipo de archivo.',
};

export const PREPARED_TTL_MS = 10 * 60_000;

const prepared = new WeakMap<File, { promise: Promise<AttachmentPayload>; at: number }>();

function toBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () =>
            resolve(typeof reader.result === 'string' ? (reader.result.split(',')[1] ?? '') : '');
        reader.onerror = () => reject(new AttachmentError(`No se pudo leer ${file.name}.`));
        reader.readAsDataURL(file);
    });
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function rejectionError(file: File, upload: AttachmentUploadResponse): AttachmentError {
    const reason = upload.rejectionReason ? REJECTION_MESSAGES[upload.rejectionReason] : undefined;
    return new AttachmentError(
        `${file.name} fue rechazado en la verificación de seguridad${reason ? `: ${reason}` : '.'}`,
    );
}

async function awaitCleanVerdict(
    file: File,
    uploadId: string,
    initial: AttachmentUploadResponse,
): Promise<void> {
    let upload = initial;
    const deadline = Date.now() + SCAN_POLL_TIMEOUT_MS;
    for (;;) {
        if (upload.state === 'CLEAN') {
            return;
        }
        if (upload.state === 'INFECTED') {
            throw rejectionError(file, upload);
        }
        if (Date.now() >= deadline) {
            throw new AttachmentError(
                `${file.name} sigue en verificación. Reintentá en unos minutos.`,
            );
        }
        await sleep(SCAN_POLL_INTERVAL_MS);
        try {
            upload = await getAttachmentUpload(uploadId);
        } catch {
            throw new AttachmentError(`No se pudo consultar el estado de ${file.name}.`);
        }
    }
}

async function uploadToStorage(file: File, contentType: string): Promise<AttachmentPayload> {
    let ticket: AttachmentUploadResponse;
    let completed: AttachmentUploadResponse;
    try {
        ticket = await issueAttachmentUpload({
            fileName: file.name,
            contentType,
            sizeBytes: file.size,
        });
        if (!ticket.uploadUrl) {
            throw new AttachmentError(`El servidor no devolvió dónde subir ${file.name}.`);
        }
        const put = await fetch(ticket.uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': contentType },
            body: file,
        });
        if (!put.ok) {
            throw new AttachmentError(`No se pudo subir ${file.name} al almacenamiento.`);
        }
        completed = await completeAttachmentUpload(ticket.uploadId);
    } catch (error) {
        if (error instanceof AttachmentError) {
            throw error;
        }
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
            throw new AttachmentError(
                error.serverMessage ?? `El servidor rechazó el adjunto ${file.name}.`,
            );
        }
        throw new AttachmentError(`No se pudo subir ${file.name}. Revisá la conexión y reintentá.`);
    }

    await awaitCleanVerdict(file, ticket.uploadId, completed);
    return {
        fileName: file.name,
        contentType,
        sizeBytes: file.size,
        url: ticket.uploadUrl,
    };
}

async function buildPayload(file: File): Promise<AttachmentPayload> {
    const contentType = contentTypeOf(file);
    if (!contentType) {
        throw new AttachmentError(`Tipo de archivo no permitido: ${file.name}.`);
    }
    if (file.size <= EMBED_MAX_BYTES) {
        return {
            fileName: file.name,
            contentType,
            sizeBytes: file.size,
            content: await toBase64(file),
        };
    }
    return uploadToStorage(file, contentType);
}

function prepareOne(file: File): Promise<AttachmentPayload> {
    const cached = prepared.get(file);
    if (cached && Date.now() - cached.at < PREPARED_TTL_MS) {
        return cached.promise;
    }
    const promise = buildPayload(file);
    const entry = { promise, at: Date.now() };
    prepared.set(file, entry);
    promise.catch(() => {
        if (prepared.get(file) === entry) {
            prepared.delete(file);
        }
    });
    return promise;
}

export async function prepareAttachments(files: File[]): Promise<AttachmentPayload[]> {
    return Promise.all(files.map(prepareOne));
}
