import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  doc,
  query,
  where,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../firebase';
import type { DeliveryOrder, CreateDeliveryOrderData } from '../types/delivery';
import { addOrder } from './orderService';

// Re-exportar os tipos para facilitar imports
export type { DeliveryOrder, CreateDeliveryOrderData } from '../types/delivery';

/** Converte documento Firestore em DeliveryOrder */
function docToOrder(docId: string, data: Record<string, unknown>): DeliveryOrder {
  return {
    id: docId,
    restaurantId: data.restaurantId as string,
    restaurantName: data.restaurantName as string,
    customerName: data.customerName as string,
    customerPhone: data.customerPhone as string,
    customerAddress: data.customerAddress as string,
    items: (data.items as DeliveryOrder['items']) || [],
    total: (data.total as number) ?? 0,
    status: (data.status as DeliveryOrder['status']) || 'pending',
    motoboyUserId: data.motoboyUserId as string | null | undefined,
    paymentMethod: (data.paymentMethod as DeliveryOrder['paymentMethod']) || 'money',
    deliveryFee: (data.deliveryFee as number) ?? 0,
    stripePaymentIntentId: data.stripePaymentIntentId as string | undefined,
    asaasPaymentId: data.asaasPaymentId as string | undefined,
    pixCopyPaste: data.pixCopyPaste as string | undefined,
    pixQrCodeImage: data.pixQrCodeImage as string | undefined,
    pixInvoiceUrl: data.pixInvoiceUrl as string | undefined,
    pixStatus: data.pixStatus as string | undefined,
    observations: data.observations as string | undefined,
    cancellationReason: data.cancellationReason as string | undefined,
    createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.() || new Date(),
    updatedAt: (data.updatedAt as { toDate?: () => Date })?.toDate?.() || new Date()
  };
}

// Função auxiliar para traduzir método de pagamento
const translatePaymentMethod = (method: string): string => {
  const labels: Record<string, string> = {
    'money': 'Dinheiro',
    'credit': 'Cartão de Crédito',
    'debit': 'Cartão de Débito',
    'pix': 'PIX',
    'stripe': 'Cartão online (Stripe)',
  };
  return labels[method] || method;
};

/** Buscar um pedido de delivery por ID (para painel do motoboy, etc.) */
export const getDeliveryOrderById = async (orderId: string): Promise<DeliveryOrder | null> => {
  try {
    const orderRef = doc(db, 'deliveries', orderId);
    const snap = await getDoc(orderRef);
    if (!snap.exists()) return null;
    return docToOrder(snap.id, snap.data());
  } catch (error) {
    console.error('Erro ao buscar pedido:', error);
    return null;
  }
};

// Buscar pedidos de delivery por cliente (usando telefone como identificador)
export const getDeliveryOrdersByPhone = async (phone: string): Promise<DeliveryOrder[]> => {
  try {
    // Primeiro buscar por telefone
    const q = query(
      collection(db, 'deliveries'),
      where('customerPhone', '==', phone)
    );

    const querySnapshot = await getDocs(q);
    const orders: DeliveryOrder[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      orders.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as DeliveryOrder);
    });

    // Ordenar no cliente por data de criação (mais recente primeiro)
    return orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error) {
    console.error('Erro ao buscar pedidos de delivery:', error);
    throw new Error('Falha ao buscar pedidos');
  }
};

/**
 * Inscreve para atualizações em tempo real dos pedidos do cliente (por telefone).
 * Qualquer mudança de status no Firestore atualiza a lista na hora.
 * Retorna função para cancelar a inscrição.
 */
export function subscribeDeliveryOrdersByPhone(
  phone: string,
  onOrders: (orders: DeliveryOrder[]) => void
): () => void {
  const q = query(
    collection(db, 'deliveries'),
    where('customerPhone', '==', phone)
  );
  return onSnapshot(q, (snapshot) => {
    const orders: DeliveryOrder[] = snapshot.docs.map((d) =>
      docToOrder(d.id, d.data())
    );
    orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    onOrders(orders);
  }, (err) => {
    console.error('Erro no listener de pedidos por telefone:', err);
  });
}

// Atualizar status do pedido
export const updateDeliveryOrderStatus = async (orderId: string, status: DeliveryOrder['status']): Promise<void> => {
  try {
    const orderRef = doc(db, 'deliveries', orderId);
    await updateDoc(orderRef, {
      status,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Erro ao atualizar status do pedido:', error);
    throw new Error('Falha ao atualizar pedido');
  }
};

/** Atualiza pedido quando motoboy aceita: status delivering + motoboyUserId */
export const assignMotoboyToDeliveryOrder = async (
  orderId: string,
  motoboyUserId: string
): Promise<void> => {
  try {
    const orderRef = doc(db, 'deliveries', orderId);
    await updateDoc(orderRef, {
      status: 'delivering',
      motoboyUserId,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Erro ao atribuir motoboy ao pedido:', error);
    throw new Error('Falha ao atualizar pedido');
  }
};

// Cancelar/recusar pedido de delivery
export const cancelDeliveryOrder = async (orderId: string, reason?: string): Promise<void> => {
  try {
    const orderRef = doc(db, 'deliveries', orderId);
    await updateDoc(orderRef, {
      status: 'cancelled',
      updatedAt: Timestamp.now(),
      cancellationReason: reason || 'Pedido recusado pela cozinha'
    });
  } catch (error) {
    console.error('Erro ao cancelar pedido:', error);
    throw new Error('Falha ao cancelar pedido');
  }
};

/**
 * Remove chaves com valor `undefined` (em profundidade) antes de enviar ao
 * Firestore, pois ele rejeita `undefined`. Campos opcionais simplesmente
 * somem do documento quando não preenchidos.
 */
function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => stripUndefined(v)) as unknown as T;
  }
  if (value && typeof value === 'object' && value.constructor === Object) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue;
      out[k] = stripUndefined(v);
    }
    return out as T;
  }
  return value;
}

// Criar novo pedido de delivery
export const createDeliveryOrder = async (orderData: CreateDeliveryOrderData): Promise<DeliveryOrder> => {
  try {
    const cleanedOrderData = stripUndefined(orderData);
    const docRef = await addDoc(collection(db, 'deliveries'), {
      ...cleanedOrderData,
      status: 'pending',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

    const deliveryOrder = {
      id: docRef.id,
      ...orderData,
      status: 'pending' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Sincronizar com a coleção unificada de pedidos
    try {
      await addOrder({
        restaurantId: orderData.restaurantId,
        mesaId: docRef.id,
        mesaNumero: `Delivery #${docRef.id.substring(0, 6)}`,
        timestamp: new Date().toLocaleString('pt-BR'),
        status: 'novo',
        itens: orderData.items.map(item =>
          `${item.quantity}x ${item.productName}${item.observations ? ` (${item.observations})` : ''}`
        ),
        tempoEspera: '0 min',
        orderType: 'delivery',
        deliveryInfo: {
          customerName: orderData.customerName,
          customerPhone: orderData.customerPhone,
          customerAddress: orderData.customerAddress,
          paymentMethod: translatePaymentMethod(orderData.paymentMethod),
          deliveryFee: orderData.deliveryFee
        }
      });
    } catch (syncError) {
      console.error('Erro ao sincronizar delivery com orders:', syncError);
      // Não falha o pedido de delivery se a sincronização falhar
    }

    return deliveryOrder;
  } catch (error) {
    console.error('Erro ao criar pedido de delivery:', error);
    throw new Error('Falha ao criar pedido de delivery');
  }
};

// Buscar todos os pedidos de delivery
export const getDeliveryOrders = async (): Promise<DeliveryOrder[]> => {
  try {
    const q = query(collection(db, 'deliveries'));
    const querySnapshot = await getDocs(q);

    const orders: DeliveryOrder[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      orders.push({
        id: doc.id,
        restaurantId: data.restaurantId,
        restaurantName: data.restaurantName,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerAddress: data.customerAddress,
        items: data.items,
        total: data.total,
        status: data.status,
        paymentMethod: data.paymentMethod,
        deliveryFee: data.deliveryFee,
        observations: data.observations,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      });
    });

    // Ordenar no cliente por data de criação (mais recente primeiro)
    return orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error) {
    console.error('Erro ao buscar pedidos de delivery:', error);
    throw new Error('Falha ao buscar pedidos de delivery');
  }
};

// Buscar pedidos por restaurante
export const getDeliveryOrdersByRestaurant = async (restaurantId: string): Promise<DeliveryOrder[]> => {
  try {
    const q = query(
      collection(db, 'deliveries'),
      where('restaurantId', '==', restaurantId)
    );
    const querySnapshot = await getDocs(q);

    const orders: DeliveryOrder[] = [];
    querySnapshot.forEach((d) => {
      orders.push(docToOrder(d.id, d.data()));
    });

    return orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error) {
    console.error('Erro ao buscar pedidos por restaurante:', error);
    throw new Error('Falha ao buscar pedidos por restaurante');
  }
};

/** Buscar pedidos atribuídos a um motoboy (para métricas e histórico). */
export const getDeliveryOrdersByMotoboy = async (motoboyUserId: string): Promise<DeliveryOrder[]> => {
  try {
    const q = query(
      collection(db, 'deliveries'),
      where('motoboyUserId', '==', motoboyUserId)
    );
    const snapshot = await getDocs(q);
    const orders = snapshot.docs.map((d) => docToOrder(d.id, d.data()));
    return orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error) {
    console.error('Erro ao buscar pedidos por motoboy:', error);
    return [];
  }
};

/**
 * Inscreve para atualizações em tempo real dos pedidos de delivery do restaurante.
 * Retorna função para cancelar a inscrição.
 */
export function subscribeDeliveryOrdersByRestaurant(
  restaurantId: string,
  onOrders: (orders: DeliveryOrder[]) => void
): () => void {
  const q = query(
    collection(db, 'deliveries'),
    where('restaurantId', '==', restaurantId)
  );
  return onSnapshot(q, (snapshot) => {
    const orders: DeliveryOrder[] = snapshot.docs.map((d) =>
      docToOrder(d.id, d.data())
    );
    orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    onOrders(orders);
  }, (err) => {
    console.error('Erro no listener de delivery:', err);
  });
}