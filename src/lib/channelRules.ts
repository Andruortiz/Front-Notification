import type { components } from '../api/schema';

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
}

type BaseRules = Omit<ChannelRules, 'available' | 'unavailableReason'>;

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
    };
}
