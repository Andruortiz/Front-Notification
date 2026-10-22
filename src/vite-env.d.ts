/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_AUTH_TOKEN?: string;
    readonly VITE_PDP_URL?: string;
    readonly VITE_SECURITY_UI_URL?: string;
    readonly VITE_APPLICATION_NAME?: string;
    readonly VITE_FIREBASE_API_KEY?: string;
    readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
    readonly VITE_FIREBASE_PROJECT_ID?: string;
    readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
    readonly VITE_FIREBASE_APP_ID?: string;
    readonly VITE_FIREBASE_VAPID_KEY?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
