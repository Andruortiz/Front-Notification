export interface SubmissionId {
    id: string;
    fingerprint: string;
}

export interface SubmissionFingerprintInput {
    channelType: string;
    recipients: string[];
    subject: string;
    body: string;
    priority: string;
    attachment?: string;
}

function buildFingerprint(input: SubmissionFingerprintInput): string {
    return JSON.stringify([
        input.channelType,
        input.recipients,
        input.subject,
        input.body,
        input.priority,
        input.attachment ?? null,
    ]);
}

export function createSubmissionId(input: SubmissionFingerprintInput): SubmissionId {
    return { id: `panel-${crypto.randomUUID()}`, fingerprint: buildFingerprint(input) };
}

export function refreshSubmissionId(
    current: SubmissionId | null,
    input: SubmissionFingerprintInput,
): SubmissionId {
    const fingerprint = buildFingerprint(input);
    if (current?.fingerprint === fingerprint) {
        return current;
    }
    return { id: `panel-${crypto.randomUUID()}`, fingerprint };
}
