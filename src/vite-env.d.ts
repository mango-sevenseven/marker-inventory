/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_REMOTE_STORAGE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
