export interface Restaurant {
  id: string;
  name: string;
  domain: string;
  email: string;
  phone: string;
  address: string;
  plan: 'basic' | 'premium' | 'enterprise';
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
}

export interface CreateRestaurantData {
  name: string;
  domain: string;
  email: string;
  phone: string;
  address: string;
  plan: 'basic' | 'premium' | 'enterprise';
  theme?: {
    primaryColor: string;
    secondaryColor: string;
    logo?: string;
  };
}
