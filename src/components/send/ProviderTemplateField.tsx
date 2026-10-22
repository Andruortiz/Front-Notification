interface ProviderTemplateFieldProps {
    templateId: string;
    variables: string;
    error?: string;
    disabled?: boolean;
    onTemplateIdChange: (value: string) => void;
    onVariablesChange: (value: string) => void;
    templateRef?: (element: HTMLInputElement | null) => void;
}

export default function ProviderTemplateField({
    templateId,
    variables,
    error,
    disabled,
    onTemplateIdChange,
    onVariablesChange,
    templateRef,
}: ProviderTemplateFieldProps) {
    const active = templateId.trim().length > 0;

    return (
        <div className="form-field">
            <label htmlFor="send-template-id">Plantilla del proveedor (opcional)</label>
            <input
                id="send-template-id"
                ref={templateRef}
                type="text"
                value={templateId}
                placeholder="HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                spellCheck={false}
                autoComplete="off"
                disabled={disabled}
                aria-invalid={error ? true : undefined}
                aria-describedby={
                    [error ? 'send-template-error' : null, 'send-template-hint']
                        .filter(Boolean)
                        .join(' ') || undefined
                }
                onChange={(event) => onTemplateIdChange(event.target.value)}
            />
            <p id="send-template-hint" className="field-hint">
                Content SID de Twilio. Si lo escribís, se envía la plantilla y el mensaje de texto
                se ignora.
            </p>
            {active && (
                <>
                    <label htmlFor="send-template-variables">Variables</label>
                    <textarea
                        id="send-template-variables"
                        rows={3}
                        value={variables}
                        placeholder={'1=Andrés\n2=Matrícula'}
                        spellCheck={false}
                        autoComplete="off"
                        disabled={disabled}
                        onChange={(event) => onVariablesChange(event.target.value)}
                    />
                    <p className="field-hint">
                        Una variable por línea, con el formato número=valor.
                    </p>
                </>
            )}
            {error && (
                <p id="send-template-error" className="field-error">
                    {error}
                </p>
            )}
        </div>
    );
}
