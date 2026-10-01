import { validateAttachmentFile, validateAttachmentSet } from './attachment';
import type { ChannelRules } from './channelRules';
import type { RecipientEntry } from './recipients';

export interface SendDraft {
    channelType: string;
    address: string;
    subject: string;
    body: string;
    priority: 'LOW' | 'NORMAL' | 'HIGH';
}

export type SendDraftErrors = Partial<
    Record<'channelType' | 'address' | 'subject' | 'body', string>
>;

export function validateSendDraft(
    draft: SendDraft,
    rules: ChannelRules | undefined,
): SendDraftErrors {
    const errors: SendDraftErrors = {};

    if (!draft.channelType || !rules) {
        errors.channelType = 'Elegí un canal disponible.';
        return errors;
    }

    if (!rules.available) {
        errors.channelType = rules.unavailableReason ?? 'Este canal no está disponible.';
    }

    if (!draft.address.trim()) {
        errors.address = 'Escribí una dirección.';
    } else if (!rules.validateAddress(draft.address)) {
        errors.address = `Formato inválido para ${rules.addressLabel.toLowerCase()}.`;
    }

    if (
        rules.subject !== 'hidden' &&
        rules.subjectMax != null &&
        draft.subject.length > rules.subjectMax
    ) {
        errors.subject = `El asunto supera el máximo de ${rules.subjectMax} caracteres.`;
    }

    if (!draft.body.trim()) {
        errors.body = 'Escribí un mensaje.';
    } else if (rules.bodyMax != null && draft.body.length > rules.bodyMax) {
        errors.body = `El mensaje supera el máximo de ${rules.bodyMax} caracteres.`;
    }

    return errors;
}

export type BatchDraftErrors = Partial<Record<'channelType' | 'subject' | 'body', string>>;

export function validateBatchDraft(
    draft: { channelType: string; subject: string; body: string },
    rules: ChannelRules | undefined,
): BatchDraftErrors {
    const errors: BatchDraftErrors = {};

    if (!draft.channelType || !rules) {
        errors.channelType = 'Elegí un canal disponible.';
        return errors;
    }

    if (!rules.available) {
        errors.channelType = rules.unavailableReason ?? 'Este canal no está disponible.';
    }

    if (
        rules.subject !== 'hidden' &&
        rules.subjectMax != null &&
        draft.subject.length > rules.subjectMax
    ) {
        errors.subject = `El asunto supera el máximo de ${rules.subjectMax} caracteres.`;
    }

    if (!draft.body.trim()) {
        errors.body = 'Escribí un mensaje.';
    } else if (rules.bodyMax != null && draft.body.length > rules.bodyMax) {
        errors.body = `El mensaje supera el máximo de ${rules.bodyMax} caracteres.`;
    }

    return errors;
}

export function validateRecipientEntries(
    entries: RecipientEntry[],
    rules: ChannelRules,
): Record<number, string> {
    const errors: Record<number, string> = {};
    entries.forEach((entry, index) => {
        if (!rules.validateAddress(entry.address)) {
            errors[index] = `Formato inválido para ${rules.addressLabel.toLowerCase()}.`;
        }
    });
    return errors;
}

export function validateAttachments(files: File[], rules: ChannelRules | undefined): string | null {
    if (files.length === 0) {
        return null;
    }
    if (!rules?.attachments) {
        return 'Este canal no admite archivos adjuntos. Quitá los archivos o elegí otro canal.';
    }
    for (const file of files) {
        const fileError = validateAttachmentFile(file, rules.attachments);
        if (fileError) {
            return `${file.name}: ${fileError}`;
        }
    }
    return validateAttachmentSet(files, rules.attachments);
}
