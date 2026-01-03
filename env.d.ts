/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_ENV: string
  readonly VITE_API_BASE_URL?: string
  readonly VITE_API_SCHEME: string
  readonly VITE_API_PORT: string
  readonly VITE_API_PATH_PREFIX: string
  readonly VITE_CENTRAL_HOST?: string
  readonly VITE_CENTRAL_DOMAINS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
