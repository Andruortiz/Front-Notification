import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    PushTokenError,
    readFirebaseConfig,
    requestBrowserPushToken,
    serviceWorkerUrl,
    type FirebaseWebConfig,
} from './firebaseWeb';

const config: FirebaseWebConfig = {
    apiKey: 'key',
    authDomain: 'demo.firebaseapp.com',
    projectId: 'demo',
    messagingSenderId: '123',
    appId: '1:123:web:abc',
    vapidKey: 'vapid',
};

const getToken = vi.fn();
const isSupported = vi.fn();
const register = vi.fn();

vi.mock('firebase/app', () => ({
    getApps: () => [],
    getApp: vi.fn(),
    initializeApp: vi.fn(() => ({ name: 'app' })),
}));
vi.mock('firebase/messaging', () => ({
    getMessaging: vi.fn(() => ({})),
    getToken: (...args: unknown[]): Promise<string> => getToken(...args) as Promise<string>,
    isSupported: (): Promise<boolean> => isSupported() as Promise<boolean>,
}));

function stubBrowser(permission: NotificationPermission) {
    vi.stubGlobal(
        'Notification',
        Object.assign(vi.fn(), { requestPermission: vi.fn().mockResolvedValue(permission) }),
    );
    Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        value: { register },
    });
}

describe('readFirebaseConfig', () => {
    it('devuelve nulo si falta alguna variable', () => {
        expect(readFirebaseConfig({ VITE_FIREBASE_API_KEY: 'x' })).toBeNull();
        expect(readFirebaseConfig({})).toBeNull();
    });

    it('devuelve la configuración cuando están todas', () => {
        const env = {
            VITE_FIREBASE_API_KEY: 'key',
            VITE_FIREBASE_AUTH_DOMAIN: 'demo.firebaseapp.com',
            VITE_FIREBASE_PROJECT_ID: 'demo',
            VITE_FIREBASE_MESSAGING_SENDER_ID: '123',
            VITE_FIREBASE_APP_ID: '1:123:web:abc',
            VITE_FIREBASE_VAPID_KEY: 'vapid',
        };
        expect(readFirebaseConfig(env)).toEqual(config);
    });
});

describe('serviceWorkerUrl', () => {
    it('lleva la configuración en la URL, sin la clave VAPID', () => {
        const url = serviceWorkerUrl(config);
        expect(url).toContain('/firebase-messaging-sw.js?');
        expect(url).toContain('projectId=demo');
        expect(url).not.toContain('vapid');
    });
});

describe('requestBrowserPushToken', () => {
    beforeEach(() => {
        getToken.mockReset();
        isSupported.mockReset().mockResolvedValue(true);
        register.mockReset().mockResolvedValue({ scope: '/' });
    });
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('devuelve el token cuando el usuario da permiso', async () => {
        stubBrowser('granted');
        getToken.mockResolvedValue('device-token-1');

        await expect(requestBrowserPushToken(config)).resolves.toBe('device-token-1');
        expect(getToken).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ vapidKey: 'vapid' }),
        );
    });

    it('falla con "denied" si el usuario rechaza el permiso', async () => {
        stubBrowser('denied');

        await expect(requestBrowserPushToken(config)).rejects.toMatchObject({ code: 'denied' });
        expect(getToken).not.toHaveBeenCalled();
    });

    it('falla con "unsupported" si Firebase Messaging no es compatible', async () => {
        stubBrowser('granted');
        isSupported.mockResolvedValue(false);

        await expect(requestBrowserPushToken(config)).rejects.toMatchObject({
            code: 'unsupported',
        });
    });

    it('falla con "failed" si Firebase lanza un error', async () => {
        stubBrowser('granted');
        getToken.mockRejectedValue(new Error('messaging/token-subscribe-failed'));

        const error = await requestBrowserPushToken(config).catch((e: unknown) => e);
        expect(error).toBeInstanceOf(PushTokenError);
        expect(error).toMatchObject({ code: 'failed' });
    });

    it('falla con "failed" si Firebase no devuelve token', async () => {
        stubBrowser('granted');
        getToken.mockResolvedValue('');

        await expect(requestBrowserPushToken(config)).rejects.toMatchObject({ code: 'failed' });
    });
});
