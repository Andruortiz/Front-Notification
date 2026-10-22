const SAMPLE_NOTIFICATIONS = [
    {
        channel: 'EMAIL',
        title: 'Tu matrícula fue confirmada',
        status: 'delivered',
        label: 'Entregada',
    },
    { channel: 'SMS', title: 'Código de verificación', status: 'in_process', label: 'En proceso' },
    { channel: 'WHATSAPP', title: 'Tu cita fue agendada', status: 'delivered', label: 'Entregada' },
    { channel: 'PUSH', title: 'Recordatorio de clase', status: 'pending', label: 'Pendiente' },
] as const;

export default function LoginPage({ onLogin }: { onLogin: () => void }) {
    return (
        <main className="landing">
            <header className="landing__bar">
                <span className="app-nav__brand">Notification-uco</span>
                <button type="button" className="landing__bar-action" onClick={onLogin}>
                    Iniciar sesión
                </button>
            </header>

            <section className="landing__hero" aria-labelledby="landing-title">
                <div className="landing__copy">
                    <h1 id="landing-title">Cada notificación, en tiempo real.</h1>
                    <p className="landing__lead">
                        Correo, SMS, WhatsApp y push desde un solo lugar, con el estado de cada
                        intento mientras ocurre.
                    </p>
                </div>

                <ul className="landing__stack" aria-hidden="true">
                    {SAMPLE_NOTIFICATIONS.map((item) => (
                        <li key={item.channel} className="landing-card">
                            <span className="landing-card__channel">{item.channel}</span>
                            <span className="landing-card__title">{item.title}</span>
                            <span className={`status-badge status-badge--${item.status}`}>
                                {item.label}
                            </span>
                        </li>
                    ))}
                </ul>
            </section>
        </main>
    );
}
