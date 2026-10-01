import { validateAttachmentFile, validateAttachmentSet } from './attachment';
import { MAX_CONTENT_LENGTH, hasControlCharacters } from './validators';
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

interface ContentErrors {
    subject?: string;
    body?: string;
}

function validateContent(subject: string, body: string, rules: ChannelRules): ContentErrors {
    const errors: ContentErrors = {};
    const subjectSent = rules.subject !== 'hidden';

    if (subjectSent) {
        if (rules.subject === 'required' && !subject.trim()) {
            errors.subject = 'Escribí un asunto.';
        } else if (hasControlCharacters(subject)) {
            errors.subject = 'El asunto no puede tener saltos de línea ni caracteres de control.';
        } else if (rules.subjectMax != null && subject.length > rules.subjectMax) {
            errors.subject = `El asunto supera el máximo de ${rules.subjectMax} caracteres.`;
        }
    }

    if (!body.trim()) {
        errors.body = 'Escribí un mensaje.';
    } else if (hasControlCharacters(body, true)) {
        errors.body = 'El mensaje contiene caracteres de control no permitidos.';
    } else if (rules.bodyMax != null && body.length > rules.bodyMax) {
        errors.body = `El mensaje supera el máximo de ${rules.bodyMax} caracteres.`;
    } else {
        const sentLength = (subjectSent ? subject.trim().length : 0) + body.length;
        if (sentLength > MAX_CONTENT_LENGTH) {
            errors.body = `El asunto y el mensaje juntos superan los ${MAX_CONTENT_LENGTH.toLocaleString('es-CO')} caracteres.`;
        }
    }

    return errors;
}

function validateChannel(
    channelType: string,
    rules: ChannelRules | undefined,
): { rules: ChannelRules; error?: undefined } | { rules?: undefined; error: string } {
    if (!channelType || !rules) {
        return { error: 'Elegí un canal disponible.' };
    }
    return { rules };
}

export function validateSendDraft(
    draft: SendDraft,
    rules: ChannelRules | undefined,
): SendDraftErrors {
    const errors: SendDraftErrors = {};
    const channel = validateChannel(draft.channelType, rules);
    if (!channel.rules) {
        errors.channelType = channel.error;
        return errors;
    }

    if (!channel.rules.available) {
        errors.channelType = channel.rules.unavailableReason ?? 'Este canal no está disponible.';
    }

    const addressError = channel.rules.addressError(draft.address);
    if (addressError) {
        errors.address = addressError;
    }

    return { ...errors, ...validateContent(draft.subject, draft.body, channel.rules) };
}

export type BatchDraftErrors = Partial<Record<'channelType' | 'subject' | 'body', string>>;

export function validateBatchDraft(
    draft: { channelType: string; subject: string; body: string },
    rules: ChannelRules | undefined,
): BatchDraftErrors {
    const errors: BatchDraftErrors = {};
    const channel = validateChannel(draft.channelType, rules);
    if (!channel.rules) {
        errors.channelType = channel.error;
        return errors;
    }

    if (!channel.rules.available) {
        errors.channelType = channel.rules.unavailableReason ?? 'Este canal no está disponible.';
    }

    return { ...errors, ...validateContent(draft.subject, draft.body, channel.rules) };
}

export function validateRecipientEntries(
    entries: RecipientEntry[],
    rules: ChannelRules,
): Record<number, string> {
    const errors: Record<number, string> = {};
    entries.forEach((entry, index) => {
        const addressError = rules.addressError(entry.address);
        if (addressError) {
            errors[index] = addressError;
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
