/// <reference types="vite/client" />

/**
 * Customized environment variables
 */
interface ImportMetaEnv {
    readonly VITE_BACKEND_URL?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
