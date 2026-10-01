import { apiFetch } from '../api/client';
import type { components } from './schema';

type SendNotificationRequest = components['schemas']['SendNotificationRequest'];
type SendNotificationResponse = components['schemas']['SendNotificationResponse'];
type SendNotificationBatchRequest = components['schemas']['SendNotificationBatchRequest'];
type BatchAcceptedResponse = components['schemas']['BatchAcceptedResponse'];
type NotificationStatusResponse = components['schemas']['NotificationStatusResponse'];
type AttachmentUploadResponse = components['schemas']['AttachmentUploadResponse'];
type IssueAttachmentUploadRequest = components['schemas']['IssueAttachmentUploadRequest'];

export function sendNotification(
    request: SendNotificationRequest,
): Promise<SendNotificationResponse> {
    return apiFetch<SendNotificationResponse>('/notifications', {
        method: 'POST',
        body: JSON.stringify(request),
    });
}

export function issueAttachmentUpload(
    request: IssueAttachmentUploadRequest,
): Promise<AttachmentUploadResponse> {
    return apiFetch<AttachmentUploadResponse>('/attachment-uploads', {
        method: 'POST',
        body: JSON.stringify(request),
    });
}

export function completeAttachmentUpload(uploadId: string): Promise<AttachmentUploadResponse> {
    return apiFetch<AttachmentUploadResponse>(
        `/attachment-uploads/${encodeURIComponent(uploadId)}:complete`,
        { method: 'POST' },
    );
}

export function getAttachmentUpload(uploadId: string): Promise<AttachmentUploadResponse> {
    return apiFetch<AttachmentUploadResponse>(
        `/attachment-uploads/${encodeURIComponent(uploadId)}`,
    );
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
