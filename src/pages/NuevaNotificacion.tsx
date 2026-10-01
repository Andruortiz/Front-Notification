import { useMemo, useRef, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getChannels } from '../api/catalog';
import { deriveChannelRules } from '../lib/channelRules';
import { parseRecipients, MAX_RECIPIENTS } from '../lib/recipients';
import { attachmentsFingerprint } from '../lib/attachment';
import {
    validateSendDraft,
    validateBatchDraft,
    validateRecipientEntries,
    validateAttachments,
    type SendDraft,
} from '../lib/sendValidation';
import { createSubmissionId, refreshSubmissionId, type SubmissionId } from '../lib/submissionId';
import { useSendNotification, translateSendError } from '../hooks/useSendNotification';
import { useSendBatch, type BatchSendRow, type SendOutcome } from '../hooks/useSendBatch';
import AttachmentField from '../components/send/AttachmentField';
import ChannelSelect from '../components/send/ChannelSelect';
import NotificationFields from '../components/send/NotificationFields';
import SendResultPanel from '../components/send/SendResultPanel';
import ConfirmSendDialog from '../components/send/ConfirmSendDialog';
import BatchResultTable from '../components/send/BatchResultTable';
import type { components } from '../api/schema';
import type { RecipientEntry } from '../lib/recipients';

type Priority = components['schemas']['Priority'];
type SendNotificationResponse = components['schemas']['SendNotificationResponse'];
type FormErrors = Partial<
    Record<'channelType' | 'address' | 'subject' | 'body' | 'attachment', string>
>;

const EMPTY_DRAFT_FIELDS = { address: '', subject: '', body: '', priority: 'NORMAL' as Priority };

export default function NuevaNotificacion() {
    const [channelType, setChannelType] = useState('');
    const [address, setAddress] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [priority, setPriority] = useState<Priority>('NORMAL');
    const [attachments, setAttachments] = useState<File[]>([]);
    const [errors, setErrors] = useState<FormErrors>({});
    const [result, setResult] = useState<SendNotificationResponse | null>(null);
    const [submission, setSubmission] = useState<SubmissionId | null>(null);

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [batchEntries, setBatchEntries] = useState<RecipientEntry[] | null>(null);
    const [batchExternalIds, setBatchExternalIds] = useState<string[] | null>(null);
    const [batchOutcomes, setBatchOutcomes] = useState<SendOutcome[] | null>(null);

    const channelFieldRef = useRef<HTMLSelectElement | null>(null);
    const addressFieldRef = useRef<HTMLTextAreaElement | null>(null);
    const bodyFieldRef = useRef<HTMLTextAreaElement | null>(null);

    const { data: channelsData } = useQuery({
        queryKey: ['catalog', 'channels'],
        queryFn: getChannels,
    });

    const rules = useMemo(() => {
        const channel = channelsData?.items.find((item) => item.channelType === channelType);
        return channel ? deriveChannelRules(channel) : undefined;
    }, [channelsData, channelType]);

    const mutation = useSendNotification();
    const { send: batchSend, isSending: batchIsSending, progress: batchProgress } = useSendBatch();

    const parsedRecipients = useMemo(
        () => parseRecipients(address, channelType),
        [address, channelType],
    );
    const recipientRowErrors = useMemo(
        () => (rules ? validateRecipientEntries(parsedRecipients.entries, rules) : {}),
        [parsedRecipients, rules],
    );
    const isBatch = parsedRecipients.entries.length > 1;

    function focusFirstError(fieldErrors: FormErrors) {
        if (fieldErrors.channelType) {
            channelFieldRef.current?.focus();
        } else if ('address' in fieldErrors && fieldErrors.address) {
            addressFieldRef.current?.focus();
        } else if (fieldErrors.body) {
            bodyFieldRef.current?.focus();
        }
    }

    function submitIndividual() {
        const single = parsedRecipients.entries[0];
        const normalizedAddress = single?.address ?? '';
        const draft: SendDraft = {
            channelType,
            address: single?.raw ?? '',
            subject,
            body,
            priority,
        };
        const validationErrors: FormErrors = validateSendDraft(draft, rules);
        const attachmentError = validateAttachments(attachments, rules);
        if (attachmentError) {
            validationErrors.attachment = attachmentError;
        }
        setErrors(validationErrors);
        if (Object.keys(validationErrors).length > 0) {
            focusFirstError(validationErrors);
            return;
        }

        const nextSubmission = refreshSubmissionId(submission, {
            channelType,
            recipients: [normalizedAddress],
            subject,
            body,
            priority,
            attachment: attachmentsFingerprint(attachments),
        });
        setSubmission(nextSubmission);

        mutation.mutate(
            {
                request: {
                    externalId: nextSubmission.id,
                    channelType,
                    recipientId: normalizedAddress,
                    recipientAddress: normalizedAddress,
                    subject: rules?.subject === 'hidden' || !subject.trim() ? undefined : subject,
                    body,
                    priority,
                },
                attachments,
            },
            { onSuccess: (data) => setResult(data) },
        );
    }

    function submitBatch() {
        const validationErrors: FormErrors = validateBatchDraft(
            { channelType, subject, body },
            rules,
        );
        const attachmentError = validateAttachments(attachments, rules);
        if (attachmentError) {
            validationErrors.attachment = attachmentError;
        }
        if (parsedRecipients.exceedsMax) {
            validationErrors.address = `Hay ${parsedRecipients.totalCount} destinatarios; el máximo es ${MAX_RECIPIENTS}.`;
        } else if (Object.keys(recipientRowErrors).length > 0) {
            validationErrors.address = 'Corregí las direcciones con formato inválido.';
        }
        setErrors(validationErrors);
        if (Object.keys(validationErrors).length > 0) {
            focusFirstError(validationErrors);
            return;
        }
        setConfirmOpen(true);
    }

    function handleFormSubmit(event: FormEvent) {
        event.preventDefault();
        if (isBatch || parsedRecipients.exceedsMax) {
            submitBatch();
        } else {
            submitIndividual();
        }
    }

    async function handleConfirmSend() {
        const newSubmission = createSubmissionId({
            channelType,
            recipients: parsedRecipients.entries.map((entry) => entry.address),
            subject,
            body,
            priority,
            attachment: attachmentsFingerprint(attachments),
        });
        const externalIds = parsedRecipients.entries.map(
            (_, index) => `${newSubmission.id}-${index}`,
        );
        const rows: BatchSendRow[] = parsedRecipients.entries.map((entry, index) => ({
            externalId: externalIds[index],
            recipientId: entry.recipientId,
            address: entry.address,
            skip: entry.duplicateOf !== null,
        }));

        setBatchEntries(parsedRecipients.entries);
        setBatchExternalIds(externalIds);
        setConfirmOpen(false);

        const outcomes = await batchSend(rows, {
            channelType,
            subject: rules?.subject === 'hidden' || !subject.trim() ? undefined : subject,
            body,
            priority,
            attachments,
        });
        setBatchOutcomes(outcomes);
    }

    async function handleResendRejected() {
        if (!batchEntries || !batchExternalIds || !batchOutcomes) {
            return;
        }
        const indicesToResend = batchOutcomes
            .map((outcome, index) => ({ outcome, index }))
            .filter(
                ({ outcome }) =>
                    outcome.outcome === 'REJECTED' || outcome.outcome === 'SIN_CONFIRMAR',
            )
            .map(({ index }) => index);

        if (indicesToResend.length === 0) {
            return;
        }

        const rows: BatchSendRow[] = indicesToResend.map((index) => ({
            externalId: batchExternalIds[index],
            recipientId: batchEntries[index].recipientId,
            address: batchEntries[index].address,
            skip: false,
        }));

        const resultsSubset = await batchSend(rows, {
            channelType,
            subject: rules?.subject === 'hidden' || !subject.trim() ? undefined : subject,
            body,
            priority,
            attachments,
        });

        setBatchOutcomes((previous) => {
            if (!previous) {
                return previous;
            }
            const next = [...previous];
            indicesToResend.forEach((originalIndex, position) => {
                next[originalIndex] = resultsSubset[position];
            });
            return next;
        });
    }

    function handleSendAnother() {
        setResult(null);
        setBatchEntries(null);
        setBatchExternalIds(null);
        setBatchOutcomes(null);
        setAttachments([]);
        setAddress(EMPTY_DRAFT_FIELDS.address);
        setSubject(EMPTY_DRAFT_FIELDS.subject);
        setBody(EMPTY_DRAFT_FIELDS.body);
        setPriority(EMPTY_DRAFT_FIELDS.priority);
        setErrors({});
        mutation.reset();
        setSubmission(
            createSubmissionId({
                channelType,
                recipients: [EMPTY_DRAFT_FIELDS.address],
                subject: EMPTY_DRAFT_FIELDS.subject,
                body: EMPTY_DRAFT_FIELDS.body,
                priority: EMPTY_DRAFT_FIELDS.priority,
            }),
        );
    }

    if (result) {
        return (
            <div>
                <div className="page-header">
                    <h1>Nueva notificación</h1>
                </div>
                <SendResultPanel result={result} onSendAnother={handleSendAnother} />
            </div>
        );
    }

    if (batchOutcomes) {
        return (
            <div>
                <div className="page-header">
                    <h1>Nueva notificación</h1>
                </div>
                <div className="card">
                    <BatchResultTable
                        outcomes={batchOutcomes}
                        onResendRejected={() => {
                            void handleResendRejected();
                        }}
                        resending={batchIsSending}
                    />
                    <button
                        type="button"
                        className="catalog-action-button"
                        onClick={handleSendAnother}
                        style={{ marginTop: 16 }}
                    >
                        Enviar otra
                    </button>
                </div>
            </div>
        );
    }

    if (batchIsSending) {
        return (
            <div>
                <div className="page-header">
                    <h1>Nueva notificación</h1>
                </div>
                <div className="card">
                    <p>
                        Enviando...{' '}
                        {batchProgress ? `${batchProgress.sent} / ${batchProgress.total}` : ''}
                    </p>
                </div>
            </div>
        );
    }

    const hasErrors = Object.values(errors).some(Boolean);
    const recipientsSummaryError = parsedRecipients.exceedsMax
        ? `Hay ${parsedRecipients.totalCount} destinatarios; el máximo es ${MAX_RECIPIENTS}.`
        : null;

    const recipientsExtra = (
        <>
            {recipientsSummaryError ? (
                <p className="field-error">{recipientsSummaryError}</p>
            ) : (
                isBatch && (
                    <p className="field-hint">
                        {parsedRecipients.entries.length} destinatario(s) detectado(s).
                    </p>
                )
            )}
            {!parsedRecipients.exceedsMax && isBatch && (
                <div className="recipient-preview">
                    {parsedRecipients.entries.map((entry, index) => (
                        <div
                            key={`${entry.address}-${index}`}
                            className={
                                recipientRowErrors[index]
                                    ? 'recipient-preview-row recipient-preview-row--error'
                                    : 'recipient-preview-row'
                            }
                        >
                            <span>{entry.raw}</span>
                            <span>
                                {recipientRowErrors[index] ??
                                    (entry.duplicateOf !== null ? 'Repetida' : '')}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </>
    );

    return (
        <div>
            <div className="page-header">
                <h1>Nueva notificación</h1>
                <p className="page-subtitle">
                    Enviá una notificación por cualquier canal disponible, a un destinatario o a
                    varios a la vez.
                </p>
            </div>

            <form className="card" onSubmit={handleFormSubmit} noValidate>
                {hasErrors && (
                    <div role="alert" className="state-message state-message--error form-alert">
                        Corregí los campos señalados antes de enviar.
                    </div>
                )}

                {mutation.isError && (
                    <div role="alert" className="state-message state-message--error form-alert">
                        {translateSendError(mutation.error)}
                    </div>
                )}

                <ChannelSelect
                    value={channelType}
                    onChange={(value) => {
                        setChannelType(value);
                        setErrors((prev) => ({ ...prev, channelType: undefined }));
                    }}
                    error={errors.channelType}
                    selectRef={(el) => {
                        channelFieldRef.current = el;
                    }}
                />

                {rules && (
                    <>
                        <NotificationFields
                            rules={rules}
                            address={address}
                            subject={subject}
                            body={body}
                            priority={priority}
                            errors={errors}
                            onAddressChange={setAddress}
                            onSubjectChange={setSubject}
                            onBodyChange={setBody}
                            onPriorityChange={setPriority}
                            addressRef={(el) => {
                                addressFieldRef.current = el;
                            }}
                            bodyRef={(el) => {
                                bodyFieldRef.current = el;
                            }}
                            addressExtra={recipientsExtra}
                        />
                        <AttachmentField
                            files={attachments}
                            rules={rules?.attachments ?? null}
                            error={errors.attachment}
                            disabled={mutation.isPending || batchIsSending}
                            onChange={(files) => {
                                setAttachments(files);
                                setErrors((prev) => ({ ...prev, attachment: undefined }));
                            }}
                        />
                    </>
                )}

                <button
                    type="submit"
                    className="catalog-action-button"
                    disabled={mutation.isPending || !rules}
                >
                    {mutation.isPending ? 'Enviando...' : 'Enviar'}
                </button>
            </form>

            <ConfirmSendDialog
                open={confirmOpen}
                channelType={channelType}
                recipientCount={
                    parsedRecipients.entries.filter((e) => e.duplicateOf === null).length
                }
                message={body}
                onConfirm={() => {
                    void handleConfirmSend();
                }}
                onCancel={() => setConfirmOpen(false)}
            />
        </div>
    );
}
