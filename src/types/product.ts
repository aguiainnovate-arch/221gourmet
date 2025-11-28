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
  restaurantId?: string; // Opcional para compatibilidade
  preparationTime?: number; // em minutos
  availableForDelivery?: boolean; // Se o produto está disponível para delivery
  // Traduções
  translations?: {
    name?: Translation;
    description?: Translation;
  };
}
