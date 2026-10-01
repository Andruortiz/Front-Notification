import { useQuery } from '@tanstack/react-query';
import { getChannels } from '../../api/catalog';
import { deriveChannelRules } from '../../lib/channelRules';

interface ChannelSelectProps {
    value: string;
    onChange: (channelType: string) => void;
    error?: string;
    selectRef?: (element: HTMLSelectElement | null) => void;
}

export default function ChannelSelect({ value, onChange, error, selectRef }: ChannelSelectProps) {
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

    const hasAvailableChannel = data.items.some((channel) => deriveChannelRules(channel).available);

    return (
        <div className="form-field">
            <label htmlFor="send-channel">Canal</label>
            <select
                id="send-channel"
                ref={selectRef}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'send-channel-error' : undefined}
            >
                <option value="">Elegí un canal</option>
                {data.items.map((channel) => {
                    const rules = deriveChannelRules(channel);
                    return (
                        <option
                            key={channel.channelType}
                            value={channel.channelType}
                            disabled={!rules.available}
                        >
                            {channel.channelType}
                            {!rules.available ? ` (no disponible: ${rules.unavailableReason})` : ''}
                        </option>
                    );
                })}
            </select>
            {error && (
                <p id="send-channel-error" className="field-error">
                    {error}
                </p>
            )}
            {!hasAvailableChannel && (
                <p className="field-hint">
                    Ningún canal tiene un proveedor disponible; no se puede enviar.
                </p>
            )}
        </div>
    );
}
