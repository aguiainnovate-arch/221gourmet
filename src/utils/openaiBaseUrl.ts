import { Capacitor } from '@capacitor/core';

/**
 * Web: proxy same-origin (Vite dev / Netlify) evita CORS.
 * App nativo (Capacitor): chama api.openai.com direto via nativeFetch().
 */
export function getOpenAIBaseURL(): string {
  if (Capacitor.isNativePlatform()) {
    return 'https://api.openai.com/v1';
  }
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/__proxy-openai/v1`;
  }
  return 'https://api.openai.com/v1';
}
