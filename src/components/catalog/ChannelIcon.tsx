const PATHS: Record<string, string> = {
    EMAIL: 'M3 6.5A2.5 2.5 0 0 1 5.5 4h13A2.5 2.5 0 0 1 21 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5zM4 7l8 6 8-6',
    SMS: 'M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 4v-4A2.5 2.5 0 0 1 4 13.5zM8 8.5h8M8 11.5h5',
    PUSH: 'M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0',
    WHATSAPP:
        'M4 20l1.3-4A8 8 0 1 1 8.2 18.8zM9.2 8.8c0 3 2.9 6 6 6l1.1-1.2-2-1-.9.8c-1-.4-2-1.4-2.4-2.4l.8-.9-1-2z',
};

const FALLBACK = 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z';

export default function ChannelIcon({ channelType }: { channelType: string }) {
    return (
        <svg
            className="cat-icon__svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d={PATHS[channelType] ?? FALLBACK} />
        </svg>
    );
}
