import type { components } from '../api/schema';

export type DeliveryAttempt = components['schemas']['DeliveryAttempt'];

export type Tone = 'info' | 'success' | 'warning' | 'failure' | 'idle';

export interface TimelineStep {
    key: string;
    tone: Tone;
    marker: string;
    title: string;
    at?: string;
    gapMs?: number;
    providerId?: string;
    origin?: DeliveryAttempt['origin'];
    waiting?: boolean;
}

export interface ProviderSummary {
    failed: string[];
    deliveredBy?: string;
}

const TERMINAL_STATUSES = new Set(['DELIVERED', 'FAILED', 'DISCARDED']);

const ATTEMPT_RESULTS: Record<NonNullable<DeliveryAttempt['result']>, [Tone, string, string]> = {
    ACCEPTED: ['success', '✓', 'Aceptado por el proveedor'],
    RECOVERABLE_FAILURE: ['warning', '!', 'Fallo recuperable'],
    PERMANENT_FAILURE: ['failure', '✕', 'Fallo permanente'],
};

const WAITING_TITLES: Record<string, string> = {
    PENDING: 'Esperando proveedor',
    IN_PROCESS: 'Enviándose al proveedor',
    RECOVERABLE: 'Esperando el próximo reintento',
};

export const STATUS_TONES: Record<string, Tone> = {
    DELIVERED: 'success',
    FAILED: 'failure',
    RECOVERABLE: 'warning',
    PENDING: 'info',
    IN_PROCESS: 'info',
    DISCARDED: 'idle',
};

export const STATUS_MARKERS: Record<string, string> = {
    DELIVERED: '✓',
    FAILED: '✕',
    RECOVERABLE: '↻',
    PENDING: '…',
    IN_PROCESS: '→',
    DISCARDED: '–',
};

export const STATUS_EXPLANATIONS: Record<string, string> = {
    DELIVERED: 'El proveedor aceptó el mensaje. No se requiere ninguna acción.',
    FAILED: 'Fallo permanente: el sistema no volverá a intentarlo solo. Puedes reintentar manualmente tras corregir la causa.',
    RECOVERABLE:
        'Falló de forma transitoria. El sistema la reencolará automáticamente; también puedes reintentar ahora.',
    PENDING: 'En cola, esperando que un proveedor la tome.',
    IN_PROCESS: 'Un proveedor está procesando el envío en este momento.',
    DISCARDED: 'La notificación fue descartada y no se enviará.',
};

function toMillis(value?: string): number | undefined {
    if (!value) {
        return undefined;
    }
    const millis = new Date(value).getTime();
    return Number.isNaN(millis) ? undefined : millis;
}

function gapBetween(from?: string, to?: string): number | undefined {
    const start = toMillis(from);
    const end = toMillis(to);
    if (start === undefined || end === undefined) {
        return undefined;
    }
    return Math.max(0, end - start);
}

export function sortAttempts(attempts: DeliveryAttempt[]): DeliveryAttempt[] {
    return [...attempts].sort(
        (a, b) => (toMillis(a.occurredOn) ?? 0) - (toMillis(b.occurredOn) ?? 0),
    );
}

export function buildTimeline(input: {
    status?: string;
    acceptedAt?: string;
    lastUpdatedAt?: string;
    attempts: DeliveryAttempt[];
}): TimelineStep[] {
    const steps: TimelineStep[] = [];
    let previous = input.acceptedAt;

    if (input.acceptedAt) {
        steps.push({
            key: 'accepted',
            tone: 'info',
            marker: '+',
            title: 'Aceptada por el servicio',
            at: input.acceptedAt,
        });
    }

    sortAttempts(input.attempts).forEach((attempt, index) => {
        const [tone, marker, label] = attempt.result
            ? ATTEMPT_RESULTS[attempt.result]
            : (['idle', '·', 'Sin resultado'] as [Tone, string, string]);
        steps.push({
            key: `attempt-${index}-${attempt.occurredOn ?? ''}`,
            tone,
            marker,
            title: `Intento ${index + 1} · ${label}`,
            at: attempt.occurredOn,
            gapMs: gapBetween(previous, attempt.occurredOn),
            providerId: attempt.providerId,
            origin: attempt.origin,
        });
        previous = attempt.occurredOn ?? previous;
    });

    if (input.status === 'DELIVERED') {
        steps.push({
            key: 'delivered',
            tone: 'success',
            marker: '✓',
            title: 'Entregada',
            at: input.lastUpdatedAt,
            gapMs: gapBetween(previous, input.lastUpdatedAt),
        });
    } else if (input.status === 'DISCARDED') {
        steps.push({
            key: 'discarded',
            tone: 'idle',
            marker: '–',
            title: 'Descartada',
            at: input.lastUpdatedAt,
            gapMs: gapBetween(previous, input.lastUpdatedAt),
        });
    } else if (input.status && WAITING_TITLES[input.status]) {
        steps.push({
            key: 'waiting',
            tone: 'idle',
            marker: '…',
            title: WAITING_TITLES[input.status],
            waiting: true,
        });
    }

    return steps;
}

export function summarizeProviders(attempts: DeliveryAttempt[]): ProviderSummary {
    const failed: string[] = [];
    let deliveredBy: string | undefined;
    sortAttempts(attempts).forEach((attempt) => {
        if (!attempt.providerId) {
            return;
        }
        if (attempt.result === 'ACCEPTED') {
            deliveredBy = attempt.providerId;
        } else if (attempt.result && !failed.includes(attempt.providerId)) {
            failed.push(attempt.providerId);
        }
    });
    return { failed, deliveredBy };
}

export function elapsedMillis(input: {
    status?: string;
    acceptedAt?: string;
    lastUpdatedAt?: string;
    now: number;
}): number | undefined {
    const accepted = toMillis(input.acceptedAt);
    if (accepted === undefined) {
        return undefined;
    }
    const end =
        input.status && TERMINAL_STATUSES.has(input.status)
            ? (toMillis(input.lastUpdatedAt) ?? input.now)
            : input.now;
    return Math.max(0, end - accepted);
}

export function isTerminal(status?: string): boolean {
    return Boolean(status && TERMINAL_STATUSES.has(status));
}

export function formatDuration(millis: number): string {
    const totalSeconds = Math.max(0, Math.round(millis / 1000));
    if (totalSeconds < 60) {
        return `${totalSeconds} s`;
    }
    const totalMinutes = Math.floor(totalSeconds / 60);
    if (totalMinutes < 60) {
        return `${totalMinutes} min ${totalSeconds % 60} s`;
    }
    const hours = Math.floor(totalMinutes / 60);
    return `${hours} h ${totalMinutes % 60} min`;
}

export function formatAgo(millis: number): string {
    const seconds = Math.max(0, Math.round(millis / 1000));
    if (seconds < 5) {
        return 'ahora';
    }
    if (seconds < 60) {
        return `hace ${seconds} s`;
    }
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
        return `hace ${minutes} min`;
    }
    return `hace ${Math.floor(minutes / 60)} h`;
}
