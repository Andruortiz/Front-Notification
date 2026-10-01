import { useState } from 'react';
import { PushTokenError, readFirebaseConfig, requestBrowserPushToken } from '../../lib/firebaseWeb';

interface PushTokenButtonProps {
    disabled?: boolean;
    onToken: (token: string) => void;
}

export default function PushTokenButton({ disabled = false, onToken }: PushTokenButtonProps) {
    const config = readFirebaseConfig();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    if (!config) {
        return null;
    }

    async function handleClick() {
        if (!config) {
            return;
        }
        setBusy(true);
        setError(null);
        setDone(false);
        try {
            onToken(await requestBrowserPushToken(config));
            setDone(true);
        } catch (failure) {
            setError(
                failure instanceof PushTokenError
                    ? failure.message
                    : 'No se pudo obtener el token de este navegador.',
            );
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="form-field">
            <div className="attachment-actions">
                <button
                    type="button"
                    className="catalog-action-button"
                    disabled={disabled || busy}
                    aria-describedby="push-token-hint"
                    onClick={() => void handleClick()}
                >
                    {busy ? 'Obteniendo token...' : 'Usar este navegador'}
                </button>
            </div>
            <p id="push-token-hint" className="field-hint" aria-live="polite">
                {done
                    ? 'Token de este navegador cargado como destinatario.'
                    : 'Genera el token de este navegador y lo carga como destinatario, para probar el push.'}
            </p>
            {error && (
                <p className="field-error" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}
