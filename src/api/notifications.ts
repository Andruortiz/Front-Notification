import { apiFetch } from '../api/client';
import type { components } from './schema';

type SendNotificationRequest = components['schemas']['SendNotificationRequest'];
type SendNotificationResponse = components['schemas']['SendNotificationResponse'];
type SendNotificationBatchRequest = components['schemas']['SendNotificationBatchRequest'];
type BatchAcceptedResponse = components['schemas']['BatchAcceptedResponse'];
type NotificationStatusResponse = components['schemas']['NotificationStatusResponse'];

/** Campos de adjunto: contenido embebido (hasta 1 MB) o referencia a una subida ya verificada. */
export interface AttachmentRef {
    attachment?: { fileName: string; contentType: string; contentBase64: string };
    attachmentUploadId?: string;
}

export function sendNotification(
    request: SendNotificationRequest & AttachmentRef,
): Promise<SendNotificationResponse> {
    return apiFetch<SendNotificationResponse>('/notifications', {
        method: 'POST',
        body: JSON.stringify(request),
    });
}

export interface AttachmentUploadTicket {
    uploadId: string;
    uploadUrl: string;
}

export interface AttachmentUploadStatus {
    uploadId: string;
    status: string;
    rejectionReason?: string | null;
}

export function issueAttachmentUpload(request: {
    fileName: string;
    contentType: string;
    sizeBytes: number;
}): Promise<AttachmentUploadTicket> {
    return apiFetch<AttachmentUploadTicket>('/attachment-uploads', {
        method: 'POST',
        body: JSON.stringify(request),
    });
}

export function completeAttachmentUpload(uploadId: string): Promise<AttachmentUploadStatus> {
    return apiFetch<AttachmentUploadStatus>(
        `/attachment-uploads/${encodeURIComponent(uploadId)}:complete`,
        { method: 'POST' },
    );
}

export function getAttachmentUpload(uploadId: string): Promise<AttachmentUploadStatus> {
    return apiFetch<AttachmentUploadStatus>(`/attachment-uploads/${encodeURIComponent(uploadId)}`);
}

export function sendNotificationBatch(
    request: SendNotificationBatchRequest,
): Promise<BatchAcceptedResponse> {
    return apiFetch<BatchAcceptedResponse>('/notifications:sendBatch', {
        method: 'POST',
        body: JSON.stringify(request),
    });
}

export function retryNotification(id: string): Promise<NotificationStatusResponse> {
    return apiFetch<NotificationStatusResponse>(`/notifications/${encodeURIComponent(id)}:retry`, {
        method: 'POST',
    });
}
