const TENANT_ID = import.meta.env.VITE_TENANT_ID;

export class ApiError extends Error {
    status: number;
    serverMessage?: string;

    constructor(status: number, serverMessage?: string) {
        super(`API error ${status}`);
        this.name = 'ApiError';
        this.status = status;
        this.serverMessage = serverMessage;
    }
}

async function readServerMessage(res: Response): Promise<string | undefined> {
    if (!res.headers.get('Content-Type')?.includes('application/json')) {
        return undefined;
    }
    try {
        const body = (await res.json()) as { message?: string };
        return body.message;
    } catch {
        return undefined;
    }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`/api${path}`, {
        ...options,
        headers: {
            'X-Tenant-Id': TENANT_ID,
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });
    if (!res.ok) {
        throw new ApiError(res.status, await readServerMessage(res));
    }
    return (await res.json()) as T;
}
