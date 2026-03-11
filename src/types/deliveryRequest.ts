export type DeliveryRequestStatus = 'PENDENTE' | 'ACEITA' | 'RECUSADA' | 'CANCELADA';

export interface DeliveryRequest {
  id: string;
  orderId: string;
  restaurantId: string;
  motoboyUserId: string | null;
  fee: number;
  status: DeliveryRequestStatus;
  createdAt: Date;
  updatedAt: Date;
  acceptedAt?: Date;
  completedAt?: Date;
}

export interface CreateDeliveryRequestData {
  orderId: string;
  restaurantId: string;
  fee: number;
}
