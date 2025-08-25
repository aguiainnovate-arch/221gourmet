interface Translation {
  'en-US': string;
  // Adicionar outros idiomas aqui no futuro
}

interface ProductTranslations {
  name?: Translation;
  description?: Translation;
}

interface CategoryTranslations {
  name?: Translation;
}

/**
 * Obtém a tradução do produto baseada no idioma atual
 */
export const getProductTranslation = (
  product: {
    name: string;
    description: string;
    translations?: ProductTranslations;
  },
  language: string
): { name: string; description: string } => {
  // Se for português, sempre usa os valores originais
  if (language === 'pt-BR') {
    return {
      name: product.name,
      description: product.description
    };
  }
  
  const supportedLanguage = language as 'en-US';
  
  // Se não tem traduções ou idioma não suportado, retorna valores originais
  if (!product.translations || !['en-US'].includes(supportedLanguage)) {
    return {
      name: product.name,
      description: product.description
    };
  }
  
  return {
    name: product.translations.name?.[supportedLanguage] || product.name,
    description: product.translations.description?.[supportedLanguage] || product.description
  };
};

/**
 * Obtém a tradução da categoria baseada no idioma atual
 */
export const getCategoryTranslation = (
  category: {
    name: string;
    translations?: CategoryTranslations;
  },
  language: string
): string => {
  // Se for português, sempre usa o valor original
  if (language === 'pt-BR') {
    return category.name;
  }
  
  const supportedLanguage = language as 'en-US';
  
  // Se não tem traduções ou idioma não suportado, retorna valor original
  if (!category.translations || !['en-US'].includes(supportedLanguage)) {
    return category.name;
  }
  
  return category.translations.name?.[supportedLanguage] || category.name;
};
