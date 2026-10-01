import type { ReactNode } from 'react';
import { MAX_CONTENT_LENGTH } from '../../lib/validators';
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
    onFieldBlur?: (field: 'address' | 'subject' | 'body') => void;
    subjectRef?: (element: HTMLInputElement | null) => void;
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
    onFieldBlur,
    subjectRef,
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
                    onBlur={() => onFieldBlur?.('address')}
                    spellCheck={false}
                    autoComplete="off"
                    aria-required="true"
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
                    <label htmlFor="send-subject">
                        Asunto{rules.subject === 'optional' ? ' (opcional)' : ''}
                    </label>
                    <input
                        id="send-subject"
                        ref={subjectRef}
                        type="text"
                        value={subject}
                        aria-required={rules.subject === 'required' ? 'true' : undefined}
                        onChange={(event) => onSubjectChange(event.target.value)}
                        onBlur={() => onFieldBlur?.('subject')}
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
                    onBlur={() => onFieldBlur?.('body')}
                    aria-required="true"
                    aria-invalid={errors.body ? true : undefined}
                    aria-describedby={
                        [errors.body ? 'send-body-error' : null, 'send-body-counter']
                            .filter(Boolean)
                            .join(' ') || undefined
                    }
                />
                <p id="send-body-counter" className="field-counter" aria-live="polite">
                    {body.length} / {(rules.bodyMax ?? MAX_CONTENT_LENGTH).toLocaleString('es-CO')}
                </p>
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
