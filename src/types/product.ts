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
  preparationTime?: number; // em minutos
  // Traduções
  translations?: {
    name?: Translation;
    description?: Translation;
  };
}
