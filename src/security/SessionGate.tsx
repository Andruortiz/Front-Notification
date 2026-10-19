import { useEffect, useState, type ReactNode } from 'react';
import { requireSession } from './session';

type GateState = 'checking' | 'ready' | 'error';

function sessionRequired(): string | null {
    const pdpUrl = import.meta.env.VITE_PDP_URL;
    const fixedToken = import.meta.env.VITE_AUTH_TOKEN;
    return pdpUrl && !fixedToken ? pdpUrl : null;
}

export default function SessionGate({ children }: { children: ReactNode }) {
    const pdpUrl = sessionRequired();
    const [state, setState] = useState<GateState>(pdpUrl ? 'checking' : 'ready');
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        if (!pdpUrl) {
            return;
        }
        let cancelled = false;
        requireSession(pdpUrl)
            .then((active) => {
                if (!cancelled && active) {
                    setState('ready');
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setState('error');
                }
            });
        return () => {
            cancelled = true;
        };
    }, [pdpUrl, attempt]);

    if (state === 'ready') {
        return <>{children}</>;
    }

    if (state === 'error') {
        return (
            <div role="alert" className="mx-auto max-w-md p-8 text-center">
                <p>No fue posible consultar la sesión de seguridad.</p>
                <button
                    type="button"
                    onClick={() => {
                        setState('checking');
                        setAttempt((value) => value + 1);
                    }}
                >
                    Reintentar
                </button>
            </div>
        );
    }

    return (
        <p role="status" className="p-8 text-center">
            Verificando la sesión…
        </p>
    );
}
