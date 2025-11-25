export type PermissionKey = 'automaticTranslation' | 'imageMenuTransfer' | 'delivery';

export interface Permission {
  key: PermissionKey;
  name: string;
  description: string;
  enabled: boolean;
}

export interface RestaurantPermissions {
  restaurantId: string;
  permissions: Record<PermissionKey, boolean>;
  updatedAt: Date;
}

export interface PlanPermissions {
  planId: string;
  permissions: Record<PermissionKey, boolean>;
  updatedAt: Date;
}

export const PERMISSION_DEFINITIONS: Record<PermissionKey, { name: string; description: string }> = {
  automaticTranslation: {
    name: 'Tradução Automática de Cardápio',
    description: 'Permite tradução automática de produtos e categorias usando IA'
  },
  imageMenuTransfer: {
    name: 'Transferência de Cardápio por Imagem',
    description: 'Permite extrair produtos de cardápios através de imagens usando IA'
  },
  delivery: {
    name: 'Serviço de Delivery',
    description: 'Permite que o restaurante apareça na plataforma de delivery'
  }
};

export const DEFAULT_PERMISSIONS: Record<PermissionKey, boolean> = {
  automaticTranslation: false,
  imageMenuTransfer: false,
  delivery: true
};
