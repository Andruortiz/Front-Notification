import { useEffect, useRef, useState } from 'react';
import { mountSecurityUi } from '../security/securityUi';

export default function Seguridad() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) {
            return;
        }
        let cancelled = false;
        mountSecurityUi(container).catch((cause: unknown) => {
            if (!cancelled) {
                setError(
                    cause instanceof Error
                        ? cause.message
                        : 'No fue posible cargar la administración de seguridad.',
                );
            }
        });
        return () => {
            cancelled = true;
            container.replaceChildren();
        };
    }, []);

    return (
        <section className="security-page">
            <h1>Administración de seguridad</h1>
            {error && <p role="alert">{error}</p>}
            <div id="security-ui" ref={containerRef} />
        </section>
    );
}
