import { formatDuration, type TimelineStep } from '../../lib/notificationTimeline';

const ORIGIN_LABELS = { MANUAL: 'manual', AUTOMATIC: 'automático' } as const;

function formatDate(value?: string) {
    return value ? new Date(value).toLocaleString() : undefined;
}

export default function AttemptTimeline({ steps }: { steps: TimelineStep[] }) {
    return (
        <ol className="timeline">
            {steps.map((step) => {
                const when = formatDate(step.at);
                return (
                    <li key={step.key} className="timeline-item">
                        <span
                            className={`timeline-node detail-tone--${step.tone}${
                                step.waiting ? ' timeline-node--waiting' : ''
                            }`}
                            aria-hidden="true"
                        >
                            {step.marker}
                        </span>
                        <div className="timeline-item__head">
                            <span className="timeline-item__title">{step.title}</span>
                            {step.gapMs !== undefined && (
                                <span className="timeline-item__gap">
                                    +{formatDuration(step.gapMs)}
                                </span>
                            )}
                            {step.providerId && (
                                <span className="timeline-item__provider">{step.providerId}</span>
                            )}
                            {step.origin && (
                                <span className="timeline-item__meta">
                                    {ORIGIN_LABELS[step.origin]}
                                </span>
                            )}
                        </div>
                        {when && <div className="timeline-item__time">{when}</div>}
                    </li>
                );
            })}
        </ol>
    );
}
