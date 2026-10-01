import { Link } from 'react-router-dom';
import StatusBadge from '../StatusBadge';
import type { components } from '../../api/schema';

type SendNotificationResponse = components['schemas']['SendNotificationResponse'];

interface SendResultPanelProps {
    result: SendNotificationResponse;
    onSendAnother: () => void;
}

export default function SendResultPanel({ result, onSendAnother }: SendResultPanelProps) {
    return (
        <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <h2 style={{ marginBottom: 0 }}>
                    {result.duplicate ? 'Ya existía' : 'Notificación aceptada'}
                </h2>
                <StatusBadge status={result.status} />
            </div>
            <p className="page-subtitle">
                {result.duplicate
                    ? 'Ya se había enviado una notificación con este contenido; no se creó una segunda.'
                    : 'La notificación quedó registrada y seguirá su curso.'}
            </p>
            <dl className="field-grid" style={{ marginTop: 16 }}>
                <dt>ID</dt>
                <dd>
                    <code>{result.notificationId}</code>
                </dd>
            </dl>
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                {result.notificationId && (
                    <Link className="link-button" to={`/notificaciones/${result.notificationId}`}>
                        Ver detalle
                    </Link>
                )}
                <button type="button" className="catalog-action-button" onClick={onSendAnother}>
                    Enviar otra
                </button>
            </div>
        </div>
    );
}
