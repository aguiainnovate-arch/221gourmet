// Configuração de cores do projeto Noctis
// Este arquivo centraliza todas as cores principais para fácil customização

export const colors = {
  // Cor primária - Usada para botões principais, links e elementos de destaque
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6', // Cor principal
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },

  // Cor secundária - Usada para elementos complementares e hover states
  secondary: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b', // Cor secundária
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },

  // Cor de sucesso - Usada para confirmações, checkouts e ações positivas
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e', // Cor de sucesso
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },

  // Cor de destaque/accent - Usada para promoções, destaques e elementos especiais
  accent: {
    50: '#fef7ee',
    100: '#fdedd4',
    200: '#fbd7a8',
    300: '#f8bb71',
    400: '#f59538',
    500: '#f2741f', // Cor de destaque
    600: '#e35a13',
    700: '#bc4513',
    800: '#963816',
    900: '#7a3015',
  },
} as const;

// Tipos TypeScript para as cores
export type ColorShade = '50' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
export type ColorName = keyof typeof colors;

// Função helper para obter uma cor específica
export const getColor = (colorName: ColorName, shade: ColorShade = '500') => {
  return colors[colorName][shade];
};

// Configuração de tema (pode ser expandida para diferentes restaurantes)
export const theme = {
  colors,
  // Outras configurações de tema podem ser adicionadas aqui
  // fontFamily: { ... },
  // spacing: { ... },
  // borderRadius: { ... },
} as const;

export default theme; 