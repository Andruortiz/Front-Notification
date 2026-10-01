import {
    completeAttachmentUpload,
    getAttachmentUpload,
    issueAttachmentUpload,
    type AttachmentRef,
} from '../api/notifications';
import { ApiError } from '../api/client';
import { contentTypeOf } from './attachment';

/** Hasta este tamaño el archivo viaja embebido en Base64 dentro del JSON de la notificación. */
export const EMBED_MAX_BYTES = 1024 * 1024;

const POLL_INTERVAL_MS = 1000;
const POLL_TIMEOUT_MS = 60_000;

export class AttachmentError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AttachmentError';
    }
}

function toBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () =>
            resolve(typeof reader.result === 'string' ? (reader.result.split(',')[1] ?? '') : '');
        reader.onerror = () => reject(new AttachmentError('No se pudo leer el archivo.'));
        reader.readAsDataURL(file);
    });
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function uploadToStorage(file: File): Promise<string> {
    const contentType = contentTypeOf(file);
    let uploadId: string;
    try {
        const ticket = await issueAttachmentUpload({
            fileName: file.name,
            contentType,
            sizeBytes: file.size,
        });
        uploadId = ticket.uploadId;

        // PUT directo al object storage: sin cabeceras del panel (tenant, JSON).
        const put = await fetch(ticket.uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': contentType },
            body: file,
        });
        if (!put.ok) {
            throw new AttachmentError('No se pudo subir el archivo al almacenamiento.');
        }

        await completeAttachmentUpload(uploadId);
    } catch (error) {
        if (error instanceof AttachmentError) {
            throw error;
        }
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
            throw new AttachmentError(error.serverMessage ?? 'El servidor rechazó el adjunto.');
        }
        throw new AttachmentError('No se pudo subir el adjunto. Revisá la conexión y reintentá.');
    }

    // El escaneo (antivirus y tipo real) es asíncrono: se espera a que quede limpio.
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    while (Date.now() < deadline) {
        let status;
        try {
            status = await getAttachmentUpload(uploadId);
        } catch {
            throw new AttachmentError('No se pudo consultar el estado del adjunto.');
        }
        if (status.status === 'CLEAN') {
            return uploadId;
        }
        if (status.status === 'REJECTED') {
            throw new AttachmentError(
                status.rejectionReason ??
                    'El adjunto fue rechazado en la verificación de seguridad.',
            );
        }
        await sleep(POLL_INTERVAL_MS);
    }
    throw new AttachmentError('El adjunto sigue en verificación. Reintentá en unos minutos.');
}

/** Devuelve los campos de adjunto que se agregan al cuerpo de `POST /notifications`. */
export async function prepareAttachment(file: File): Promise<AttachmentRef> {
    if (file.size <= EMBED_MAX_BYTES) {
        return {
            attachment: {
                fileName: file.name,
                contentType: contentTypeOf(file),
                contentBase64: await toBase64(file),
            },
        };
    }
    return { attachmentUploadId: await uploadToStorage(file) };
}
