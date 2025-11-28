import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../firebase';
import type { DeliveryOrder, CreateDeliveryOrderData } from '../types/delivery';
import { addOrder } from './orderService';

// Re-exportar os tipos para facilitar imports
export type { DeliveryOrder, CreateDeliveryOrderData } from '../types/delivery';

// Função auxiliar para traduzir método de pagamento
const translatePaymentMethod = (method: string): string => {
  const labels: Record<string, string> = {
    'money': 'Dinheiro',
    'credit': 'Cartão de Crédito',
    'debit': 'Cartão de Débito',
    'pix': 'PIX'
  };
  return labels[method] || method;
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

// Criar novo pedido de delivery
export const createDeliveryOrder = async (orderData: CreateDeliveryOrderData): Promise<DeliveryOrder> => {
  try {
    const docRef = await addDoc(collection(db, 'deliveries'), {
      ...orderData,
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
    console.error('Erro ao buscar pedidos por restaurante:', error);
    throw new Error('Falha ao buscar pedidos por restaurante');
  }
};