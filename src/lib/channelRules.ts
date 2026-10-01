import type { components } from '../api/schema';
import type { ChannelAttachmentRules } from './attachment';
import { validateEmail, validatePhoneNumber, validatePushToken } from './validators';

type ChannelItem = components['schemas']['ChannelItem'];

export type SubjectMode = 'hidden' | 'optional' | 'required';

export interface ChannelRules {
    addressLabel: string;
    addressExample: string;
    validateAddress: (address: string) => boolean;
    addressError: (address: string) => string | null;
    subject: SubjectMode;
    subjectMax: number | null;
    bodyMax: number | null;
    available: boolean;
    unavailableReason: string | null;
    attachments: ChannelAttachmentRules | null;
}

type BaseRules = Omit<ChannelRules, 'available' | 'unavailableReason' | 'attachments'>;

function addressRules(
    addressError: (address: string) => string | null,
): Pick<BaseRules, 'addressError' | 'validateAddress'> {
    return { addressError, validateAddress: (address) => addressError(address) === null };
}

const KNOWN_RULES: Record<string, BaseRules> = {
    EMAIL: {
        addressLabel: 'Correo electrónico',
        addressExample: 'alice@example.com',
        ...addressRules(validateEmail),
        subject: 'required',
        subjectMax: 255,
        bodyMax: null,
    },
    SMS: {
        addressLabel: 'Número de teléfono',
        addressExample: '+573001234567',
        ...addressRules(validatePhoneNumber),
        subject: 'hidden',
        subjectMax: null,
        bodyMax: 160,
    },
    PUSH: {
        addressLabel: 'Token del dispositivo',
        addressExample: 'device-token-demo-1234',
        ...addressRules(validatePushToken),
        subject: 'optional',
        subjectMax: 100,
        bodyMax: 900,
    },
};

const DEFAULT_RULES: BaseRules = {
    addressLabel: 'Dirección',
    addressExample: '',
    ...addressRules((address) => (address.trim().length > 0 ? null : 'Escribí una dirección.')),
    subject: 'optional',
    subjectMax: null,
    bodyMax: null,
};

function readMaxLength(contentSchema: string | null, property: string): number | null {
    if (!contentSchema) {
        return null;
    }
    try {
        const parsed = JSON.parse(contentSchema) as {
            properties?: Record<string, { maxLength?: unknown }>;
        };
        const maxLength = parsed.properties?.[property]?.maxLength;
        return typeof maxLength === 'number' ? maxLength : null;
    } catch {
        return null;
    }
}

interface AttachmentsSchema {
    maxItems?: unknown;
    items?: {
        properties?: {
            contentType?: { enum?: unknown };
            sizeBytes?: { maximum?: unknown };
        };
    };
}

export function readAttachmentRules(contentSchema: string | null): ChannelAttachmentRules | null {
    if (!contentSchema) {
        return null;
    }
    try {
        const parsed = JSON.parse(contentSchema) as {
            properties?: {
                attachments?: AttachmentsSchema;
                attachmentsTotalBytes?: { maximum?: unknown };
            };
        };
        const attachments = parsed.properties?.attachments;
        if (!attachments) {
            return null;
        }
        const contentTypes = attachments.items?.properties?.contentType?.enum;
        const maxTotal = parsed.properties?.attachmentsTotalBytes?.maximum;
        const maxSize = attachments.items?.properties?.sizeBytes?.maximum;
        return {
            maxItems: typeof attachments.maxItems === 'number' ? attachments.maxItems : Infinity,
            contentTypes: Array.isArray(contentTypes)
                ? contentTypes.filter((type): type is string => typeof type === 'string')
                : null,
            maxSizeBytes: typeof maxSize === 'number' ? maxSize : null,
            maxTotalBytes: typeof maxTotal === 'number' ? maxTotal : null,
        };
    } catch {
        return null;
    }
}

export function deriveChannelRules(channel: ChannelItem): ChannelRules {
    const base = KNOWN_RULES[channel.channelType] ?? DEFAULT_RULES;
    const enabledProvider = channel.providers.find((provider) => provider.status === 'ENABLED');
    const available = Boolean(enabledProvider);
    const unavailableReason = available
        ? null
        : (channel.providers[0]?.statusReason ?? 'Ningún proveedor disponible para este canal.');

    return {
        ...base,
        bodyMax: readMaxLength(channel.contentSchema, 'body') ?? base.bodyMax,
        subjectMax: readMaxLength(channel.contentSchema, 'subject') ?? base.subjectMax,
        available,
        unavailableReason,
        attachments: readAttachmentRules(channel.contentSchema),
    };
}
