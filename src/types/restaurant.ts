/** Regra de taxa de entrega por distância (base + por km, min/máx, isenção por subtotal). */
export interface DeliveryFeeRule {
  baseFee: number;
  perKmFee: number;
  maxRadiusKm: number;
  minFee?: number;
  maxFee?: number;
  freeDeliveryAboveSubtotal?: number;
}

export interface Restaurant {
  id: string;
  name: string;
  domain: string;
  email: string;
  phone: string;
  address: string;
  password: string; // Senha criptografada com bcrypt
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
    imageMenuTransfer: boolean;
  };
  deliverySettings?: {
    enabled: boolean;
    aiDescription: string;
  };
  /** Stripe Connect — Express (IDs e flags sincronizados pelo backend). */
  stripeConnectAccountId?: string;
  stripeConnectChargesEnabled?: boolean;
  stripeConnectDetailsSubmitted?: boolean;
  stripeConnectPayoutsEnabled?: boolean;
  stripeConnectDisabledReason?: string | null;
  stripeConnectRequirementsSummary?: string | null;
}

export interface CreateRestaurantData {
  name: string;
  domain: string;
  email: string;
  phone: string;
  address: string;
  password: string; // Senha criptografada com bcrypt
  planId: string;  // Agora referencia o ID do plano ao invés de string fixa
  theme?: {
    primaryColor: string;
    secondaryColor: string;
    logo?: string;
  };
  permissions?: {
    automaticTranslation: boolean;
    imageMenuTransfer: boolean;
  };
  deliverySettings?: {
    enabled: boolean;
    aiDescription: string;
  };
}

export interface UpdateRestaurantData {
  name?: string;
  domain?: string;
  email?: string;
  phone?: string;
  address?: string;
  password?: string; // Senha criptografada com bcrypt
  planId?: string;
  theme?: {
    primaryColor: string;
    secondaryColor: string;
    logo?: string;
  };
  active?: boolean;
  permissions?: {
    automaticTranslation: boolean;
    imageMenuTransfer: boolean;
  };
  deliverySettings?: {
    enabled: boolean;
    aiDescription: string;
  };
}
