import { describe, expect, it } from 'vitest';
import { validateSendDraft, validateRecipientEntries, type SendDraft } from './sendValidation';
import type { ChannelRules } from './channelRules';
import type { RecipientEntry } from './recipients';

const emailRules: ChannelRules = {
    addressLabel: 'Correo electrónico',
    addressExample: 'alice@example.com',
    validateAddress: (address) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address.trim()),
    subject: 'optional',
    subjectMax: null,
    bodyMax: 20,
    available: true,
    unavailableReason: null,
};

function draft(overrides: Partial<SendDraft> = {}): SendDraft {
    return {
        channelType: 'EMAIL',
        address: 'alice@example.com',
        subject: 'Hola',
        body: 'Mensaje corto',
        priority: 'NORMAL',
        ...overrides,
    };
}

describe('validateSendDraft', () => {
    it('acepta un SendDraft válido', () => {
        expect(validateSendDraft(draft(), emailRules)).toEqual({});
    });

    it('rechaza una dirección con formato inválido para el canal', () => {
        const errors = validateSendDraft(draft({ address: 'no-es-correo' }), emailRules);
        expect(errors.address).toBeDefined();
    });

    it('rechaza un mensaje que supera el límite del canal', () => {
        const errors = validateSendDraft(
            draft({ body: 'este mensaje es demasiado largo para el límite' }),
            emailRules,
        );
        expect(errors.body).toBeDefined();
    });

    it('rechaza campos vacíos', () => {
        const errors = validateSendDraft(draft({ address: '', body: '' }), emailRules);
        expect(errors.address).toBeDefined();
        expect(errors.body).toBeDefined();
    });
});

describe('validateRecipientEntries', () => {
    function entry(overrides: Partial<RecipientEntry> = {}): RecipientEntry {
        return {
            raw: 'alice@example.com',
            address: 'alice@example.com',
            recipientId: 'alice@example.com',
            error: null,
            duplicateOf: null,
            ...overrides,
        };
    }

    it('marca las filas con formato inválido y no las válidas', () => {
        const errors = validateRecipientEntries(
            [entry(), entry({ raw: 'no-es-correo', address: 'no-es-correo' })],
            emailRules,
        );
        expect(errors[0]).toBeUndefined();
        expect(errors[1]).toBeDefined();
    });
});
