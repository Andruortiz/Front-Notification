const LABELS: Record<string, string> = {
    PENDING: 'Pendiente',
    IN_PROCESS: 'En proceso',
    DELIVERED: 'Entregada',
    RECOVERABLE: 'Reintentando',
    FAILED: 'Fallida',
    DISCARDED: 'Descartada',
};

export default function StatusBadge({ status }: { status: string }) {
    const modifier = status.toLowerCase();
    const label = LABELS[status] ?? status;

    return <span className={`status-badge status-badge--${modifier}`}>{label}</span>;
}
