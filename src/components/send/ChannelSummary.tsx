import type { components } from '../../api/schema';
import { deriveChannelRules } from '../../lib/channelRules';
import ChannelIcon from '../catalog/ChannelIcon';

type ChannelItem = components['schemas']['ChannelItem'];

const SUBJECT_LABEL = {
    required: 'Obligatorio',
    optional: 'Opcional',
    hidden: 'No lleva',
} as const;

function formatBytes(bytes: number): string {
    return bytes >= 1024 * 1024
        ? `${Math.round(bytes / (1024 * 1024))} MB`
        : `${Math.round(bytes / 1024)} KB`;
}

export default function ChannelSummary({ channel }: { channel: ChannelItem | undefined }) {
    if (!channel) {
        return (
            <aside className="channel-summary" aria-label="Resumen del canal">
                <p className="channel-summary__empty">
                    Elegí un canal para ver cómo se entrega, qué dirección pide y qué límites tiene.
                </p>
            </aside>
        );
    }

    const rules = deriveChannelRules(channel);
    const preferred = channel.providers.find((provider) => provider.status === 'ENABLED');
    const attachments = rules.attachments;
    const attachmentSummary = attachments
        ? [
              Number.isFinite(attachments.maxItems)
                  ? `Hasta ${attachments.maxItems}`
                  : 'Sin tope de cantidad',
              attachments.maxSizeBytes !== null
                  ? `${formatBytes(attachments.maxSizeBytes)} c/u`
                  : null,
          ]
              .filter(Boolean)
              .join(' · ')
        : 'No admite';

    return (
        <aside className="channel-summary" aria-label="Resumen del canal">
            <header className="channel-summary__head">
                <span className="cat-icon">
                    <ChannelIcon channelType={channel.channelType} />
                </span>
                <h2>{channel.channelType}</h2>
            </header>
            <dl className="channel-summary__list">
                <div>
                    <dt>Proveedor</dt>
                    <dd>{preferred ? preferred.providerId : 'Sin proveedor disponible'}</dd>
                </div>
                <div>
                    <dt>Destinatario</dt>
                    <dd>
                        {rules.addressLabel}
                        {rules.addressExample && (
                            <span className="channel-summary__example">{rules.addressExample}</span>
                        )}
                    </dd>
                </div>
                <div>
                    <dt>Asunto</dt>
                    <dd>
                        {SUBJECT_LABEL[rules.subject]}
                        {rules.subjectMax !== null && ` · hasta ${rules.subjectMax}`}
                    </dd>
                </div>
                <div>
                    <dt>Mensaje</dt>
                    <dd>
                        {rules.bodyMax !== null
                            ? `Hasta ${rules.bodyMax} caracteres`
                            : 'Sin límite'}
                    </dd>
                </div>
                <div>
                    <dt>Adjuntos</dt>
                    <dd>{attachmentSummary}</dd>
                </div>
            </dl>
        </aside>
    );
}
