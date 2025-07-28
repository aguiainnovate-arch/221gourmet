import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export interface Order {
  id: string;
  mesa: string;
  timestamp: string;
  status: 'novo' | 'preparando' | 'pronto' | 'entregue';
  itens: string[];
  tempoEspera: string;
}

interface OrderContextType {
  orders: Order[];
  addOrder: (order: Omit<Order, 'id' | 'timestamp' | 'status' | 'tempoEspera'>) => void;
  updateOrderStatus: (orderId: string, newStatus: Order['status']) => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([
    // Mock inicial para demonstração
    {
      id: '001',
      mesa: '5',
      timestamp: '14:30',
      status: 'preparando',
      itens: ['Hambúrguer Clássico', 'Pizza Margherita'],
      tempoEspera: '15 min'
    },
    {
      id: '002',
      mesa: '3',
      timestamp: '14:25',
      status: 'novo',
      itens: ['Pizza Margherita x2'],
      tempoEspera: '20 min'
    },
    {
      id: '003',
      mesa: '1',
      timestamp: '14:20',
      status: 'pronto',
      itens: ['Hambúrguer Clássico'],
      tempoEspera: '0 min'
    }
  ]);

  const addOrder = (orderData: Omit<Order, 'id' | 'timestamp' | 'status' | 'tempoEspera'>) => {
    const newOrder: Order = {
      ...orderData,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      status: 'novo',
      tempoEspera: '15 min'
    };

    setOrders(prev => [newOrder, ...prev]);
  };

  const updateOrderStatus = (orderId: string, newStatus: Order['status']) => {
    setOrders(prev => 
      prev.map(order => 
        order.id === orderId 
          ? { 
              ...order, 
              status: newStatus,
              tempoEspera: newStatus === 'pronto' ? '0 min' : order.tempoEspera
            }
          : order
      )
    );
  };

  return (
    <OrderContext.Provider value={{ orders, addOrder, updateOrderStatus }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrders() {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
} 