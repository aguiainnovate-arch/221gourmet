interface Translation {
  'en-US': string;
  'es-ES': string;
  'fr-FR': string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  available: boolean;
  image?: string;
  allergens?: string[];
  preparationTime?: number; // em minutos
  tags?: string[];
  // Traduções
  translations?: {
    name?: Translation;
    description?: Translation;
  };
}
