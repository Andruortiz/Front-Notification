import { useMutation, useQueryClient } from '@tanstack/react-query';
import { retryNotification } from '../api/notifications';
import { ApiError } from '../api/client';

export function useRetryNotification(id: string | undefined) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => {
            if (!id) {
                throw new Error('Falta el id de la notificación.');
            }
            return retryNotification(id);
        },
        onSuccess: (data) => {
            if (id) {
                queryClient.setQueryData(['notification', id], data);
            }
        },
    });
}

export function translateRetryError(error: unknown): string {
    if (error instanceof ApiError) {
        if (error.status === 404) {
            return 'La notificación ya no existe para este cliente.';
        }
        if (error.status === 400) {
            return error.serverMessage ?? 'El estado actual no admite reintento.';
        }
        return error.serverMessage ?? 'No se pudo reintentar la notificación.';
    }
    return 'No hay conexión. Intentá de nuevo en un momento.';
}
