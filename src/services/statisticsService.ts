import { collection, addDoc, getDocs, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';

// Interface para itens detalhados do pedido
export interface OrderItem {
  productId: string;
  productName: string;
  categoryId: string;
  categoryName: string;
  quantity: number;
  price: number;
  observations?: string;
}

// Interface para pedido detalhado (para estatísticas)
export interface DetailedOrder {
  id?: string;
  mesaId: string;
  mesaNumero: string;
  timestamp: Timestamp;
  status: 'novo' | 'preparando' | 'pronto';
  items: OrderItem[];
  totalValue: number;
  totalItems: number;
}

// Interface para estatísticas de produtos
export interface ProductStats {
  productId: string;
  productName: string;
  categoryName: string;
  totalOrders: number;
  totalQuantity: number;
  totalRevenue: number;
  averageQuantity: number;
}

// Interface para estatísticas de categorias
export interface CategoryStats {
  categoryId: string;
  categoryName: string;
  totalOrders: number;
  totalQuantity: number;
  totalRevenue: number;
  productsCount: number;
}

// Interface para estatísticas gerais
export interface GeneralStats {
  totalOrders: number;
  totalRevenue: number;
  totalItems: number;
  averageOrderValue: number;
  averageItemsPerOrder: number;
  ordersToday: number;
  revenueToday: number;
  topProducts: ProductStats[];
  topCategories: CategoryStats[];
  ordersByHour: { hour: string; count: number }[];
  ordersByDay: { date: string; count: number; revenue: number }[];
}

// Salvar pedido detalhado para estatísticas
export const saveDetailedOrder = async (order: Omit<DetailedOrder, 'id'>): Promise<DetailedOrder> => {
  try {
    const docRef = await addDoc(collection(db, 'detailedOrders'), {
      ...order,
      timestamp: Timestamp.now()
    });

    return {
      id: docRef.id,
      ...order,
      timestamp: Timestamp.now()
    };
  } catch (error) {
    console.error('Erro ao salvar pedido detalhado:', error);
    throw new Error('Falha ao salvar estatísticas do pedido');
  }
};

// Buscar todos os pedidos detalhados
export const getDetailedOrders = async (): Promise<DetailedOrder[]> => {
  try {
    const q = query(collection(db, 'detailedOrders'), orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const orders: DetailedOrder[] = [];
    querySnapshot.forEach((doc) => {
      orders.push({
        id: doc.id,
        ...doc.data()
      } as DetailedOrder);
    });
    
    return orders;
  } catch (error) {
    console.error('Erro ao buscar pedidos detalhados:', error);
    return [];
  }
};

// Buscar pedidos de um período específico
export const getDetailedOrdersByPeriod = async (startDate: Date, endDate: Date): Promise<DetailedOrder[]> => {
  try {
    const startTimestamp = Timestamp.fromDate(startDate);
    const endTimestamp = Timestamp.fromDate(endDate);
    
    const q = query(
      collection(db, 'detailedOrders'),
      where('timestamp', '>=', startTimestamp),
      where('timestamp', '<=', endTimestamp),
      orderBy('timestamp', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    
    const orders: DetailedOrder[] = [];
    querySnapshot.forEach((doc) => {
      orders.push({
        id: doc.id,
        ...doc.data()
      } as DetailedOrder);
    });
    
    return orders;
  } catch (error) {
    console.error('Erro ao buscar pedidos por período:', error);
    return [];
  }
};

// Calcular estatísticas de produtos
export const calculateProductStats = (orders: DetailedOrder[]): ProductStats[] => {
  const productMap = new Map<string, ProductStats>();

  orders.forEach(order => {
    order.items.forEach(item => {
      const existing = productMap.get(item.productId);
      
      if (existing) {
        existing.totalOrders += 1;
        existing.totalQuantity += item.quantity;
        existing.totalRevenue += item.price * item.quantity;
      } else {
        productMap.set(item.productId, {
          productId: item.productId,
          productName: item.productName,
          categoryName: item.categoryName,
          totalOrders: 1,
          totalQuantity: item.quantity,
          totalRevenue: item.price * item.quantity,
          averageQuantity: 0
        });
      }
    });
  });

  // Calcular médias e retornar ordenado
  const stats = Array.from(productMap.values()).map(stat => ({
    ...stat,
    averageQuantity: stat.totalQuantity / stat.totalOrders
  }));

  return stats.sort((a, b) => b.totalOrders - a.totalOrders);
};

// Calcular estatísticas de categorias
export const calculateCategoryStats = (orders: DetailedOrder[]): CategoryStats[] => {
  const categoryMap = new Map<string, CategoryStats>();

  orders.forEach(order => {
    order.items.forEach(item => {
      const existing = categoryMap.get(item.categoryId);
      
      if (existing) {
        existing.totalOrders += 1;
        existing.totalQuantity += item.quantity;
        existing.totalRevenue += item.price * item.quantity;
      } else {
        categoryMap.set(item.categoryId, {
          categoryId: item.categoryId,
          categoryName: item.categoryName,
          totalOrders: 1,
          totalQuantity: item.quantity,
          totalRevenue: item.price * item.quantity,
          productsCount: 0
        });
      }
    });
  });

  // Contar produtos únicos por categoria
  const productsByCategory = new Map<string, Set<string>>();
  orders.forEach(order => {
    order.items.forEach(item => {
      if (!productsByCategory.has(item.categoryId)) {
        productsByCategory.set(item.categoryId, new Set());
      }
      productsByCategory.get(item.categoryId)!.add(item.productId);
    });
  });

  const stats = Array.from(categoryMap.values()).map(stat => ({
    ...stat,
    productsCount: productsByCategory.get(stat.categoryId)?.size || 0
  }));

  return stats.sort((a, b) => b.totalRevenue - a.totalRevenue);
};

// Calcular estatísticas gerais
export const calculateGeneralStats = (orders: DetailedOrder[]): GeneralStats => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Filtrar pedidos de hoje
  const todayOrders = orders.filter(order => {
    const orderDate = order.timestamp.toDate();
    return orderDate >= today;
  });

  // Calcular totais
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, order) => sum + order.totalValue, 0);
  const totalItems = orders.reduce((sum, order) => sum + order.totalItems, 0);
  
  // Estatísticas de hoje
  const ordersToday = todayOrders.length;
  const revenueToday = todayOrders.reduce((sum, order) => sum + order.totalValue, 0);
  
  // Top produtos e categorias
  const topProducts = calculateProductStats(orders).slice(0, 10);
  const topCategories = calculateCategoryStats(orders).slice(0, 5);
  
  // Pedidos por hora (últimas 24h)
  const ordersByHour = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    const count = todayOrders.filter(order => {
      const orderHour = order.timestamp.toDate().getHours();
      return orderHour === i;
    }).length;
    
    return { hour: `${hour}:00`, count };
  });
  
  // Pedidos por dia (últimos 7 dias)
  const ordersByDay = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString('pt-BR');
    
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    
    const dayOrders = orders.filter(order => {
      const orderDate = order.timestamp.toDate();
      return orderDate >= dayStart && orderDate < dayEnd;
    });
    
    return {
      date: dateStr,
      count: dayOrders.length,
      revenue: dayOrders.reduce((sum, order) => sum + order.totalValue, 0)
    };
  }).reverse();

  return {
    totalOrders,
    totalRevenue,
    totalItems,
    averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    averageItemsPerOrder: totalOrders > 0 ? totalItems / totalOrders : 0,
    ordersToday,
    revenueToday,
    topProducts,
    topCategories,
    ordersByHour,
    ordersByDay
  };
};

// Função principal para obter todas as estatísticas
export const getStatistics = async (period?: { start: Date; end: Date }): Promise<GeneralStats> => {
  try {
    let orders: DetailedOrder[];
    
    if (period) {
      orders = await getDetailedOrdersByPeriod(period.start, period.end);
    } else {
      orders = await getDetailedOrders();
    }
    
    return calculateGeneralStats(orders);
  } catch (error) {
    console.error('Erro ao calcular estatísticas:', error);
    // Retornar estatísticas vazias em caso de erro
    return {
      totalOrders: 0,
      totalRevenue: 0,
      totalItems: 0,
      averageOrderValue: 0,
      averageItemsPerOrder: 0,
      ordersToday: 0,
      revenueToday: 0,
      topProducts: [],
      topCategories: [],
      ordersByHour: Array.from({ length: 24 }, (_, i) => ({ 
        hour: `${i.toString().padStart(2, '0')}:00`, 
        count: 0 
      })),
      ordersByDay: Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return {
          date: date.toLocaleDateString('pt-BR'),
          count: 0,
          revenue: 0
        };
      }).reverse()
    };
  }
};
