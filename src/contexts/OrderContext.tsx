import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { addOrder as addOrderToFirestore, getOrdersByRestaurant, updateOrderStatus as updateOrderStatusInFirestore, deleteOrder as deleteOrderFromFirestore, type FirestoreOrder } from '../services/orderService';
import type { OrderItem } from '../services/statisticsService';

// Exportar o tipo FirestoreOrder como Order
export type Order = FirestoreOrder;

interface OrderContextType {
  orders: Order[];
  addOrder: (order: Omit<Order, 'id'>, detailedItems?: OrderItem[]) => Promise<void>;
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  refreshOrders: (restaurantId?: string) => Promise<void>;
  setRestaurantId: (id: string) => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [restaurantId, setRestaurantIdState] = useState<string>('');

  const loadOrders = async (restId?: string) => {
    const idToUse = restId || restaurantId;
    
    if (!idToUse) {
      return;
    }

    try {
      const firestoreOrders = await getOrdersByRestaurant(idToUse);
      setOrders(firestoreOrders);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
      // Erro silencioso - mantém dados locais se Firestore falhar
    }
  };

  const setRestaurantId = (id: string) => {
    setRestaurantIdState(id);
    loadOrders(id);
  };

  useEffect(() => {
    if (restaurantId) {
      loadOrders();
      
      // Auto-refresh a cada 30 segundos
      const interval = setInterval(() => {
        loadOrders();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [restaurantId]);

  const addOrder = async (order: Omit<Order, 'id'>, detailedItems?: OrderItem[]) => {
    try {
      const newOrder = await addOrderToFirestore(order, detailedItems);
      setOrders(prev => [newOrder, ...prev]);
    } catch (error) {
      console.error('Erro ao adicionar pedido:', error);
      // Se falhar no Firestore, adiciona apenas localmente
      const localOrder: Order = {
        id: Date.now().toString(),
        ...order
      };
      setOrders(prev => [localOrder, ...prev]);
    }
  };

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    try {
      await updateOrderStatusInFirestore(orderId, status);
      setOrders(prev => 
        prev.map(order => 
          order.id === orderId ? { ...order, status } : order
        )
      );
    } catch (error) {
      // Se falhar no Firestore, atualiza apenas localmente
      setOrders(prev => 
        prev.map(order => 
          order.id === orderId ? { ...order, status } : order
        )
      );
    }
  };

  const deleteOrder = async (orderId: string) => {
    try {
      await deleteOrderFromFirestore(orderId);
      setOrders(prev => prev.filter(order => order.id !== orderId));
    } catch (error) {
      // Se falhar no Firestore, remove apenas localmente
      setOrders(prev => prev.filter(order => order.id !== orderId));
    }
  };

  const refreshOrders = async (restId?: string) => {
    await loadOrders(restId);
  };

  return (
    <OrderContext.Provider value={{ orders, addOrder, updateOrderStatus, deleteOrder, refreshOrders, setRestaurantId }}>
      {children}
    </OrderContext.Provider>
  );
};

export const useOrders = () => {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
}; 