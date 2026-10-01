export interface FirebaseWebConfig {
    apiKey: string;
    authDomain: string;
    projectId: string;
    messagingSenderId: string;
    appId: string;
    vapidKey: string;
}

export type PushTokenErrorCode = 'unsupported' | 'denied' | 'failed';

export class PushTokenError extends Error {
    readonly code: PushTokenErrorCode;

    constructor(code: PushTokenErrorCode, message: string) {
        super(message);
        this.code = code;
    }
}

type FirebaseEnv = Record<string, string | undefined>;

export function readFirebaseConfig(env: FirebaseEnv = import.meta.env): FirebaseWebConfig | null {
    const config: FirebaseWebConfig = {
        apiKey: env.VITE_FIREBASE_API_KEY ?? '',
        authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
        projectId: env.VITE_FIREBASE_PROJECT_ID ?? '',
        messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
        appId: env.VITE_FIREBASE_APP_ID ?? '',
        vapidKey: env.VITE_FIREBASE_VAPID_KEY ?? '',
    };
    return (Object.values(config) as string[]).every((value) => value.trim().length > 0)
        ? config
        : null;
}

export function serviceWorkerUrl(config: FirebaseWebConfig): string {
    const params = new URLSearchParams({
        apiKey: config.apiKey,
        authDomain: config.authDomain,
        projectId: config.projectId,
        messagingSenderId: config.messagingSenderId,
        appId: config.appId,
    });
    return `/firebase-messaging-sw.js?${params.toString()}`;
}

/**
 * Pide permiso de notificaciones y devuelve el token de dispositivo de este navegador.
 * El SDK de Firebase se carga recién aquí para no pesar en el resto de la aplicación.
 */
export async function requestBrowserPushToken(config: FirebaseWebConfig): Promise<string> {
    if (!('serviceWorker' in navigator) || !('Notification' in window)) {
        throw new PushTokenError(
            'unsupported',
            'Este navegador no admite notificaciones push. Usá localhost o HTTPS.',
        );
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
        throw new PushTokenError(
            'denied',
            'El navegador no dio permiso para mostrar notificaciones.',
        );
    }

    try {
        const [{ initializeApp, getApps, getApp }, { getMessaging, getToken, isSupported }] =
            await Promise.all([import('firebase/app'), import('firebase/messaging')]);

        if (!(await isSupported())) {
            throw new PushTokenError(
                'unsupported',
                'Firebase Messaging no es compatible con este navegador.',
            );
        }

        const app = getApps().length > 0 ? getApp() : initializeApp(config);
        const registration = await navigator.serviceWorker.register(serviceWorkerUrl(config));
        const token = await getToken(getMessaging(app), {
            vapidKey: config.vapidKey,
            serviceWorkerRegistration: registration,
        });
        if (!token) {
            throw new PushTokenError('failed', 'Firebase no devolvió un token.');
        }
        return token;
    } catch (error) {
        if (error instanceof PushTokenError) {
            throw error;
        }
        throw new PushTokenError(
            'failed',
            'No se pudo obtener el token. Revisá la configuración de Firebase y la clave VAPID.',
        );
    }
}
