interface Translation {
  'en-US': string;
  'fr-FR': string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  /** Preço no salão / cardápio digital (QR da mesa). */
  price: number;
  /** Preço no delivery. Se ausente, usa `price`. */
  deliveryPrice?: number;
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

export function getDeliveryPrice(product: Pick<Product, 'price' | 'deliveryPrice'>): number {
  if (typeof product.deliveryPrice === 'number' && Number.isFinite(product.deliveryPrice) && product.deliveryPrice >= 0) {
    return product.deliveryPrice;
  }
  return product.price;
}

/** Usa o preço do canal no campo `price` (carrinho, checkout e cards). */
export function withChannelPrice(product: Product, channel: 'mesa' | 'delivery'): Product {
  if (channel === 'delivery') {
    return { ...product, price: getDeliveryPrice(product) };
  }
  return product;
}
