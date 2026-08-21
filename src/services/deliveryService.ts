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
import { normalizePhone } from '../utils/authInputUtils';
import { addOrder } from './orderService';
import {
  createFirestoreDocument,
  getFirestoreDocument,
  isCapacitorRuntime,
  queryFirestoreByField,
  updateFirestoreDocument,
} from '../utils/firestoreRest';

// Re-exportar os tipos para facilitar imports
export type { DeliveryOrder, CreateDeliveryOrderData } from '../types/delivery';

function toOrderDate(value: unknown): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

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
    createdAt: toOrderDate(data.createdAt),
    updatedAt: toOrderDate(data.updatedAt),
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
    if (isCapacitorRuntime()) {
      const snap = await getFirestoreDocument('deliveries', orderId);
      if (!snap) return null;
      return docToOrder(snap.id, snap.data);
    }
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
    if (isCapacitorRuntime()) {
      const docs = await queryFirestoreByField('deliveries', 'customerPhone', phone, 100);
      return docs
        .map((d) => docToOrder(d.id, d.data))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    // Primeiro buscar por telefone
    const q = query(
      collection(db, 'deliveries'),
      where('customerPhone', '==', phone)
    );

    const querySnapshot = await getDocs(q);
    const orders: DeliveryOrder[] = [];

    querySnapshot.forEach((docSnap) => {
      orders.push(docToOrder(docSnap.id, docSnap.data() as Record<string, unknown>));
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
 * No Capacitor usa polling REST — onSnapshot trava no WKWebView.
 */
export function subscribeDeliveryOrdersByPhone(
  phone: string,
  onOrders: (orders: DeliveryOrder[]) => void
): () => void {
  if (isCapacitorRuntime()) {
    let cancelled = false;
    const tick = async () => {
      try {
        const orders = await getDeliveryOrdersByPhone(phone);
        if (!cancelled) onOrders(orders);
      } catch (err) {
        console.error('Erro no polling de pedidos por telefone:', err);
      }
    };
    void tick();
    const intervalId = window.setInterval(() => {
      void tick();
    }, 8000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }

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
export const updateDeliveryPixPayment = async (
  orderId: string,
  data: {
    pixStatus?: string;
    pixCopyPaste?: string;
    pixQrCodeImage?: string;
    stripePaymentIntentId?: string;
  }
): Promise<void> => {
  try {
    const payload = {
      ...stripUndefined(data),
      updatedAt: new Date(),
    };
    if (isCapacitorRuntime()) {
      await updateFirestoreDocument('deliveries', orderId, payload as Record<string, unknown>);
      return;
    }
    const orderRef = doc(db, 'deliveries', orderId);
    await updateDoc(orderRef, {
      ...stripUndefined(data),
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Erro ao atualizar pagamento PIX do pedido:', error);
    throw new Error('Falha ao atualizar pagamento PIX');
  }
};

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

// Cancelar/recusar pedido de delivery (restaurante ou sistema)
export const cancelDeliveryOrder = async (orderId: string, reason?: string): Promise<void> => {
  try {
    const payload = {
      status: 'cancelled' as const,
      updatedAt: new Date(),
      cancellationReason: reason || 'Pedido recusado pela cozinha',
    };
    if (isCapacitorRuntime()) {
      await updateFirestoreDocument('deliveries', orderId, payload);
      return;
    }
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

/** Cliente cancela pedido ainda não confirmado pelo restaurante (status pending). */
export const cancelDeliveryOrderByCustomer = async (
  orderId: string,
  customerPhone: string,
  reason?: string
): Promise<void> => {
  const order = await getDeliveryOrderById(orderId);
  if (!order) {
    throw new Error('Pedido não encontrado.');
  }
  if (order.status !== 'pending') {
    throw new Error('Só é possível cancelar pedidos que ainda não foram confirmados pelo restaurante.');
  }
  const phone = normalizePhone(customerPhone);
  const orderPhone = normalizePhone(order.customerPhone);
  if (phone !== orderPhone) {
    throw new Error('Este pedido não pertence à sua conta.');
  }
  await cancelDeliveryOrder(
    orderId,
    reason?.trim() || 'Cancelado pelo cliente — restaurante não confirmou o pedido'
  );
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
    const cleanedOrderData = stripUndefined(orderData) as CreateDeliveryOrderData;
    const now = new Date();

    let orderId: string;

    if (isCapacitorRuntime()) {
      const created = await createFirestoreDocument('deliveries', {
        ...cleanedOrderData,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      });
      orderId = created.id;
    } else {
      const docRef = await addDoc(collection(db, 'deliveries'), {
        ...cleanedOrderData,
        status: 'pending',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      orderId = docRef.id;
    }

    const deliveryOrder: DeliveryOrder = {
      id: orderId,
      ...orderData,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    // Sincronizar com a coleção unificada de pedidos (web admin). No Cap, SDK trava — pula.
    if (!isCapacitorRuntime()) {
      try {
        await addOrder({
          restaurantId: orderData.restaurantId,
          mesaId: orderId,
          mesaNumero: `Delivery #${orderId.substring(0, 6)}`,
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
      }
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