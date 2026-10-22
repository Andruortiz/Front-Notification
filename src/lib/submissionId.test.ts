import { describe, expect, it } from 'vitest';
import {
    createSubmissionId,
    refreshSubmissionId,
    type SubmissionFingerprintInput,
} from './submissionId';

function input(overrides: Partial<SubmissionFingerprintInput> = {}): SubmissionFingerprintInput {
    return {
        channelType: 'EMAIL',
        recipients: ['alice@example.com'],
        subject: 'Hola',
        body: 'Mensaje',
        priority: 'NORMAL',
        ...overrides,
    };
}

describe('submissionId', () => {
    it('mantiene el mismo id si la huella no cambia', () => {
        const first = createSubmissionId(input());
        const second = refreshSubmissionId(first, input());
        expect(second.id).toBe(first.id);
    });

    it('genera un id nuevo si cambia cualquier campo del contenido', () => {
        const first = createSubmissionId(input());
        const second = refreshSubmissionId(first, input({ body: 'Otro mensaje' }));
        expect(second.id).not.toBe(first.id);
    });

    it('genera un id nuevo si cambian los destinatarios', () => {
        const first = createSubmissionId(input());
        const second = refreshSubmissionId(first, input({ recipients: ['bob@example.com'] }));
        expect(second.id).not.toBe(first.id);
    });

    it('createSubmissionId siempre produce un id nuevo, sin comparar con nada', () => {
        const first = createSubmissionId(input());
        const second = createSubmissionId(input());
        expect(second.id).not.toBe(first.id);
    });

    it('refreshSubmissionId sin id previo genera uno nuevo', () => {
        const result = refreshSubmissionId(null, input());
        expect(result.id).toMatch(/^panel-/);
    });
});
