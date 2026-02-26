export interface DeliveryOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  observations?: string;
}

export interface DeliveryOrder {
  id: string;
  restaurantId: string;
  restaurantName: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: DeliveryOrderItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready_for_delivery' | 'delivering' | 'delivered' | 'cancelled';
  /** ID do usuário motoboy que aceitou a entrega (se houver) */
  motoboyUserId?: string | null;
  paymentMethod: 'money' | 'credit' | 'debit' | 'pix';
  deliveryFee: number;
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
  observations?: string;
}
