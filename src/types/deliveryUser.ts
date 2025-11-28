export interface DeliveryUser {
  id: string;
  email: string;
  phone: string;
  name: string;
  address: string;
  defaultPaymentMethod: 'money' | 'credit' | 'debit' | 'pix';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDeliveryUserData {
  email: string;
  phone: string;
  name: string;
  address: string;
  defaultPaymentMethod: 'money' | 'credit' | 'debit' | 'pix';
}

