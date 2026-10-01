import type { ReactNode } from 'react';
import type { ChannelRules } from '../../lib/channelRules';
import type { SendDraftErrors } from '../../lib/sendValidation';
import type { components } from '../../api/schema';

type Priority = components['schemas']['Priority'];

interface NotificationFieldsProps {
    rules: ChannelRules;
    address: string;
    subject: string;
    body: string;
    priority: Priority;
    errors: SendDraftErrors;
    onAddressChange: (value: string) => void;
    onSubjectChange: (value: string) => void;
    onBodyChange: (value: string) => void;
    onPriorityChange: (value: Priority) => void;
    addressRef?: (element: HTMLTextAreaElement | null) => void;
    bodyRef?: (element: HTMLTextAreaElement | null) => void;
    addressExtra?: ReactNode;
}

export default function NotificationFields({
    rules,
    address,
    subject,
    body,
    priority,
    errors,
    onAddressChange,
    onSubjectChange,
    onBodyChange,
    onPriorityChange,
    addressRef,
    bodyRef,
    addressExtra,
}: NotificationFieldsProps) {
    return (
        <>
            <div className="form-field">
                <label htmlFor="send-address">{rules.addressLabel}</label>
                <textarea
                    id="send-address"
                    ref={addressRef}
                    rows={address.includes('\n') ? 4 : 2}
                    value={address}
                    placeholder={rules.addressExample || undefined}
                    onChange={(event) => onAddressChange(event.target.value)}
                    aria-invalid={errors.address ? true : undefined}
                    aria-describedby={errors.address ? 'send-address-error' : undefined}
                />
                <p className="field-hint">
                    Podés ingresar varios, uno por línea o separados por coma o punto y coma.
                </p>
                {addressExtra}
                {errors.address && (
                    <p id="send-address-error" className="field-error">
                        {errors.address}
                    </p>
                )}
            </div>

            {rules.subject !== 'hidden' && (
                <div className="form-field">
                    <label htmlFor="send-subject">Asunto</label>
                    <input
                        id="send-subject"
                        type="text"
                        value={subject}
                        onChange={(event) => onSubjectChange(event.target.value)}
                        aria-invalid={errors.subject ? true : undefined}
                        aria-describedby={
                            [
                                errors.subject ? 'send-subject-error' : null,
                                rules.subjectMax != null ? 'send-subject-counter' : null,
                            ]
                                .filter(Boolean)
                                .join(' ') || undefined
                        }
                    />
                    {rules.subjectMax != null && (
                        <p id="send-subject-counter" className="field-counter" aria-live="polite">
                            {subject.length} / {rules.subjectMax}
                        </p>
                    )}
                    {errors.subject && (
                        <p id="send-subject-error" className="field-error">
                            {errors.subject}
                        </p>
                    )}
                </div>
            )}

            <div className="form-field">
                <label htmlFor="send-body">Mensaje</label>
                <textarea
                    id="send-body"
                    ref={bodyRef}
                    value={body}
                    rows={4}
                    onChange={(event) => onBodyChange(event.target.value)}
                    aria-invalid={errors.body ? true : undefined}
                    aria-describedby={
                        [
                            errors.body ? 'send-body-error' : null,
                            rules.bodyMax != null ? 'send-body-counter' : null,
                        ]
                            .filter(Boolean)
                            .join(' ') || undefined
                    }
                />
                {rules.bodyMax != null && (
                    <p id="send-body-counter" className="field-counter" aria-live="polite">
                        {body.length} / {rules.bodyMax}
                    </p>
                )}
                {errors.body && (
                    <p id="send-body-error" className="field-error">
                        {errors.body}
                    </p>
                )}
            </div>

            <div className="form-field">
                <label htmlFor="send-priority">Prioridad</label>
                <select
                    id="send-priority"
                    value={priority}
                    onChange={(event) => onPriorityChange(event.target.value as Priority)}
                >
                    <option value="LOW">Baja</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">Alta</option>
                </select>
            </div>
        </>
    );
}
