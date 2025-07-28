import { collection, addDoc, getDocs, updateDoc, doc, query, orderBy, where, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';

export interface FirestoreOrder {
  id: string;
  mesaId: string;
  mesaNumero: string;
  timestamp: string;
  status: 'novo' | 'preparando' | 'pronto';
  itens: string[];
  tempoEspera: string;
}

export const addOrder = async (order: Omit<FirestoreOrder, 'id'>): Promise<FirestoreOrder> => {
  try {
    const docRef = await addDoc(collection(db, 'orders'), {
      mesaId: order.mesaId,
      mesaNumero: order.mesaNumero,
      timestamp: order.timestamp,
      status: order.status,
      itens: order.itens,
      tempoEspera: order.tempoEspera
    });

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