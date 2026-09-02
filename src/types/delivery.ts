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
  status: 'pending' | 'confirmed' | 'preparing' | 'ready_for_delivery' | 'delivering' | 'delivered' | 'cancelled';
  /** ID do usuário motoboy que aceitou a entrega (se houver) */
  motoboyUserId?: string | null;
  paymentMethod: 'money' | 'credit' | 'debit' | 'pix';
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
  observations?: string;
  cancellationReason?: string;
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
  paymentMethod: 'money' | 'credit' | 'debit' | 'pix';
  deliveryFee: number;
  fulfillmentType?: FulfillmentType;
  cashChangeFor?: number;
  cashChangeAmount?: number;
  observations?: string;
}
