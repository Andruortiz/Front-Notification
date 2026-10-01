import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import * as api from '../api/notifications';
import {
    AttachmentError,
    PREPARED_TTL_MS,
    SCAN_POLL_INTERVAL_MS,
    SCAN_POLL_TIMEOUT_MS,
    prepareAttachments,
} from './attachmentUpload';

vi.mock('../api/notifications', () => ({
    issueAttachmentUpload: vi.fn(),
    completeAttachmentUpload: vi.fn(),
    getAttachmentUpload: vi.fn(),
}));

const issue = vi.mocked(api.issueAttachmentUpload);
const complete = vi.mocked(api.completeAttachmentUpload);
const poll = vi.mocked(api.getAttachmentUpload);

function upload(state: 'PENDING_SCAN' | 'CLEAN' | 'INFECTED', extra = {}) {
    return {
        uploadId: 'up-1',
        state,
        fileName: 'grande.pdf',
        contentType: 'application/pdf',
        sizeBytes: 1024 * 1024 + 1,
        ...extra,
    };
}

function bigFile(name = 'grande.pdf') {
    return new File([new Uint8Array(1024 * 1024 + 1)], name);
}

describe('prepareAttachments', () => {
    let put: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        issue.mockReset();
        complete.mockReset();
        poll.mockReset();
        put = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
        vi.stubGlobal('fetch', put);
        issue.mockResolvedValue(upload('PENDING_SCAN', { uploadUrl: 'https://minio.test/up-1' }));
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('embebe en Base64 los archivos de hasta 1 MB sin llamar a la API de subidas', async () => {
        const [payload] = await prepareAttachments([
            new File(['%PDF'], 'chico.pdf', { type: 'application/pdf' }),
        ]);

        expect(payload).toEqual({
            fileName: 'chico.pdf',
            contentType: 'application/pdf',
            sizeBytes: 4,
            content: btoa('%PDF'),
        });
        expect(issue).not.toHaveBeenCalled();
    });

    it('embebe un archivo de exactamente 1 MB y sube uno de 1 MB + 1 byte', async () => {
        complete.mockResolvedValue(upload('CLEAN'));

        const [exact] = await prepareAttachments([
            new File([new Uint8Array(1024 * 1024)], 'exacto.pdf'),
        ]);
        const [over] = await prepareAttachments([bigFile('mas.pdf')]);

        expect(exact.content).toBeDefined();
        expect(over.url).toBe('https://minio.test/up-1');
        expect(issue).toHaveBeenCalledTimes(1);
    });

    it('sube al almacenamiento sin cabeceras del panel, completa y devuelve la url', async () => {
        complete.mockResolvedValue(upload('CLEAN'));

        const [payload] = await prepareAttachments([bigFile()]);

        expect(issue).toHaveBeenCalledWith({
            fileName: 'grande.pdf',
            contentType: 'application/pdf',
            sizeBytes: 1024 * 1024 + 1,
        });
        const [putUrl, putInit] = put.mock.calls[0] as [string, RequestInit];
        expect(putUrl).toBe('https://minio.test/up-1');
        expect(putInit.method).toBe('PUT');
        expect(putInit.headers).toEqual({ 'Content-Type': 'application/pdf' });
        expect(putInit.body).toBeInstanceOf(File);
        expect(complete).toHaveBeenCalledWith('up-1');
        expect(payload).toEqual({
            fileName: 'grande.pdf',
            contentType: 'application/pdf',
            sizeBytes: 1024 * 1024 + 1,
            url: 'https://minio.test/up-1',
        });
        expect(payload.content).toBeUndefined();
    });

    it('sondea cada segundo hasta que el veredicto es CLEAN', async () => {
        vi.useFakeTimers({ toFake: ['setTimeout', 'Date'] });
        complete.mockResolvedValue(upload('PENDING_SCAN'));
        poll.mockResolvedValueOnce(upload('PENDING_SCAN')).mockResolvedValueOnce(upload('CLEAN'));

        const result = prepareAttachments([bigFile()]);
        await vi.advanceTimersByTimeAsync(SCAN_POLL_INTERVAL_MS * 2);

        await expect(result).resolves.toHaveLength(1);
        expect(poll).toHaveBeenCalledTimes(2);
    });

    it.each([
        ['MALWARE', /software malicioso/],
        ['CONTENT_TYPE_MISMATCH', /no coincide con su tipo/],
    ])('rechaza un archivo INFECTED por %s sin sondear', async (rejectionReason, message) => {
        complete.mockResolvedValue(upload('INFECTED', { rejectionReason }));

        await expect(prepareAttachments([bigFile()])).rejects.toThrow(message);
        expect(poll).not.toHaveBeenCalled();
    });

    it('falla con un mensaje claro si el veredicto no llega en 60 segundos', async () => {
        vi.useFakeTimers({ toFake: ['setTimeout', 'Date'] });
        complete.mockResolvedValue(upload('PENDING_SCAN'));
        poll.mockResolvedValue(upload('PENDING_SCAN'));

        const result = prepareAttachments([bigFile()]);
        const assertion = expect(result).rejects.toThrow(/sigue en verificación/);
        await vi.advanceTimersByTimeAsync(SCAN_POLL_TIMEOUT_MS + SCAN_POLL_INTERVAL_MS);

        await assertion;
    });

    it('traduce un rechazo 4xx del servidor al mensaje del backend', async () => {
        issue.mockRejectedValue(new ApiError(400, 'sizeBytes fuera de rango'));

        await expect(prepareAttachments([bigFile()])).rejects.toThrow('sizeBytes fuera de rango');
    });

    it('traduce una caída de red a un mensaje con el nombre del archivo', async () => {
        issue.mockRejectedValue(new TypeError('Failed to fetch'));

        await expect(prepareAttachments([bigFile()])).rejects.toThrow(
            /No se pudo subir grande\.pdf/,
        );
    });

    it('falla si el servidor no devuelve la uploadUrl', async () => {
        issue.mockResolvedValue(upload('PENDING_SCAN'));

        await expect(prepareAttachments([bigFile()])).rejects.toBeInstanceOf(AttachmentError);
        expect(put).not.toHaveBeenCalled();
    });

    it('falla si el almacenamiento responde con error', async () => {
        put.mockResolvedValue(new Response(null, { status: 403 }));

        await expect(prepareAttachments([bigFile()])).rejects.toThrow(/al almacenamiento/);
        expect(complete).not.toHaveBeenCalled();
    });

    it('reutiliza el archivo ya preparado en un segundo envío', async () => {
        complete.mockResolvedValue(upload('CLEAN'));
        const file = bigFile();

        await prepareAttachments([file]);
        await prepareAttachments([file]);

        expect(issue).toHaveBeenCalledTimes(1);
    });

    it('no reutiliza una preparación vencida', async () => {
        vi.useFakeTimers({ toFake: ['setTimeout', 'Date'] });
        complete.mockResolvedValue(upload('CLEAN'));
        const file = bigFile();

        await prepareAttachments([file]);
        vi.setSystemTime(Date.now() + PREPARED_TTL_MS + 1);
        await prepareAttachments([file]);

        expect(issue).toHaveBeenCalledTimes(2);
    });

    it('no memoriza un fallo: el siguiente intento vuelve a subir', async () => {
        complete.mockResolvedValue(upload('CLEAN'));
        put.mockResolvedValueOnce(new Response(null, { status: 500 }));
        const file = bigFile();

        await expect(prepareAttachments([file])).rejects.toBeInstanceOf(AttachmentError);
        await expect(prepareAttachments([file])).resolves.toHaveLength(1);
        expect(issue).toHaveBeenCalledTimes(2);
    });

    it('prepara varios archivos en el orden recibido', async () => {
        const payloads = await prepareAttachments([
            new File(['a'], 'a.pdf'),
            new File(['b'], 'b.txt'),
        ]);

        expect(payloads.map((item) => item.fileName)).toEqual(['a.pdf', 'b.txt']);
        expect(payloads[1].contentType).toBe('text/plain');
    });
});
