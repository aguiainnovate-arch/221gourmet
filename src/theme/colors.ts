/**
 * Paleta de cores Noctis - identidade visual (noite/azul/neon)
 * Use em todo o app para consistência.
 */
export const noctisColors = {
  background: '#050A1A',
  surface: '#0B1630',
  primary: '#2F7BFF',
  primaryGlow: '#7CCBFF',
  accent: '#00D4FF',
  textPrimary: '#EAF2FF',
  textSecondary: '#A9B8D6',
  border: '#1B2A4A',
  danger: '#FF4D6D',
} as const;

/** Gradiente sugerido: background → surface → azul médio */
export const noctisGradient = 'linear-gradient(180deg, #050A1A 0%, #0B1630 50%, #0A2A5E 100%)';

export type NoctisColorKey = keyof typeof noctisColors;

export default noctisColors;
