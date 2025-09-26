export interface Restaurant {
  id: string;
  name: string;
  domain: string;
  email: string;
  phone: string;
  address: string;
  planId?: string;  // Opcional para compatibilidade com restaurantes antigos
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  theme?: {
    primaryColor: string;
    secondaryColor: string;
    logo?: string;
  };
  settings?: {
    maxTables: number;
    allowOnlineOrders: boolean;
    enableAnalytics: boolean;
  };
  permissions?: {
    automaticTranslation: boolean;
  };
}

export interface CreateRestaurantData {
  name: string;
  domain: string;
  email: string;
  phone: string;
  address: string;
  planId: string;  // Agora referencia o ID do plano ao invés de string fixa
  theme?: {
    primaryColor: string;
    secondaryColor: string;
    logo?: string;
  };
  permissions?: {
    automaticTranslation: boolean;
  };
}

export interface UpdateRestaurantData {
  name?: string;
  domain?: string;
  email?: string;
  phone?: string;
  address?: string;
  planId?: string;
  theme?: {
    primaryColor: string;
    secondaryColor: string;
    logo?: string;
  };
  active?: boolean;
  permissions?: {
    automaticTranslation: boolean;
  };
}
