import { http, HttpResponse } from 'msw';
import type { components } from '../../api/schema';

type NotificationHistoryItem = components['schemas']['NotificationHistoryItem'];
type NotificationSearchResponse = components['schemas']['NotificationSearchResponse'];
type NotificationStatusResponse = components['schemas']['NotificationStatusResponse'];
type NotificationLiveUpdate = components['schemas']['NotificationLiveUpdate'];

export const notificationHistoryItem = (
    overrides: Partial<NotificationHistoryItem> = {},
): NotificationHistoryItem => ({
    notificationId: 'notif-1',
    externalId: 'order-1',
    recipientId: 'recipient-1',
    channelType: 'EMAIL',
    status: 'PENDING',
    acceptedAt: '2026-09-25T10:00:00Z',
    deliveryAttempts: [],
    ...overrides,
});

export const notificationStatusResponse = (
    overrides: Partial<NotificationStatusResponse> = {},
): NotificationStatusResponse => ({
    notificationId: 'notif-1',
    status: 'PENDING',
    channelType: 'EMAIL',
    providerId: null,
    lastUpdatedAt: '2026-09-25T10:00:00Z',
    ...overrides,
});

let currentSseController: ReadableStreamDefaultController<Uint8Array> | null = null;

const encoder = new TextEncoder();

function encodeSseEvent(update: NotificationLiveUpdate): Uint8Array {
    return encoder.encode(`event: update\ndata: ${JSON.stringify(update)}\n\n`);
}

/** Solo para pruebas: envía un evento `update` a la conexión SSE actualmente abierta. */
export function emitLiveUpdate(update: NotificationLiveUpdate): void {
    if (!currentSseController) {
        throw new Error('No hay ninguna conexion SSE abierta para emitir un evento de prueba');
    }
    currentSseController.enqueue(encodeSseEvent(update));
}

/** Solo para pruebas: cierra la conexión SSE actual, simulando una caída. */
export function closeLiveConnection(): void {
    currentSseController?.close();
    currentSseController = null;
}

export const handlers = [
    http.get('*/notifications', () => {
        const response: NotificationSearchResponse = {
            items: [notificationHistoryItem()],
            limit: 50,
            offset: 0,
            hasNext: false,
        };
        return HttpResponse.json(response);
    }),

    http.get('*/notifications/:id', ({ params }) => {
        const response = notificationStatusResponse({ notificationId: String(params.id) });
        return HttpResponse.json(response);
    }),

    http.get('*/notifications:subscribe', () => {
        const stream = new ReadableStream<Uint8Array>({
            start(controller) {
                currentSseController = controller;
            },
            cancel() {
                currentSseController = null;
            },
        });

        return new HttpResponse(stream, {
            headers: { 'Content-Type': 'text/event-stream' },
        });
    }),
];
