import type { LiveConnectionState } from '../api/liveUpdates';

const LABELS: Record<LiveConnectionState, string> = {
    connecting: 'Conectando…',
    open: 'En vivo',
    reconnecting: 'Reconectando…',
    closed: 'Desconectado',
};

export default function LiveConnectionBadge({ state }: { state: LiveConnectionState }) {
    return (
        <span className={`live-badge live-badge--${state}`}>
            <span className="live-badge__dot" />
            {LABELS[state]}
        </span>
    );
}
