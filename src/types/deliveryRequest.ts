/**
 * Chamada/convite para motoboy buscar um pedido (tele/corrida).
 */
export type DeliveryRequestStatus = 'PENDENTE' | 'ACEITA' | 'RECUSADA' | 'CANCELADA' | 'CONCLUIDA';

export interface DeliveryRequest {
  id: string;
  orderId: string;
  restaurantId: string;
  /** Preenchido quando um motoboy aceita */
  motoboyUserId: string | null;
  /** Valor da tele/corrida (R$) que o motoboy receberá */
  fee: number;
  status: DeliveryRequestStatus;
  createdAt: Date;
  updatedAt: Date;
  /** Preenchido ao aceitar (para métricas de tempo médio) */
  acceptedAt?: Date | null;
  /** Preenchido quando a entrega é marcada como entregue */
  completedAt?: Date | null;
}

export interface CreateDeliveryRequestData {
  orderId: string;
  restaurantId: string;
  fee: number;
}
