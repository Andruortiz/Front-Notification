import { describe, expect, it } from 'vitest';
import {
    validateAttachments,
    validateBatchDraft,
    validateRecipientEntries,
    validateSendDraft,
    type SendDraft,
} from './sendValidation';
import { deriveChannelRules, type ChannelRules } from './channelRules';
import { MAX_CONTENT_LENGTH } from './validators';
import { MAX_FILE_BYTES } from './attachment';
import type { RecipientEntry } from './recipients';
import type { components } from '../api/schema';

type ChannelItem = components['schemas']['ChannelItem'];

function channel(channelType: string, contentSchema: string | null = null): ChannelRules {
    const item: ChannelItem = {
        channelType,
        contentSchema,
        providers: [
            { providerId: 'simulated', preferenceOrder: 1, status: 'ENABLED', statusReason: null },
        ],
    };
    return deriveChannelRules(item);
}

const email = channel('EMAIL');
const sms = channel(
    'SMS',
    '{"type":"object","required":["body"],"properties":{"body":{"type":"string","maxLength":160}}}',
);
const push = channel(
    'PUSH',
    '{"type":"object","required":["body"],"properties":{"subject":{"maxLength":100},"body":{"type":"string","maxLength":900}}}',
);

function draft(overrides: Partial<SendDraft> = {}): SendDraft {
    return {
        channelType: 'EMAIL',
        address: 'alice@example.com',
        subject: 'Hola',
        body: 'Mensaje',
        priority: 'NORMAL',
        ...overrides,
    };
}

describe('validateSendDraft (EMAIL)', () => {
    it('acepta un borrador válido', () => {
        expect(validateSendDraft(draft(), email)).toEqual({});
    });

    it('exige elegir un canal', () => {
        expect(validateSendDraft(draft({ channelType: '' }), undefined).channelType).toMatch(
            /Elegí un canal/,
        );
    });

    it('informa un canal sin proveedor habilitado', () => {
        const unavailable: ChannelRules = {
            ...email,
            available: false,
            unavailableReason: 'Sin proveedor',
        };
        expect(validateSendDraft(draft(), unavailable).channelType).toBe('Sin proveedor');
    });

    it.each([
        ['', /Escribí un correo/],
        ['alice', /Falta el símbolo @/],
        ['alice@example', /debe incluir un punto/],
    ])('valida el correo %j', (address, message) => {
        expect(validateSendDraft(draft({ address }), email).address).toMatch(message);
    });

    it('exige el asunto, aunque solo tenga espacios', () => {
        expect(validateSendDraft(draft({ subject: '' }), email).subject).toBe('Escribí un asunto.');
        expect(validateSendDraft(draft({ subject: '   ' }), email).subject).toBe(
            'Escribí un asunto.',
        );
    });

    it('rechaza saltos de línea en el asunto', () => {
        expect(validateSendDraft(draft({ subject: 'Hola\nBcc: x@y.com' }), email).subject).toMatch(
            /saltos de línea/,
        );
    });

    it('limita el asunto a 255 caracteres', () => {
        expect(
            validateSendDraft(draft({ subject: 'a'.repeat(255) }), email).subject,
        ).toBeUndefined();
        expect(validateSendDraft(draft({ subject: 'a'.repeat(256) }), email).subject).toMatch(
            /máximo de 255/,
        );
    });

    it('exige un mensaje con contenido', () => {
        expect(validateSendDraft(draft({ body: '' }), email).body).toBe('Escribí un mensaje.');
        expect(validateSendDraft(draft({ body: '  \n ' }), email).body).toBe('Escribí un mensaje.');
    });

    it('permite saltos de línea en el mensaje pero no caracteres de control', () => {
        expect(validateSendDraft(draft({ body: 'a\n\nb\tc' }), email).body).toBeUndefined();
        expect(validateSendDraft(draft({ body: 'a\u0000b' }), email).body).toMatch(/control/);
    });

    it('limita asunto y mensaje juntos a 32.768 caracteres', () => {
        const subject = 'a'.repeat(100);
        expect(
            validateSendDraft(draft({ subject, body: 'b'.repeat(MAX_CONTENT_LENGTH - 100) }), email)
                .body,
        ).toBeUndefined();
        expect(
            validateSendDraft(draft({ subject, body: 'b'.repeat(MAX_CONTENT_LENGTH - 99) }), email)
                .body,
        ).toMatch(/juntos superan/);
    });
});

describe('validateSendDraft (SMS)', () => {
    const smsDraft = (overrides: Partial<SendDraft> = {}) =>
        draft({ channelType: 'SMS', address: '+573001234567', subject: '', ...overrides });

    it('acepta un SMS válido sin asunto', () => {
        expect(validateSendDraft(smsDraft(), sms)).toEqual({});
    });

    it('valida el formato E.164', () => {
        expect(validateSendDraft(smsDraft({ address: '3001234567' }), sms).address).toMatch(
            /empezar con \+/,
        );
        expect(validateSendDraft(smsDraft({ address: '+0573001234567' }), sms).address).toMatch(
            /no puede empezar con 0/,
        );
    });

    it('limita el mensaje a 160 caracteres', () => {
        expect(validateSendDraft(smsDraft({ body: 'a'.repeat(160) }), sms).body).toBeUndefined();
        expect(validateSendDraft(smsDraft({ body: 'a'.repeat(161) }), sms).body).toMatch(
            /máximo de 160/,
        );
    });

    it('no valida el asunto, que no se envía', () => {
        expect(
            validateSendDraft(smsDraft({ subject: 'x'.repeat(500) }), sms).subject,
        ).toBeUndefined();
    });
});

describe('validateSendDraft (PUSH)', () => {
    const pushDraft = (overrides: Partial<SendDraft> = {}) =>
        draft({
            channelType: 'PUSH',
            address: 'device-token-demo-1234',
            subject: '',
            ...overrides,
        });

    it('acepta una notificación sin título', () => {
        expect(validateSendDraft(pushDraft(), push)).toEqual({});
    });

    it('limita el título a 100 y el mensaje a 900', () => {
        expect(validateSendDraft(pushDraft({ subject: 'a'.repeat(101) }), push).subject).toMatch(
            /máximo de 100/,
        );
        expect(validateSendDraft(pushDraft({ body: 'a'.repeat(901) }), push).body).toMatch(
            /máximo de 900/,
        );
    });

    it('rechaza un token con espacios', () => {
        expect(validateSendDraft(pushDraft({ address: 'token malo' }), push).address).toMatch(
            /espacios/,
        );
    });
});

describe('validateBatchDraft', () => {
    it('aplica las mismas reglas de contenido que el envío individual', () => {
        expect(validateBatchDraft({ channelType: 'EMAIL', subject: '', body: 'x' }, email)).toEqual(
            {
                subject: 'Escribí un asunto.',
            },
        );
        expect(
            validateBatchDraft({ channelType: 'SMS', subject: '', body: 'a'.repeat(161) }, sms)
                .body,
        ).toMatch(/máximo de 160/);
        expect(validateBatchDraft({ channelType: '', subject: '', body: '' }, undefined)).toEqual({
            channelType: 'Elegí un canal disponible.',
        });
    });
});

describe('validateRecipientEntries', () => {
    const entry = (address: string): RecipientEntry => ({
        raw: address,
        address,
        recipientId: address,
        error: null,
        duplicateOf: null,
    });

    it('devuelve el motivo específico de cada fila inválida', () => {
        const errors = validateRecipientEntries(
            [entry('ok@example.com'), entry('malo'), entry('x@y')],
            email,
        );

        expect(errors[0]).toBeUndefined();
        expect(errors[1]).toMatch(/Falta el símbolo @/);
        expect(errors[2]).toMatch(/debe incluir un punto/);
    });
});

describe('validateAttachments', () => {
    const withAttachments = (): ChannelRules =>
        channel(
            'EMAIL',
            '{"properties":{"attachments":{"type":"array","maxItems":2,"items":{"properties":{"contentType":{"enum":["application/pdf"]},"sizeBytes":{"maximum":1000}}}}}}',
        );

    it('no exige nada sin archivos', () => {
        expect(validateAttachments([], email)).toBeNull();
    });

    it('rechaza adjuntos si el canal no los declara', () => {
        expect(validateAttachments([new File(['x'], 'a.pdf')], email)).toMatch(
            /no admite archivos adjuntos/,
        );
    });

    it('señala el archivo inválido por su nombre', () => {
        expect(validateAttachments([new File(['x'], 'virus.exe')], withAttachments())).toMatch(
            /^virus\.exe: .*prohibido/,
        );
    });

    it('aplica tipo, tamaño y cantidad del canal', () => {
        const rules = withAttachments();
        expect(validateAttachments([new File(['x'], 'a.png')], rules)).toMatch(/canal no admite/);
        expect(validateAttachments([new File([new Uint8Array(1001)], 'a.pdf')], rules)).toMatch(
            /máximo/,
        );
        expect(
            validateAttachments(
                [new File(['1'], 'a.pdf'), new File(['2'], 'b.pdf'), new File(['3'], 'c.pdf')],
                rules,
            ),
        ).toMatch(/máximo 2/);
        expect(validateAttachments([new File(['x'], 'a.pdf')], rules)).toBeNull();
        expect(MAX_FILE_BYTES).toBe(10 * 1024 * 1024);
    });
});
