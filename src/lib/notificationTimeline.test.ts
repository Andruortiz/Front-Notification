import { describe, expect, it } from 'vitest';
import {
    buildTimeline,
    elapsedMillis,
    formatAgo,
    formatDuration,
    summarizeProviders,
} from './notificationTimeline';

describe('buildTimeline', () => {
    it('ordena los intentos y calcula el tiempo entre pasos', () => {
        const steps = buildTimeline({
            status: 'DELIVERED',
            acceptedAt: '2026-09-25T10:00:00Z',
            lastUpdatedAt: '2026-09-25T10:00:40Z',
            attempts: [
                {
                    occurredOn: '2026-09-25T10:00:30Z',
                    result: 'ACCEPTED',
                    origin: 'AUTOMATIC',
                    providerId: 'brevo',
                },
                {
                    occurredOn: '2026-09-25T10:00:10Z',
                    result: 'RECOVERABLE_FAILURE',
                    origin: 'AUTOMATIC',
                    providerId: 'brevo',
                },
            ],
        });

        expect(steps.map((s) => s.title)).toEqual([
            'Aceptada por el servicio',
            'Intento 1 · Fallo recuperable',
            'Intento 2 · Aceptado por el proveedor',
            'Entregada',
        ]);
        expect(steps.map((s) => s.gapMs)).toEqual([undefined, 10000, 20000, 10000]);
    });

    it('agrega un paso de espera mientras la notificación no es terminal', () => {
        const steps = buildTimeline({
            status: 'RECOVERABLE',
            acceptedAt: '2026-09-25T10:00:00Z',
            attempts: [],
        });

        expect(steps[steps.length - 1]).toMatchObject({
            title: 'Esperando el próximo reintento',
            waiting: true,
        });
    });

    it('omite el paso de aceptación cuando no se conoce la fecha', () => {
        const steps = buildTimeline({ status: 'FAILED', attempts: [] });

        expect(steps).toEqual([]);
    });
});

describe('summarizeProviders', () => {
    it('separa los proveedores que fallaron del que entregó', () => {
        const summary = summarizeProviders([
            {
                occurredOn: '2026-09-25T10:00:00Z',
                result: 'RECOVERABLE_FAILURE',
                origin: 'AUTOMATIC',
                providerId: 'a',
            },
            {
                occurredOn: '2026-09-25T10:00:10Z',
                result: 'PERMANENT_FAILURE',
                origin: 'AUTOMATIC',
                providerId: 'a',
            },
            {
                occurredOn: '2026-09-25T10:00:20Z',
                result: 'ACCEPTED',
                origin: 'AUTOMATIC',
                providerId: 'b',
            },
        ]);

        expect(summary).toEqual({ failed: ['a'], deliveredBy: 'b' });
    });
});

describe('elapsedMillis', () => {
    const base = {
        acceptedAt: '2026-09-25T10:00:00Z',
        lastUpdatedAt: '2026-09-25T10:01:00Z',
        now: new Date('2026-09-25T10:05:00Z').getTime(),
    };

    it('usa la última actualización en estados terminales', () => {
        expect(elapsedMillis({ ...base, status: 'DELIVERED' })).toBe(60000);
    });

    it('usa el instante actual en estados no terminales', () => {
        expect(elapsedMillis({ ...base, status: 'PENDING' })).toBe(300000);
    });

    it('devuelve undefined sin fecha de aceptación', () => {
        expect(elapsedMillis({ now: base.now, status: 'PENDING' })).toBeUndefined();
    });
});

describe('formatDuration y formatAgo', () => {
    it('formatea segundos, minutos y horas', () => {
        expect(formatDuration(12000)).toBe('12 s');
        expect(formatDuration(125000)).toBe('2 min 5 s');
        expect(formatDuration(3720000)).toBe('1 h 2 min');
    });

    it('formatea la antigüedad', () => {
        expect(formatAgo(1000)).toBe('ahora');
        expect(formatAgo(30000)).toBe('hace 30 s');
        expect(formatAgo(180000)).toBe('hace 3 min');
    });
});
