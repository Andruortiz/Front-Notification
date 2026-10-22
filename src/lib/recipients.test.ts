import { describe, expect, it } from 'vitest';
import { parseRecipients, MAX_RECIPIENTS } from './recipients';

describe('parseRecipients', () => {
    it('separa por salto de línea, coma y punto y coma', () => {
        const { entries } = parseRecipients(
            'alice@example.com\nbob@example.com,carol@example.com;dave@example.com',
            'EMAIL',
        );
        expect(entries.map((e) => e.address)).toEqual([
            'alice@example.com',
            'bob@example.com',
            'carol@example.com',
            'dave@example.com',
        ]);
    });

    it('normaliza por canal: minúsculas para correo, sin separadores para teléfono', () => {
        const email = parseRecipients('Alice@Example.com', 'EMAIL');
        expect(email.entries[0].address).toBe('alice@example.com');

        const sms = parseRecipients('+57 (300) 123-4567', 'SMS');
        expect(sms.entries[0].address).toBe('+573001234567');
    });

    it('marca las direcciones repetidas con duplicateOf apuntando a la primera aparición', () => {
        const { entries } = parseRecipients('alice@example.com\nALICE@example.com', 'EMAIL');
        expect(entries[0].duplicateOf).toBeNull();
        expect(entries[1].duplicateOf).toBe(0);
    });

    it('bloquea con el conteo y el máximo al superar 1000 sin procesar', () => {
        const text = Array.from({ length: MAX_RECIPIENTS + 1 }, (_, i) => `a${i}@example.com`).join(
            '\n',
        );
        const result = parseRecipients(text, 'EMAIL');
        expect(result.exceedsMax).toBe(true);
        expect(result.totalCount).toBe(MAX_RECIPIENTS + 1);
        expect(result.entries).toHaveLength(0);
    });

    it('ignora líneas vacías', () => {
        const { entries, totalCount } = parseRecipients(
            'alice@example.com\n\n\nbob@example.com',
            'EMAIL',
        );
        expect(totalCount).toBe(2);
        expect(entries).toHaveLength(2);
    });
});
