import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc,
  doc, 
  query,
  where,
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../../firebase';
import type { DeliveryOrder, CreateDeliveryOrderData } from '../types/delivery';

// Re-exportar os tipos para facilitar imports
export type { DeliveryOrder, CreateDeliveryOrderData } from '../types/delivery';

// Criar novo pedido de delivery
export const createDeliveryOrder = async (orderData: CreateDeliveryOrderData): Promise<DeliveryOrder> => {
  try {
    const docRef = await addDoc(collection(db, 'deliveries'), {
      ...orderData,
      status: 'pending',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

    return {
      id: docRef.id,
      ...orderData,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  } catch (error) {
    console.error('Erro ao criar pedido de delivery:', error);
    throw new Error('Falha ao criar pedido de delivery');
  }
};

// Buscar todos os pedidos de delivery
export const getDeliveryOrders = async (): Promise<DeliveryOrder[]> => {
  try {
    const q = query(
      collection(db, 'deliveries'),
      orderBy('createdAt', 'desc')
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

    return orders;
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
      where('restaurantId', '==', restaurantId),
      orderBy('createdAt', 'desc')
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

    return orders;
  } catch (error) {
    console.error('Erro ao buscar pedidos por restaurante:', error);
    throw new Error('Falha ao buscar pedidos por restaurante');
  }
};

// Atualizar status do pedido
export const updateDeliveryOrderStatus = async (
  orderId: string, 
  status: DeliveryOrder['status']
): Promise<void> => {
  try {
    const orderRef = doc(db, 'deliveries', orderId);
    await updateDoc(orderRef, {
      status,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Erro ao atualizar status do pedido:', error);
    throw new Error('Falha ao atualizar status do pedido');
  }
};

