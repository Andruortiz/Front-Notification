const RELOGIN_KEY = 'notification.relogin.at';
export const RELOGIN_MIN_INTERVAL_MS = 60_000;

export function sessionModeUrl(): string | null {
    const pdpUrl = import.meta.env.VITE_PDP_URL;
    const fixedToken = import.meta.env.VITE_AUTH_TOKEN;
    return pdpUrl && !fixedToken ? pdpUrl : null;
}

function goToLogin(pdpUrl: string): void {
    const returnTo = encodeURIComponent(window.location.href);
    window.location.assign(`${pdpUrl}/oauth2/authorization/keycloak?return_to=${returnTo}`);
}

export function login(pdpUrl: string): void {
    goToLogin(pdpUrl);
}

export function logout(pdpUrl: string): void {
    window.location.assign(`${pdpUrl}/api/v1/session/logout`);
}

function readLastRelogin(): number {
    try {
        return Number(window.sessionStorage.getItem(RELOGIN_KEY)) || 0;
    } catch {
        return 0;
    }
}

function writeLastRelogin(at: number): void {
    try {
        window.sessionStorage.setItem(RELOGIN_KEY, String(at));
    } catch {
        return;
    }
}

export function reloginOnUnauthorized(pdpUrl: string, now: number = Date.now()): boolean {
    if (now - readLastRelogin() < RELOGIN_MIN_INTERVAL_MS) {
        return false;
    }
    writeLastRelogin(now);
    goToLogin(pdpUrl);
    return true;
}

export async function checkSession(pdpUrl: string): Promise<boolean> {
    const response = await fetch(`${pdpUrl}/api/v1/session`, { credentials: 'include' });

    if (response.status === 401) {
        return false;
    }

    if (!response.ok) {
        throw new Error('No fue posible consultar la sesión de seguridad.');
    }

    return true;
}

export async function requireSession(pdpUrl: string): Promise<boolean> {
    if (await checkSession(pdpUrl)) {
        return true;
    }
    goToLogin(pdpUrl);
    return false;
}
