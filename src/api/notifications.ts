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
    return apiFetch<AttachmentUploadResponse>('/attachment-upload-completions', {
        method: 'POST',
        body: JSON.stringify({ uploadId }),
    });
}

export function getAttachmentUpload(uploadId: string): Promise<AttachmentUploadResponse> {
    return apiFetch<AttachmentUploadResponse>(
        `/attachment-uploads/status?uploadId=${encodeURIComponent(uploadId)}`,
    );
}

export function sendNotificationBatch(
    request: SendNotificationBatchRequest,
): Promise<BatchAcceptedResponse> {
    return apiFetch<BatchAcceptedResponse>('/notifications/batches', {
        method: 'POST',
        body: JSON.stringify(request),
    });
}

export function retryNotification(id: string): Promise<NotificationStatusResponse> {
    return apiFetch<NotificationStatusResponse>('/notification-retries', {
        method: 'POST',
        body: JSON.stringify({ notificationId: id }),
    });
}
