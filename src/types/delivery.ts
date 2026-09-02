export interface DeliveryOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  observations?: string;
}

/** Entrega com motoboy ou retirada no estabelecimento (sem frete). */
export type FulfillmentType = 'delivery' | 'pickup';

export interface DeliveryOrder {
  id: string;
  restaurantId: string;
  restaurantName: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: DeliveryOrderItem[];
  /** Já inclui a taxa de entrega. Não somar deliveryFee de novo. */
  total: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'delivering' | 'delivered' | 'cancelled';
  paymentMethod: 'money' | 'credit' | 'debit' | 'pix' | 'stripe';
  deliveryFee: number;
  /** Padrão: delivery. pickup = retirada na loja (sem motoboy/frete). */
  fulfillmentType?: FulfillmentType;
  /**
   * Valor em dinheiro que o cliente vai pagar (ex.: 50 = nota de R$ 50).
   * Só faz sentido com paymentMethod === 'money'.
   */
  cashChangeFor?: number;
  /** Troco calculado: cashChangeFor - total (quando informado). */
  cashChangeAmount?: number;
  stripePaymentIntentId?: string;
  asaasPaymentId?: string;
  pixCopyPaste?: string;
  pixQrCodeImage?: string;
  pixInvoiceUrl?: string;
  pixStatus?: string;
  observations?: string;
  cancellationReason?: string;
  motoboyUserId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDeliveryOrderData {
  restaurantId: string;
  restaurantName: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: DeliveryOrderItem[];
  total: number;
  paymentMethod: 'money' | 'credit' | 'debit' | 'pix' | 'stripe';
  deliveryFee: number;
  fulfillmentType?: FulfillmentType;
  cashChangeFor?: number;
  cashChangeAmount?: number;
  stripePaymentIntentId?: string;
  asaasPaymentId?: string;
  pixCopyPaste?: string;
  pixQrCodeImage?: string;
  pixInvoiceUrl?: string;
  pixStatus?: string;
  observations?: string;
}
