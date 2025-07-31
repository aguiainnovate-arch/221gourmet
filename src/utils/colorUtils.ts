/**
 * Converte uma cor hex para variações de tons
 */
export const generateColorVariations = (hexColor: string) => {
  // Remove o # se existir
  const hex = hexColor.replace('#', '');
  
  // Converte hex para RGB
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  
  // Gera variações de tons
  const variations = {
    '50': lighten(r, g, b, 0.95),
    '100': lighten(r, g, b, 0.9),
    '200': lighten(r, g, b, 0.8),
    '300': lighten(r, g, b, 0.6),
    '400': lighten(r, g, b, 0.4),
    '500': `rgb(${r}, ${g}, ${b})`, // cor original
    '600': darken(r, g, b, 0.1),
    '700': darken(r, g, b, 0.2),
    '800': darken(r, g, b, 0.3),
    '900': darken(r, g, b, 0.4),
  };
  
  return variations;
};

/**
 * Escurece uma cor RGB
 */
const darken = (r: number, g: number, b: number, factor: number): string => {
  const newR = Math.round(r * (1 - factor));
  const newG = Math.round(g * (1 - factor));
  const newB = Math.round(b * (1 - factor));
  return `rgb(${newR}, ${newG}, ${newB})`;
};

/**
 * Clareia uma cor RGB
 */
const lighten = (r: number, g: number, b: number, factor: number): string => {
  const newR = Math.round(r + (255 - r) * factor);
  const newG = Math.round(g + (255 - g) * factor);
  const newB = Math.round(b + (255 - b) * factor);
  return `rgb(${newR}, ${newG}, ${newB})`;
};

/**
 * Aplica as cores customizadas ao documento
 */
export const applyCustomColors = (primaryColor: string, secondaryColor: string) => {
  const primaryVariations = generateColorVariations(primaryColor);
  const secondaryVariations = generateColorVariations(secondaryColor);
  
  // Remove estilos customizados anteriores
  const existingStyle = document.getElementById('custom-colors');
  if (existingStyle) {
    existingStyle.remove();
  }
  
  // Cria novo estilo
  const style = document.createElement('style');
  style.id = 'custom-colors';
  
  // Define as variáveis CSS customizadas
  style.innerHTML = `
    :root {
      --primary-50: ${primaryVariations['50']};
      --primary-100: ${primaryVariations['100']};
      --primary-200: ${primaryVariations['200']};
      --primary-300: ${primaryVariations['300']};
      --primary-400: ${primaryVariations['400']};
      --primary-500: ${primaryVariations['500']};
      --primary-600: ${primaryVariations['600']};
      --primary-700: ${primaryVariations['700']};
      --primary-800: ${primaryVariations['800']};
      --primary-900: ${primaryVariations['900']};
      
      --secondary-50: ${secondaryVariations['50']};
      --secondary-100: ${secondaryVariations['100']};
      --secondary-200: ${secondaryVariations['200']};
      --secondary-300: ${secondaryVariations['300']};
      --secondary-400: ${secondaryVariations['400']};
      --secondary-500: ${secondaryVariations['500']};
      --secondary-600: ${secondaryVariations['600']};
      --secondary-700: ${secondaryVariations['700']};
      --secondary-800: ${secondaryVariations['800']};
      --secondary-900: ${secondaryVariations['900']};
    }
    
    /* Sobrescreve as cores do Tailwind */
    .bg-primary-50 { background-color: var(--primary-50) !important; }
    .bg-primary-100 { background-color: var(--primary-100) !important; }
    .bg-primary-200 { background-color: var(--primary-200) !important; }
    .bg-primary-300 { background-color: var(--primary-300) !important; }
    .bg-primary-400 { background-color: var(--primary-400) !important; }
    .bg-primary-500 { background-color: var(--primary-500) !important; }
    .bg-primary-600 { background-color: var(--primary-600) !important; }
    .bg-primary-700 { background-color: var(--primary-700) !important; }
    .bg-primary-800 { background-color: var(--primary-800) !important; }
    .bg-primary-900 { background-color: var(--primary-900) !important; }
    
    .text-primary-50 { color: var(--primary-50) !important; }
    .text-primary-100 { color: var(--primary-100) !important; }
    .text-primary-200 { color: var(--primary-200) !important; }
    .text-primary-300 { color: var(--primary-300) !important; }
    .text-primary-400 { color: var(--primary-400) !important; }
    .text-primary-500 { color: var(--primary-500) !important; }
    .text-primary-600 { color: var(--primary-600) !important; }
    .text-primary-700 { color: var(--primary-700) !important; }
    .text-primary-800 { color: var(--primary-800) !important; }
    .text-primary-900 { color: var(--primary-900) !important; }
    
    .border-primary-200 { border-color: var(--primary-200) !important; }
    .border-primary-300 { border-color: var(--primary-300) !important; }
    .border-primary-400 { border-color: var(--primary-400) !important; }
    
    .divide-primary-200 > :not([hidden]) ~ :not([hidden]) {
      border-color: var(--primary-200) !important;
    }
    
    /* Classes secundárias */
    .bg-secondary-50 { background-color: var(--secondary-50) !important; }
    .bg-secondary-100 { background-color: var(--secondary-100) !important; }
    .bg-secondary-200 { background-color: var(--secondary-200) !important; }
    .bg-secondary-300 { background-color: var(--secondary-300) !important; }
    .bg-secondary-400 { background-color: var(--secondary-400) !important; }
    .bg-secondary-500 { background-color: var(--secondary-500) !important; }
    .bg-secondary-600 { background-color: var(--secondary-600) !important; }
    .bg-secondary-700 { background-color: var(--secondary-700) !important; }
    .bg-secondary-800 { background-color: var(--secondary-800) !important; }
    .bg-secondary-900 { background-color: var(--secondary-900) !important; }
    
    .text-secondary-50 { color: var(--secondary-50) !important; }
    .text-secondary-100 { color: var(--secondary-100) !important; }
    .text-secondary-200 { color: var(--secondary-200) !important; }
    .text-secondary-300 { color: var(--secondary-300) !important; }
    .text-secondary-400 { color: var(--secondary-400) !important; }
    .text-secondary-500 { color: var(--secondary-500) !important; }
    .text-secondary-600 { color: var(--secondary-600) !important; }
    .text-secondary-700 { color: var(--secondary-700) !important; }
    .text-secondary-800 { color: var(--secondary-800) !important; }
    .text-secondary-900 { color: var(--secondary-900) !important; }
    
    .border-secondary-200 { border-color: var(--secondary-200) !important; }
    .border-secondary-300 { border-color: var(--secondary-300) !important; }
    .border-secondary-400 { border-color: var(--secondary-400) !important; }
    
    .divide-secondary-200 > :not([hidden]) ~ :not([hidden]) {
      border-color: var(--secondary-200) !important;
    }
    
    /* Hover states */
    .hover\\:bg-primary-200:hover { background-color: var(--primary-200) !important; }
    .hover\\:bg-primary-300:hover { background-color: var(--primary-300) !important; }
    .hover\\:bg-primary-900:hover { background-color: var(--primary-900) !important; }
    .hover\\:bg-secondary-200:hover { background-color: var(--secondary-200) !important; }
    .hover\\:bg-secondary-300:hover { background-color: var(--secondary-300) !important; }
    .hover\\:bg-secondary-400:hover { background-color: var(--secondary-400) !important; }
    .hover\\:bg-secondary-50:hover { background-color: var(--secondary-50) !important; }
    
    /* Classes de focus para inputs */
    .focus\\:ring-primary-500:focus { 
      --tw-ring-color: var(--primary-500) !important; 
    }
    
    /* Classes de shadow */
    .shadow-primary { 
      --tw-shadow-color: var(--primary-200) !important; 
    }
  `;
  
  // Adiciona ao head do documento
  document.head.appendChild(style);
};