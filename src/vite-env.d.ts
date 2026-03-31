/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_OPENAI_API_KEY?: string;
  /** URL completa do POST de moderação (ex.: https://seusite.com/api/moderate-lead). Opcional; sem isso, em produção o cliente chama api.openai.com direto (pode falhar por CORS no browser). */
  readonly VITE_OPENAI_MODERATION_URL?: string;
  readonly VITE_ANTHROPIC_API_KEY?: string;
  readonly VITE_APP_URL?: string;
  readonly VITE_UNSPLASH_ACCESS_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.svg" {
  const content: string;
  export default content;
}
