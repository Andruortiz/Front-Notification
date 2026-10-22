import { useQuery } from '@tanstack/react-query';
import { getChannels } from '../../api/catalog';
import { deriveChannelRules } from '../../lib/channelRules';
import ChannelIcon from '../catalog/ChannelIcon';

interface ChannelSelectProps {
    value: string;
    onChange: (channelType: string) => void;
    error?: string;
    fieldRef?: (element: HTMLElement | null) => void;
}

export default function ChannelSelect({ value, onChange, error, fieldRef }: ChannelSelectProps) {
    const { data, isLoading, isError } = useQuery({
        queryKey: ['catalog', 'channels'],
        queryFn: getChannels,
    });

    if (isLoading) {
        return <div className="state-message">Cargando canales...</div>;
    }

    if (isError || !data) {
        return (
            <div className="state-message state-message--error">
                No se pudo consultar el catálogo de canales.
            </div>
        );
    }

    if (data.items.length === 0) {
        return <div className="state-message">No hay canales registrados para enviar.</div>;
    }

    const channels = data.items.map((channel) => ({
        channelType: channel.channelType,
        rules: deriveChannelRules(channel),
    }));
    const unavailable = channels.filter((channel) => !channel.rules.available);

    return (
        <div className="form-field">
            <span id="send-channel-label" className="form-label">
                Canal
            </span>
            <div
                ref={fieldRef}
                tabIndex={-1}
                role="radiogroup"
                aria-labelledby="send-channel-label"
                aria-describedby={error ? 'send-channel-error' : undefined}
                className="channel-picker"
            >
                {channels.map(({ channelType, rules }) => (
                    <button
                        key={channelType}
                        type="button"
                        role="radio"
                        aria-checked={value === channelType}
                        disabled={!rules.available}
                        title={rules.available ? undefined : (rules.unavailableReason ?? undefined)}
                        className="channel-picker__option"
                        onClick={() => onChange(channelType)}
                    >
                        <ChannelIcon channelType={channelType} />
                        {channelType}
                    </button>
                ))}
            </div>
            {error && (
                <p id="send-channel-error" className="field-error">
                    {error}
                </p>
            )}
            {unavailable.map(({ channelType, rules }) => (
                <p key={channelType} className="field-hint">
                    {channelType} no disponible: {rules.unavailableReason}
                </p>
            ))}
            {unavailable.length === channels.length && (
                <p className="field-hint">
                    Ningún canal tiene un proveedor disponible; no se puede enviar.
                </p>
            )}
        </div>
    );
}
