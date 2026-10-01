import { useMutation } from '@tanstack/react-query';
import { sendNotification } from '../api/notifications';
import { ApiError } from '../api/client';
import { AttachmentError, prepareAttachments } from '../lib/attachmentUpload';
import type { components } from '../api/schema';

type SendNotificationRequest = components['schemas']['SendNotificationRequest'];

export function useSendNotification() {
    return useMutation({
        mutationFn: async ({
            request,
            attachments,
        }: {
            request: SendNotificationRequest;
            attachments?: File[];
        }) => {
            if (!attachments || attachments.length === 0) {
                return sendNotification(request);
            }
            return sendNotification({
                ...request,
                attachments: await prepareAttachments(attachments),
            });
        },
    });
}

export function translateSendError(error: unknown): string {
    if (error instanceof AttachmentError) {
        return error.message;
    }
    if (error instanceof ApiError) {
        if (error.status === 400) {
            return error.serverMessage ?? 'La notificación fue rechazada por el servidor.';
        }
        if (error.status >= 500) {
            return 'Ocurrió un error en el servidor. El formulario conserva lo escrito; podés reintentar.';
        }
        return error.serverMessage ?? 'No se pudo enviar la notificación.';
    }
    return 'No hay conexión. Verificá en el listado si la notificación se envió antes de reintentar.';
}
