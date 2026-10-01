import { useCallback, useState } from 'react';
import { sendNotification, sendNotificationBatch, type AttachmentRef } from '../api/notifications';
import { AttachmentError, prepareAttachment } from '../lib/attachmentUpload';
import { ApiError } from '../api/client';
import type { components } from '../api/schema';

type Priority = components['schemas']['Priority'];
type SendNotificationRequest = components['schemas']['SendNotificationRequest'];

export type SendOutcomeStatus = 'ACCEPTED' | 'DUPLICATE' | 'REJECTED' | 'SIN_CONFIRMAR';

export interface SendOutcome {
    address: string;
    outcome: SendOutcomeStatus;
    notificationId: string | null;
    reason: string | null;
}

export interface BatchSendRow {
    externalId: string;
    recipientId: string;
    address: string;
    skip: boolean;
}

export interface BatchSendMeta {
    channelType: string;
    subject?: string;
    body: string;
    priority: Priority;
    attachment?: File | null;
}

const CHUNK_SIZE = 200;

function chunk<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
    }
    return chunks;
}

async function sendWithAttachment(
    row: BatchSendRow,
    meta: BatchSendMeta,
    attachment: AttachmentRef,
): Promise<SendOutcome> {
    try {
        const response = await sendNotification({
            externalId: row.externalId,
            channelType: meta.channelType,
            recipientId: row.recipientId,
            recipientAddress: row.address,
            subject: meta.subject,
            body: meta.body,
            priority: meta.priority,
            ...attachment,
        });
        return {
            address: row.address,
            outcome: response.duplicate ? 'DUPLICATE' : 'ACCEPTED',
            notificationId: response.notificationId ?? null,
            reason: null,
        };
    } catch (error) {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
            return {
                address: row.address,
                outcome: 'REJECTED',
                notificationId: null,
                reason: error.serverMessage ?? 'El servidor rechazó el envío.',
            };
        }
        return {
            address: row.address,
            outcome: 'SIN_CONFIRMAR',
            notificationId: null,
            reason: 'No se pudo confirmar: fallo de red o del servidor.',
        };
    }
}

export async function performBatchSend(
    rows: BatchSendRow[],
    meta: BatchSendMeta,
    onProgress?: (sent: number, total: number) => void,
): Promise<SendOutcome[]> {
    const results: SendOutcome[] = new Array<SendOutcome>(rows.length);

    rows.forEach((row, index) => {
        if (row.skip) {
            results[index] = {
                address: row.address,
                outcome: 'DUPLICATE',
                notificationId: null,
                reason: 'Misma dirección que otra fila; se envía una sola vez.',
            };
        }
    });

    const sendable = rows.map((row, index) => ({ row, index })).filter(({ row }) => !row.skip);
    let sentCount = 0;

    // Con adjunto se envía una notificación por destinatario. El adjunto se prepara una sola
    // vez: embebido en Base64 (hasta 1 MB) o subido al storage y referenciado por uploadId.
    if (meta.attachment) {
        let ref: AttachmentRef;
        try {
            ref = await prepareAttachment(meta.attachment);
        } catch (error) {
            const reason =
                error instanceof AttachmentError
                    ? error.message
                    : 'No se pudo preparar el adjunto.';
            for (const { row, index } of sendable) {
                results[index] = {
                    address: row.address,
                    outcome: 'REJECTED',
                    notificationId: null,
                    reason,
                };
            }
            onProgress?.(sendable.length, sendable.length);
            return results;
        }
        for (const { row, index } of sendable) {
            results[index] = await sendWithAttachment(row, meta, ref);
            sentCount += 1;
            onProgress?.(sentCount, sendable.length);
        }
        return results;
    }

    const groups = chunk(sendable, CHUNK_SIZE);

    for (const group of groups) {
        const items: SendNotificationRequest[] = group.map(({ row }) => ({
            externalId: row.externalId,
            channelType: meta.channelType,
            recipientId: row.recipientId,
            recipientAddress: row.address,
            subject: meta.subject,
            body: meta.body,
            priority: meta.priority,
        }));

        try {
            const response = await sendNotificationBatch({ items });
            const byExternalId = new Map((response.results ?? []).map((r) => [r.externalId, r]));
            group.forEach(({ row, index }) => {
                const result = byExternalId.get(row.externalId);
                results[index] = {
                    address: row.address,
                    outcome: (result?.outcome as SendOutcomeStatus | undefined) ?? 'SIN_CONFIRMAR',
                    notificationId: result?.notificationId ?? null,
                    reason:
                        result?.rejectionReason ??
                        (result ? null : 'No se recibió confirmación para este destinatario.'),
                };
            });
        } catch {
            group.forEach(({ row, index }) => {
                results[index] = {
                    address: row.address,
                    outcome: 'SIN_CONFIRMAR',
                    notificationId: null,
                    reason: 'No se pudo confirmar: fallo de red o del servidor.',
                };
            });
        }

        sentCount += group.length;
        onProgress?.(sentCount, sendable.length);
    }

    return results;
}

export function useSendBatch() {
    const [isSending, setIsSending] = useState(false);
    const [progress, setProgress] = useState<{ sent: number; total: number } | null>(null);

    const send = useCallback(async (rows: BatchSendRow[], meta: BatchSendMeta) => {
        setIsSending(true);
        setProgress({ sent: 0, total: rows.filter((row) => !row.skip).length });
        try {
            return await performBatchSend(rows, meta, (sent, total) =>
                setProgress({ sent, total }),
            );
        } finally {
            setIsSending(false);
        }
    }, []);

    return { send, isSending, progress };
}
