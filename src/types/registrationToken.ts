export interface RegistrationToken {
  id: string;
  token: string;
  planId: string;
  planName?: string; // Para facilitar exibição
  expiresAt: Date;
  used: boolean;
  usedAt?: Date;
  restaurantId?: string; // ID do restaurante criado com este token
  createdAt: Date;
  createdBy: string; // Email do admin que criou
  metadata?: {
    notes?: string; // Notas sobre para quem/porque foi criado
  };
}

export interface CreateRegistrationTokenData {
  planId: string;
  expiresIn?: number; // Dias até expirar (padrão: 7)
  metadata?: {
    notes?: string;
  };
}

export interface ValidateTokenResult {
  valid: boolean;
  token?: RegistrationToken;
  error?: string;
}

