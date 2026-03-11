interface Translation {
  'en-US': string;
  'fr-FR': string;
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
  
  const supportedLanguages = ['en-US', 'fr-FR'];
  
  // Se não tem traduções ou idioma não suportado, retorna valores originais
  if (!product.translations || !supportedLanguages.includes(language)) {
    return {
      name: product.name,
      description: product.description
    };
  }
  
  return {
    name: product.translations.name?.[language as keyof Translation] || product.name,
    description: product.translations.description?.[language as keyof Translation] || product.description
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
  
  const supportedLanguages = ['en-US', 'fr-FR'];
  
  // Se não tem traduções ou idioma não suportado, retorna valor original
  if (!category.translations || !supportedLanguages.includes(language)) {
    return category.name;
  }
  
  return category.translations.name?.[language as keyof Translation] || category.name;
};
