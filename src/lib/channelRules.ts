import type { components } from '../api/schema';
import type { ChannelAttachmentRules } from './attachment';

type ChannelItem = components['schemas']['ChannelItem'];

export type SubjectMode = 'hidden' | 'optional';

export interface ChannelRules {
    addressLabel: string;
    addressExample: string;
    validateAddress: (address: string) => boolean;
    subject: SubjectMode;
    subjectMax: number | null;
    bodyMax: number | null;
    available: boolean;
    unavailableReason: string | null;
    attachments: ChannelAttachmentRules | null;
}

type BaseRules = Omit<ChannelRules, 'available' | 'unavailableReason' | 'attachments'>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SMS_PATTERN = /^\+\d{6,15}$/;

const KNOWN_RULES: Record<string, BaseRules> = {
    EMAIL: {
        addressLabel: 'Correo electrónico',
        addressExample: 'alice@example.com',
        validateAddress: (address) => EMAIL_PATTERN.test(address.trim()),
        subject: 'optional',
        subjectMax: null,
        bodyMax: null,
    },
    SMS: {
        addressLabel: 'Número de teléfono',
        addressExample: '+573001234567',
        validateAddress: (address) => SMS_PATTERN.test(address.trim()),
        subject: 'hidden',
        subjectMax: null,
        bodyMax: 160,
    },
    PUSH: {
        addressLabel: 'Token del dispositivo',
        addressExample: 'device-token-demo-1234',
        validateAddress: (address) => address.trim().length > 0,
        subject: 'optional',
        subjectMax: 100,
        bodyMax: 900,
    },
};

const DEFAULT_RULES: BaseRules = {
    addressLabel: 'Dirección',
    addressExample: '',
    validateAddress: (address) => address.trim().length > 0,
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
            properties?: { attachments?: AttachmentsSchema };
        };
        const attachments = parsed.properties?.attachments;
        if (!attachments) {
            return null;
        }
        const contentTypes = attachments.items?.properties?.contentType?.enum;
        const maxSize = attachments.items?.properties?.sizeBytes?.maximum;
        return {
            maxItems: typeof attachments.maxItems === 'number' ? attachments.maxItems : Infinity,
            contentTypes: Array.isArray(contentTypes)
                ? contentTypes.filter((type): type is string => typeof type === 'string')
                : null,
            maxSizeBytes: typeof maxSize === 'number' ? maxSize : null,
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
