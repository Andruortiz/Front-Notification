export async function requireSession(pdpUrl: string): Promise<boolean> {
    const response = await fetch(`${pdpUrl}/api/v1/session`, { credentials: 'include' });

    if (response.status === 401) {
        const returnTo = encodeURIComponent(window.location.href);
        window.location.assign(`${pdpUrl}/oauth2/authorization/keycloak?return_to=${returnTo}`);
        return false;
    }

    if (!response.ok) {
        throw new Error('No fue posible consultar la sesión de seguridad.');
    }

    return true;
}
