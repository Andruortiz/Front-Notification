import { useMemo, useState } from 'react';
import type { SendOutcome, SendOutcomeStatus } from '../../hooks/useSendBatch';

interface BatchResultTableProps {
    outcomes: SendOutcome[];
    onResendRejected: () => void;
    resending?: boolean;
}

const STATUS_LABELS: Record<SendOutcomeStatus, string> = {
    ACCEPTED: 'Aceptada',
    DUPLICATE: 'Ya existía',
    REJECTED: 'Rechazada',
    SIN_CONFIRMAR: 'Sin confirmar',
};

const FILTERS: { value: SendOutcomeStatus | 'ALL'; label: string }[] = [
    { value: 'ALL', label: 'Todos' },
    { value: 'ACCEPTED', label: 'Aceptadas' },
    { value: 'DUPLICATE', label: 'Ya existían' },
    { value: 'REJECTED', label: 'Rechazadas' },
    { value: 'SIN_CONFIRMAR', label: 'Sin confirmar' },
];

export default function BatchResultTable({
    outcomes,
    onResendRejected,
    resending,
}: BatchResultTableProps) {
    const [filter, setFilter] = useState<SendOutcomeStatus | 'ALL'>('ALL');

    const summary = useMemo(() => {
        const totals: Record<SendOutcomeStatus, number> = {
            ACCEPTED: 0,
            DUPLICATE: 0,
            REJECTED: 0,
            SIN_CONFIRMAR: 0,
        };
        outcomes.forEach((outcome) => {
            totals[outcome.outcome] += 1;
        });
        return totals;
    }, [outcomes]);

    const resendableCount = summary.REJECTED + summary.SIN_CONFIRMAR;
    const visible = filter === 'ALL' ? outcomes : outcomes.filter((o) => o.outcome === filter);

    return (
        <div>
            <div className="batch-summary">
                <span>
                    Total: <strong>{outcomes.length}</strong>
                </span>
                <span>
                    Aceptadas: <strong>{summary.ACCEPTED}</strong>
                </span>
                <span>
                    Ya existían: <strong>{summary.DUPLICATE}</strong>
                </span>
                <span>
                    Rechazadas: <strong>{summary.REJECTED}</strong>
                </span>
                <span>
                    Sin confirmar: <strong>{summary.SIN_CONFIRMAR}</strong>
                </span>
            </div>

            <div className="batch-filters" role="group" aria-label="Filtrar por estado">
                {FILTERS.map((f) => (
                    <button
                        key={f.value}
                        type="button"
                        className={
                            filter === f.value
                                ? 'catalog-action-button catalog-action-button--active'
                                : 'catalog-action-button'
                        }
                        aria-pressed={filter === f.value}
                        onClick={() => setFilter(f.value)}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            <table className="data-table">
                <thead>
                    <tr>
                        <th>Destinatario</th>
                        <th>Estado</th>
                        <th>Detalle</th>
                    </tr>
                </thead>
                <tbody>
                    {visible.map((outcome, index) => (
                        <tr key={`${outcome.address}-${index}`}>
                            <td>{outcome.address}</td>
                            <td>{STATUS_LABELS[outcome.outcome]}</td>
                            <td className="cell-muted">
                                {outcome.reason ?? outcome.notificationId ?? '—'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {resendableCount > 0 && (
                <button
                    type="button"
                    className="catalog-action-button"
                    onClick={onResendRejected}
                    disabled={resending}
                    style={{ marginTop: 16 }}
                >
                    {resending ? 'Reenviando...' : 'Reenviar rechazados'}
                </button>
            )}
        </div>
    );
}
