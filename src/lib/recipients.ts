export interface RecipientEntry {
    raw: string;
    address: string;
    recipientId: string;
    error: string | null;
    duplicateOf: number | null;
}

export interface ParseRecipientsResult {
    entries: RecipientEntry[];
    totalCount: number;
    exceedsMax: boolean;
}

export const MAX_RECIPIENTS = 1000;

export function normalizeAddress(channelType: string, address: string): string {
    const trimmed = address.trim();
    switch (channelType) {
        case 'EMAIL':
            return trimmed.toLowerCase();
        case 'SMS':
            return trimmed.replace(/[\s().-]/g, '');
        default:
            return trimmed;
    }
}

export function parseRecipients(text: string, channelType: string): ParseRecipientsResult {
    const tokens = text
        .split(/[\n,;]+/)
        .map((token) => token.trim())
        .filter((token) => token.length > 0);

    const totalCount = tokens.length;
    const exceedsMax = totalCount > MAX_RECIPIENTS;
    if (exceedsMax) {
        return { entries: [], totalCount, exceedsMax };
    }

    const firstSeenAt = new Map<string, number>();
    const entries: RecipientEntry[] = tokens.map((raw, index) => {
        const address = normalizeAddress(channelType, raw);
        const existingIndex = firstSeenAt.get(address);
        if (existingIndex === undefined) {
            firstSeenAt.set(address, index);
        }
        return {
            raw,
            address,
            recipientId: address,
            error: null,
            duplicateOf: existingIndex ?? null,
        };
    });

    return { entries, totalCount, exceedsMax };
}
