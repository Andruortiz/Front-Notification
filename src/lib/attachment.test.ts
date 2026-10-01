import { describe, expect, it } from 'vitest';
import {
    MAX_FILE_BYTES,
    MAX_FILES,
    MAX_TOTAL_BYTES,
    addAttachmentFiles,
    attachmentsFingerprint,
    contentTypeOf,
    formatFileSize,
    maxFileBytes,
    maxFileCount,
    validateAttachmentFile,
    validateAttachmentSet,
    type ChannelAttachmentRules,
} from './attachment';

function file(name: string, size = 10) {
    return new File([new Uint8Array(size)], name);
}

const channelRules: ChannelAttachmentRules = {
    maxItems: 2,
    contentTypes: ['application/pdf', 'image/png'],
    maxSizeBytes: 2048,
};

describe('contentTypeOf', () => {
    it.each([
        ['a.pdf', 'application/pdf'],
        ['A.PDF', 'application/pdf'],
        ['a.jpeg', 'image/jpeg'],
        ['a.csv', 'text/csv'],
        ['a.txt', 'text/plain'],
        ['a.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    ])('deduce el tipo de %s', (name, type) => {
        expect(contentTypeOf(file(name))).toBe(type);
    });

    it('devuelve nulo para extensiones desconocidas o ausentes', () => {
        expect(contentTypeOf(file('a.zip'))).toBeNull();
        expect(contentTypeOf(file('sin-extension'))).toBeNull();
    });

    it('ignora puntos y espacios finales del nombre', () => {
        expect(contentTypeOf(file('a.pdf. .'))).toBe('application/pdf');
    });
});

describe('validateAttachmentFile', () => {
    it('acepta un archivo válido', () => {
        expect(validateAttachmentFile(file('ok.pdf'), null)).toBeNull();
    });

    it.each(['virus.exe', 'run.BAT', 'x.ps1', 'x.exe.', 'x.js', 'app.jar'])(
        'rechaza la extensión prohibida de %s',
        (name) => {
            expect(validateAttachmentFile(file(name), null)).toMatch(/prohibido/);
        },
    );

    it('rechaza un tipo no admitido', () => {
        expect(validateAttachmentFile(file('a.zip'), null)).toMatch(/no permitido/);
    });

    it('rechaza archivos vacíos', () => {
        expect(validateAttachmentFile(file('a.pdf', 0), null)).toMatch(/vacío/);
    });

    it('rechaza archivos de más de 10 MB y acepta exactamente 10 MB', () => {
        expect(validateAttachmentFile(file('a.pdf', MAX_FILE_BYTES + 1), null)).toMatch(/máximo/);
        expect(validateAttachmentFile(file('a.pdf', MAX_FILE_BYTES), null)).toBeNull();
    });

    it.each(['a/b.pdf', 'a\\b.pdf', 'a\u0000.pdf', '..', '.'])(
        'rechaza el nombre inválido %j',
        (name) => {
            expect(validateAttachmentFile(file(name), null)).toMatch(/nombre/);
        },
    );

    it('rechaza nombres de más de 255 caracteres', () => {
        expect(validateAttachmentFile(file(`${'a'.repeat(252)}.pdf`), null)).toMatch(/255/);
    });

    it('aplica los tipos y el tamaño declarados por el canal', () => {
        expect(validateAttachmentFile(file('a.csv'), channelRules)).toMatch(/canal no admite/);
        expect(validateAttachmentFile(file('a.pdf', 2049), channelRules)).toMatch(/máximo/);
        expect(validateAttachmentFile(file('a.pdf', 2048), channelRules)).toBeNull();
    });
});

describe('límites del canal', () => {
    it('toma el menor entre el servicio y el canal', () => {
        expect(maxFileBytes(channelRules)).toBe(2048);
        expect(maxFileBytes({ ...channelRules, maxSizeBytes: null })).toBe(MAX_FILE_BYTES);
        expect(maxFileCount(channelRules)).toBe(2);
        expect(maxFileCount({ ...channelRules, maxItems: Infinity })).toBe(MAX_FILES);
        expect(maxFileCount(null)).toBe(MAX_FILES);
    });
});

describe('validateAttachmentSet', () => {
    it('rechaza más archivos que el máximo', () => {
        const files = Array.from({ length: 6 }, (_, index) => file(`${index}.pdf`));
        expect(validateAttachmentSet(files, null)).toMatch(/máximo 5/);
    });

    it('rechaza un total superior a 25 MB', () => {
        const files = [file('a.pdf', MAX_FILE_BYTES), file('b.pdf', MAX_FILE_BYTES)];
        expect(validateAttachmentSet(files, null)).toBeNull();
        files.push(file('c.pdf', MAX_FILE_BYTES));
        expect(validateAttachmentSet(files, null)).toMatch(/total/);
    });
});

describe('addAttachmentFiles', () => {
    it('agrega los válidos y reporta los rechazados con su motivo', () => {
        const result = addAttachmentFiles([], [file('a.pdf'), file('b.exe'), file('c.pdf')], null);

        expect(result.files.map((item) => item.name)).toEqual(['a.pdf', 'c.pdf']);
        expect(result.rejected.map((item) => item.name)).toEqual(['b.exe']);
        expect(result.rejected[0].reason).toMatch(/prohibido/);
    });

    it('no repite un archivo ya adjunto', () => {
        const original = file('a.pdf');

        const result = addAttachmentFiles([original], [original], null);

        expect(result.files).toEqual([original]);
        expect(result.rejected[0].reason).toBe('Ya está adjunto.');
    });

    it('detiene la selección en la cantidad máxima', () => {
        const result = addAttachmentFiles(
            [file('1.pdf')],
            [file('2.pdf'), file('3.pdf'), file('4.pdf')],
            channelRules,
        );

        expect(result.files).toHaveLength(2);
        expect(result.rejected).toHaveLength(2);
    });

    it('detiene la selección al superar el total de 25 MB', () => {
        const result = addAttachmentFiles(
            [file('a.pdf', MAX_FILE_BYTES), file('b.pdf', MAX_FILE_BYTES)],
            [file('c.pdf', MAX_FILE_BYTES)],
            null,
        );

        expect(result.files).toHaveLength(2);
        expect(result.rejected[0].reason).toMatch(/total/);
        expect(MAX_TOTAL_BYTES).toBe(25 * 1024 * 1024);
    });
});

describe('attachmentsFingerprint', () => {
    it('es indefinida sin archivos y cambia al cambiar el conjunto', () => {
        const a = file('a.pdf');
        const b = file('b.pdf');
        expect(attachmentsFingerprint([])).toBeUndefined();
        expect(attachmentsFingerprint([a])).not.toBe(attachmentsFingerprint([a, b]));
    });
});

describe('formatFileSize', () => {
    it('formatea bytes, KB y MB', () => {
        expect(formatFileSize(500)).toBe('500 B');
        expect(formatFileSize(1536)).toBe('1.5 KB');
        expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB');
    });
});
