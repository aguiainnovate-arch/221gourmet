import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { addOrder as addOrderToFirestore, getOrders as getOrdersFromFirestore, updateOrderStatus as updateOrderStatusInFirestore, deleteOrder as deleteOrderFromFirestore } from '../services/orderService';

export interface Order {
  id: string;
  mesaId: string; // ID da mesa no Firestore
  mesaNumero: string; // Número da mesa para exibição
  timestamp: string;
  status: 'novo' | 'preparando' | 'pronto';
  itens: string[];
  tempoEspera: string;
}

interface OrderContextType {
  orders: Order[];
  addOrder: (order: Omit<Order, 'id'>) => Promise<void>;
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  refreshOrders: () => Promise<void>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);

  const loadOrders = async () => {
    try {
      const firestoreOrders = await getOrdersFromFirestore();
      setOrders(firestoreOrders);
    } catch (error) {
      // Erro silencioso - mantém dados locais se Firestore falhar
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const addOrder = async (order: Omit<Order, 'id'>) => {
    try {
      const newOrder = await addOrderToFirestore(order);
      setOrders(prev => [newOrder, ...prev]);
    } catch (error) {
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

  const refreshOrders = async () => {
    await loadOrders();
  };

  return (
    <OrderContext.Provider value={{ orders, addOrder, updateOrderStatus, deleteOrder, refreshOrders }}>
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