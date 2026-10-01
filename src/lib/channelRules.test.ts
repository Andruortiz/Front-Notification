import { describe, expect, it } from 'vitest';
import { deriveChannelRules, readAttachmentRules } from './channelRules';
import type { components } from '../api/schema';

type ChannelItem = components['schemas']['ChannelItem'];

function channelItem(overrides: Partial<ChannelItem> = {}): ChannelItem {
    return {
        channelType: 'EMAIL',
        contentSchema: null,
        providers: [
            { providerId: 'simulated', preferenceOrder: 1, status: 'ENABLED', statusReason: null },
        ],
        ...overrides,
    };
}

describe('deriveChannelRules', () => {
    it('valida direcciones de correo y oculta límites para EMAIL', () => {
        const rules = deriveChannelRules(channelItem({ channelType: 'EMAIL' }));
        expect(rules.subject).toBe('required');
        expect(rules.validateAddress('alice@example.com')).toBe(true);
        expect(rules.validateAddress('no-es-correo')).toBe(false);
        expect(rules.available).toBe(true);
    });

    it('exige formato internacional y 160 caracteres para SMS', () => {
        const rules = deriveChannelRules(channelItem({ channelType: 'SMS' }));
        expect(rules.subject).toBe('hidden');
        expect(rules.bodyMax).toBe(160);
        expect(rules.validateAddress('+573001234567')).toBe(true);
        expect(rules.validateAddress('3001234567')).toBe(false);
    });

    it('acepta cualquier token no vacío y limita a 900 y 100 caracteres para PUSH', () => {
        const rules = deriveChannelRules(channelItem({ channelType: 'PUSH' }));
        expect(rules.bodyMax).toBe(900);
        expect(rules.subjectMax).toBe(100);
        expect(rules.validateAddress('device-token-demo-1234')).toBe(true);
        expect(rules.validateAddress('')).toBe(false);
    });

    it('degrada a lo mínimo para un canal desconocido', () => {
        const rules = deriveChannelRules(channelItem({ channelType: 'WHATSAPP' }));
        expect(rules.subject).toBe('optional');
        expect(rules.bodyMax).toBeNull();
        expect(rules.validateAddress('cualquier-cosa')).toBe(true);
        expect(rules.validateAddress('  ')).toBe(false);
    });

    it('marca el canal como no disponible cuando ningún proveedor está ENABLED', () => {
        const rules = deriveChannelRules(
            channelItem({
                channelType: 'EMAIL',
                providers: [
                    {
                        providerId: 'brevo',
                        preferenceOrder: 1,
                        status: 'DISABLED',
                        statusReason: 'falta credencial',
                    },
                ],
            }),
        );
        expect(rules.available).toBe(false);
        expect(rules.unavailableReason).toBe('falta credencial');
    });
});

describe('readAttachmentRules', () => {
    it('lee el total máximo declarado en attachmentsTotalBytes', () => {
        const schema = JSON.stringify({
            properties: {
                attachments: { type: 'array', maxItems: 5 },
                attachmentsTotalBytes: { type: 'integer', maximum: 4000000 },
            },
        });
        expect(readAttachmentRules(schema)?.maxTotalBytes).toBe(4000000);
    });

    it('devuelve nulo si el canal no declara adjuntos', () => {
        expect(readAttachmentRules(null)).toBeNull();
        expect(readAttachmentRules('{"properties":{"body":{"type":"string"}}}')).toBeNull();
        expect(readAttachmentRules('no es json')).toBeNull();
    });

    it('lee cantidad, tipos y tamaño máximo declarados', () => {
        const schema = JSON.stringify({
            properties: {
                attachments: {
                    type: 'array',
                    maxItems: 2,
                    items: {
                        properties: {
                            contentType: { enum: ['application/pdf', 'image/png'] },
                            sizeBytes: { maximum: 2048 },
                        },
                    },
                },
            },
        });

        expect(readAttachmentRules(schema)).toEqual({
            maxItems: 2,
            contentTypes: ['application/pdf', 'image/png'],
            maxSizeBytes: 2048,
            maxTotalBytes: null,
        });
    });

    it('sin tope declarado no limita tipos ni tamaño', () => {
        expect(readAttachmentRules('{"properties":{"attachments":{"type":"array"}}}')).toEqual({
            maxItems: Infinity,
            contentTypes: null,
            maxSizeBytes: null,
            maxTotalBytes: null,
        });
    });
});
