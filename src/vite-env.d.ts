/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_TENANT_ID: string;
    readonly VITE_AUTH_TOKEN?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
