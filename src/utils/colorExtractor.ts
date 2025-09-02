export interface ExtractedColors {
  primaryColor: string;
  secondaryColor: string;
  palette: string[];
}

/**
 * Extrai cores dominantes de uma imagem contornando problemas de CORS
 * @param imageUrl - URL da imagem para análise
 * @returns Promise com as cores extraídas
 */
export const extractColorsFromImage = async (imageUrl: string): Promise<ExtractedColors> => {
  return new Promise((resolve, reject) => {
    console.log('Iniciando extração de cores para:', imageUrl);
    
    // Criar uma imagem com crossOrigin configurado
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        console.log('Imagem carregada, dimensões:', img.width, 'x', img.height);
        
        // Criar canvas para processar a imagem
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Não foi possível criar contexto do canvas'));
          return;
        }
        
        // Definir dimensões do canvas (reduzir para melhor performance)
        const maxSize = 150;
        const scale = Math.min(maxSize / img.width, maxSize / img.height);
        canvas.width = Math.floor(img.width * scale);
        canvas.height = Math.floor(img.height * scale);
        
        console.log('Canvas criado, dimensões:', canvas.width, 'x', canvas.height);
        
        // Desenhar imagem no canvas
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Extrair dados da imagem
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        console.log('Dados da imagem extraídos, pixels:', data.length / 4);
        
        // Analisar pixels e criar histograma de cores
        const colorMap = new Map<string, number>();
        
        // Pular pixels para melhor performance
        for (let i = 0; i < data.length; i += 16) { // Amostragem de 1 em cada 4 pixels
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          
          // Ignorar pixels transparentes
          if (a < 128) continue;
          
          // Quantizar cores para reduzir variações (grupos de 64)
          const quantizedR = Math.floor(r / 64) * 64;
          const quantizedG = Math.floor(g / 64) * 64;
          const quantizedB = Math.floor(b / 64) * 64;
          
          const colorKey = `${quantizedR},${quantizedG},${quantizedB}`;
          colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
        }
        
        console.log('Histograma criado, cores únicas:', colorMap.size);
        
        // Filtrar cores muito claras ou muito escuras
        const filteredColors = Array.from(colorMap.entries())
          .filter(([colorKey, count]) => {
            const [r, g, b] = colorKey.split(',').map(Number);
            const brightness = (r + g + b) / 3;
            const isNotTooLight = brightness < 240;
            const isNotTooDark = brightness > 15;
            const hasMinimumCount = count > 2;
            return isNotTooLight && isNotTooDark && hasMinimumCount;
          });
        
        // Ordenar cores por frequência
        const sortedColors = filteredColors
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6) // Top 6 cores
          .map(([colorKey]) => {
            const [r, g, b] = colorKey.split(',').map(Number);
            return rgbToHex(r, g, b);
          });
        
        console.log('Cores filtradas e ordenadas:', sortedColors);
        
        if (sortedColors.length === 0) {
          // Fallback para cores padrão se não encontrar cores válidas
          console.log('Nenhuma cor válida encontrada, usando cores padrão');
          resolve({
            primaryColor: '#3b82f6',
            secondaryColor: '#f8fafc',
            palette: ['#3b82f6', '#1e40af', '#64748b', '#f8fafc']
          });
          return;
        }
        
        // Selecionar cores primária e secundária
        const primaryColor = sortedColors[0];
        const secondaryColor = selectSecondaryColor(sortedColors, primaryColor);
        
        console.log('Cores selecionadas - Primária:', primaryColor, 'Secundária:', secondaryColor);
        
        resolve({
          primaryColor,
          secondaryColor,
          palette: sortedColors
        });
        
      } catch (error) {
        console.error('Erro durante processamento da imagem:', error);
        reject(new Error(`Erro ao processar imagem: ${error}`));
      }
    };
    
    img.onerror = (error) => {
      console.error('Erro ao carregar imagem:', error);
      console.log('Tentando carregar sem crossOrigin...');
      
      // Tentar novamente sem crossOrigin
      const img2 = new Image();
      
      img2.onload = () => {
        try {
          // Mesmo processo, mas sem crossOrigin
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Não foi possível criar contexto do canvas'));
            return;
          }
          
          const maxSize = 150;
          const scale = Math.min(maxSize / img2.width, maxSize / img2.height);
          canvas.width = Math.floor(img2.width * scale);
          canvas.height = Math.floor(img2.height * scale);
          
          ctx.drawImage(img2, 0, 0, canvas.width, canvas.height);
          
          // Tentar extrair dados (pode falhar devido ao CORS)
          try {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            const colorMap = new Map<string, number>();
            
            for (let i = 0; i < data.length; i += 16) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              const a = data[i + 3];
              
              if (a < 128) continue;
              
              const quantizedR = Math.floor(r / 64) * 64;
              const quantizedG = Math.floor(g / 64) * 64;
              const quantizedB = Math.floor(b / 64) * 64;
              
              const colorKey = `${quantizedR},${quantizedG},${quantizedB}`;
              colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
            }
            
            const filteredColors = Array.from(colorMap.entries())
              .filter(([colorKey, count]) => {
                const [r, g, b] = colorKey.split(',').map(Number);
                const brightness = (r + g + b) / 3;
                return brightness < 240 && brightness > 15 && count > 2;
              });
            
            const sortedColors = filteredColors
              .sort((a, b) => b[1] - a[1])
              .slice(0, 6)
              .map(([colorKey]) => {
                const [r, g, b] = colorKey.split(',').map(Number);
                return rgbToHex(r, g, b);
              });
            
            if (sortedColors.length > 0) {
              const primaryColor = sortedColors[0];
              const secondaryColor = selectSecondaryColor(sortedColors, primaryColor);
              
              resolve({
                primaryColor,
                secondaryColor,
                palette: sortedColors
              });
            } else {
              throw new Error('Nenhuma cor encontrada');
            }
            
          } catch (canvasError) {
            // Se ainda falhar, retornar cores baseadas na URL ou padrão
            console.error('Erro ao acessar dados do canvas:', canvasError);
            
            // Tentar extrair cores do nome do arquivo ou usar padrão
            const fallbackColors = generateFallbackColors(imageUrl);
            resolve(fallbackColors);
          }
          
        } catch (error2) {
          console.error('Erro na segunda tentativa:', error2);
          const fallbackColors = generateFallbackColors(imageUrl);
          resolve(fallbackColors);
        }
      };
      
      img2.onerror = () => {
        console.error('Falha total ao carregar imagem');
        const fallbackColors = generateFallbackColors(imageUrl);
        resolve(fallbackColors);
      };
      
      img2.src = imageUrl;
    };
    
    img.src = imageUrl;
  });
};

/**
 * Gera cores de fallback baseadas na URL ou padrão
 */
const generateFallbackColors = (imageUrl: string): ExtractedColors => {
  // Cores padrão baseadas no tema do restaurante
  const defaultPalettes: ExtractedColors[] = [
    { primaryColor: '#dc2626', secondaryColor: '#fef2f2', palette: ['#dc2626', '#991b1b', '#64748b', '#f8fafc'] }, // Vermelho
    { primaryColor: '#059669', secondaryColor: '#f0fdf4', palette: ['#059669', '#047857', '#64748b', '#f8fafc'] }, // Verde
    { primaryColor: '#d97706', secondaryColor: '#fffbeb', palette: ['#d97706', '#92400e', '#64748b', '#f8fafc'] }, // Laranja
    { primaryColor: '#7c3aed', secondaryColor: '#faf5ff', palette: ['#7c3aed', '#5b21b6', '#64748b', '#f8fafc'] }, // Roxo
    { primaryColor: '#0891b2', secondaryColor: '#f0f9ff', palette: ['#0891b2', '#0e7490', '#64748b', '#f8fafc'] }, // Azul
  ];
  
  // Usar hash da URL para escolher uma paleta consistente
  const hash = imageUrl.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  const paletteIndex = Math.abs(hash) % defaultPalettes.length;
  
  console.log('Usando paleta de fallback:', paletteIndex);
  return defaultPalettes[paletteIndex];
};

/**
 * Converte valores RGB para hexadecimal
 */
const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (c: number) => {
    const hex = c.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

/**
 * Seleciona uma cor secundária que tenha bom contraste com a primária
 */
const selectSecondaryColor = (palette: string[], primaryColor: string): string => {
  // Se temos apenas uma cor, retornar uma cor clara como secundária
  if (palette.length === 1) {
    return '#f8fafc'; // Cor clara neutra
  }
  
  // Tentar encontrar uma cor com bom contraste
  for (let i = 1; i < palette.length; i++) {
    const contrast = calculateContrast(primaryColor, palette[i]);
    if (contrast > 2.5) { // Contraste mínimo aceitável
      return palette[i];
    }
  }
  
  // Se não encontrar bom contraste, usar uma cor clara
  return '#f8fafc';
};

/**
 * Calcula o contraste entre duas cores
 */
const calculateContrast = (color1: string, color2: string): number => {
  const luminance1 = getLuminance(color1);
  const luminance2 = getLuminance(color2);
  
  const brightest = Math.max(luminance1, luminance2);
  const darkest = Math.min(luminance1, luminance2);
  
  return (brightest + 0.05) / (darkest + 0.05);
};

/**
 * Calcula a luminância de uma cor
 */
const getLuminance = (hexColor: string): number => {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return 0;
  
  const { r, g, b } = rgb;
  
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

/**
 * Converte cor hexadecimal para RGB
 */
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

/**
 * Gera variações de uma cor (mais claro/mais escuro)
 */
export const generateColorVariations = (baseColor: string): string[] => {
  const rgb = hexToRgb(baseColor);
  if (!rgb) return [baseColor];
  
  const variations = [];
  
  // Cor base
  variations.push(baseColor);
  
  // Variações mais claras
  for (let i = 1; i <= 3; i++) {
    const lighter = {
      r: Math.min(255, rgb.r + (i * 30)),
      g: Math.min(255, rgb.g + (i * 30)),
      b: Math.min(255, rgb.b + (i * 30))
    };
    variations.push(rgbToHex(lighter.r, lighter.g, lighter.b));
  }
  
  // Variações mais escuras
  for (let i = 1; i <= 3; i++) {
    const darker = {
      r: Math.max(0, rgb.r - (i * 30)),
      g: Math.max(0, rgb.g - (i * 30)),
      b: Math.max(0, rgb.b - (i * 30))
    };
    variations.push(rgbToHex(darker.r, darker.g, darker.b));
  }
  
  return variations;
};
