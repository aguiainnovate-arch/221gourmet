import { collection, addDoc, getDocs, updateDoc, doc, query, orderBy, where, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { saveDetailedOrder, type OrderItem } from './statisticsService';

export interface FirestoreOrder {
  id: string;
  mesaId: string;
  mesaNumero: string;
  timestamp: string;
  status: 'novo' | 'preparando' | 'pronto';
  itens: string[];
  tempoEspera: string;
}

export const addOrder = async (order: Omit<FirestoreOrder, 'id'>, detailedItems?: OrderItem[]): Promise<FirestoreOrder> => {
  try {
    const docRef = await addDoc(collection(db, 'orders'), {
      mesaId: order.mesaId,
      mesaNumero: order.mesaNumero,
      timestamp: order.timestamp,
      status: order.status,
      itens: order.itens,
      tempoEspera: order.tempoEspera
    });

    // Salvar dados detalhados para estatísticas se fornecidos
    if (detailedItems && detailedItems.length > 0) {
      const totalValue = detailedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const totalItems = detailedItems.reduce((sum, item) => sum + item.quantity, 0);
      
      try {
        await saveDetailedOrder({
          mesaId: order.mesaId,
          mesaNumero: order.mesaNumero,
          timestamp: Timestamp.now(),
          status: order.status,
          items: detailedItems,
          totalValue,
          totalItems
        });
      } catch (error) {
        console.error('Erro ao salvar estatísticas do pedido:', error);
        // Não falha o pedido principal se as estatísticas falharem
      }
    }

    return {
      id: docRef.id,
      ...order
    };
  } catch (error) {
    throw new Error('Falha ao adicionar pedido');
  }
};

export const getOrders = async (): Promise<FirestoreOrder[]> => {
  try {
    const q = query(collection(db, 'orders'), orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const orders: FirestoreOrder[] = [];
    querySnapshot.forEach((doc) => {
      orders.push({
        id: doc.id,
        ...doc.data()
      } as FirestoreOrder);
    });
    
    return orders;
  } catch (error) {
    throw new Error('Falha ao buscar pedidos');
  }
};

export const getOrdersByTable = async (mesaId: string): Promise<FirestoreOrder[]> => {
  try {
    const q = query(
      collection(db, 'orders'), 
      where('mesaId', '==', mesaId),
      orderBy('timestamp', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    const orders: FirestoreOrder[] = [];
    querySnapshot.forEach((doc) => {
      orders.push({
        id: doc.id,
        ...doc.data()
      } as FirestoreOrder);
    });
    
    return orders;
  } catch (error) {
    throw new Error('Falha ao buscar pedidos da mesa');
  }
};

export const updateOrderStatus = async (orderId: string, status: FirestoreOrder['status']): Promise<void> => {
  try {
    await updateDoc(doc(db, 'orders', orderId), {
      status: status
    });
  } catch (error) {
    throw new Error('Falha ao atualizar status do pedido');
  }
};

export const deleteOrder = async (orderId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'orders', orderId));
  } catch (error) {
    throw new Error('Falha ao deletar pedido');
  }
}; 