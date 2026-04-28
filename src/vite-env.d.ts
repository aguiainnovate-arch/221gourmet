/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_OPENAI_API_KEY?: string;
  /** Ativa o emulador local de Firebase Functions em dev. Defina como 'true' e rode: firebase emulators:start --only functions */
  readonly VITE_USE_FUNCTIONS_EMULATOR?: string;
  readonly VITE_APP_URL?: string;
  readonly VITE_UNSPLASH_ACCESS_KEY?: string;
  /** Chave publicável Stripe (pk_...) — segura no front; nunca use sk_ aqui. */
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.svg" {
  const content: string;
  export default content;
}
