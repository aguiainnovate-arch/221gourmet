export interface DeliveryUser {
  id: string;
  email: string;
  phone: string;
  name: string;
  address: string;
  defaultPaymentMethod: 'money' | 'credit' | 'debit' | 'pix' | 'stripe';
  /** Customer ID na Stripe (para salvar cartões). Preenchido sob demanda. */
  stripeCustomerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDeliveryUserData {
  email: string;
  phone: string;
  name: string;
  address: string;
  defaultPaymentMethod: 'money' | 'credit' | 'debit' | 'pix' | 'stripe';
  stripeCustomerId?: string;
}

