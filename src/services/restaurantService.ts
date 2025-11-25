import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  doc, 
  query, 
  orderBy,
  where,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../../firebase';
import { getPlanPermissions, updateRestaurantPermissions } from './permissionService';
import type { Restaurant, CreateRestaurantData, UpdateRestaurantData } from '../types/restaurant';

// Re-exportar os tipos para facilitar imports
export type { Restaurant, CreateRestaurantData, UpdateRestaurantData } from '../types/restaurant';

// Adicionar novo restaurante
export const addRestaurant = async (restaurantData: CreateRestaurantData): Promise<Restaurant> => {
  try {
    const docRef = await addDoc(collection(db, 'restaurants'), {
      ...restaurantData,
      active: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      settings: {
        maxTables: 999, // Será definido baseado no plano posteriormente
        allowOnlineOrders: true,
        enableAnalytics: true
      },
      permissions: {
        automaticTranslation: false,
        imageMenuTransfer: false
      }
    });

    const restaurantId = docRef.id;

    // Aplicar permissões do plano ao restaurante
    if (restaurantData.planId) {
      try {
        const planPermissions = await getPlanPermissions(restaurantData.planId);
        
        // Importar permissões padrão para garantir que todas as permissões sejam definidas
        const { DEFAULT_PERMISSIONS } = await import('../types/permission');
        
        // Criar objeto de permissões completo, sobrescrevendo com as do plano
        const completePermissions = {
          ...DEFAULT_PERMISSIONS,
          ...planPermissions
        };
        
        await updateRestaurantPermissions(restaurantId, completePermissions);
      } catch (error) {
        console.warn('Erro ao aplicar permissões do plano ao restaurante:', error);
        // Não falhar a criação do restaurante se houver erro nas permissões
      }
    }

    return {
      id: restaurantId,
      ...restaurantData,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      settings: {
        maxTables: 999, // Será definido baseado no plano posteriormente
        allowOnlineOrders: true,
        enableAnalytics: true
      },
      permissions: {
        automaticTranslation: false,
        imageMenuTransfer: false
      }
    };
  } catch (error) {
    console.error('Erro ao adicionar restaurante:', error);
    throw new Error('Falha ao adicionar restaurante');
  }
};

// Buscar todos os restaurantes
export const getRestaurants = async (): Promise<Restaurant[]> => {
  try {
    const q = query(collection(db, 'restaurants'), orderBy('name'));
    const querySnapshot = await getDocs(q);
    
    const restaurants: Restaurant[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      restaurants.push({
        id: doc.id,
        name: data.name,
        domain: data.domain,
        email: data.email,
        phone: data.phone,
        address: data.address,
        planId: data.planId,
        active: data.active,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        theme: data.theme,
        settings: data.settings,
        permissions: data.permissions
      });
    });

    return restaurants;
  } catch (error) {
    console.error('Erro ao buscar restaurantes:', error);
    throw new Error('Falha ao buscar restaurantes');
  }
};

// Buscar restaurante por domínio
export const getRestaurantByDomain = async (domain: string): Promise<Restaurant | null> => {
  try {
    const q = query(
      collection(db, 'restaurants'), 
      where('domain', '==', domain),
      where('active', '==', true)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    const data = doc.data();
    
    return {
      id: doc.id,
      name: data.name,
      domain: data.domain,
      email: data.email,
      phone: data.phone,
      address: data.address,
      planId: data.planId,
      active: data.active,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      theme: data.theme,
      settings: data.settings
    };
  } catch (error) {
    console.error('Erro ao buscar restaurante por domínio:', error);
    return null;
  }
};

// Atualizar restaurante
export const updateRestaurant = async (id: string, updates: UpdateRestaurantData | CreateRestaurantData): Promise<void> => {
  try {
    const restaurantRef = doc(db, 'restaurants', id);
    await updateDoc(restaurantRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });

    // Se o planId foi alterado, aplicar as permissões do novo plano
    if (updates.planId) {
      try {
        const planPermissions = await getPlanPermissions(updates.planId);
        
        // Importar permissões padrão para garantir que todas as permissões sejam definidas
        const { DEFAULT_PERMISSIONS } = await import('../types/permission');
        
        // Criar objeto de permissões completo, sobrescrevendo com as do plano
        const completePermissions = {
          ...DEFAULT_PERMISSIONS,
          ...planPermissions
        };
        
        await updateRestaurantPermissions(id, completePermissions);
      } catch (error) {
        console.warn('Erro ao aplicar permissões do plano ao restaurante:', error);
        // Não falhar a atualização do restaurante se houver erro nas permissões
      }
    }
  } catch (error) {
    console.error('Erro ao atualizar restaurante:', error);
    throw new Error('Falha ao atualizar restaurante');
  }
};

// Remover restaurante (soft delete)
export const deleteRestaurant = async (id: string): Promise<void> => {
  try {
    const restaurantRef = doc(db, 'restaurants', id);
    await updateDoc(restaurantRef, {
      active: false,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Erro ao desativar restaurante:', error);
    throw new Error('Falha ao desativar restaurante');
  }
};

// Verificar se domínio já existe
export const checkDomainExists = async (domain: string, excludeId?: string): Promise<boolean> => {
  try {
    const q = query(
      collection(db, 'restaurants'), 
      where('domain', '==', domain)
    );
    const querySnapshot = await getDocs(q);
    
    if (excludeId) {
      // Se estamos editando, excluir o próprio restaurante da verificação
      return querySnapshot.docs.some(doc => doc.id !== excludeId);
    }
    
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Erro ao verificar domínio:', error);
    return false;
  }
};

// Buscar restaurantes por plano
export const getRestaurantsByPlan = async (planId: string): Promise<Restaurant[]> => {
  try {
    const q = query(
      collection(db, 'restaurants'), 
      where('planId', '==', planId),
      where('active', '==', true),
      orderBy('name')
    );
    const querySnapshot = await getDocs(q);
    
    const restaurants: Restaurant[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      restaurants.push({
        id: doc.id,
        name: data.name,
        domain: data.domain,
        email: data.email,
        phone: data.phone,
        address: data.address,
        planId: data.planId,
        active: data.active,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        theme: data.theme,
        settings: data.settings,
        permissions: data.permissions
      });
    });

    return restaurants;
  } catch (error) {
    console.error('Erro ao buscar restaurantes por plano:', error);
    throw new Error('Falha ao buscar restaurantes por plano');
  }
};

// Atualizar plano de um restaurante
export const updateRestaurantPlan = async (restaurantId: string, planId: string): Promise<void> => {
  try {
    const restaurantRef = doc(db, 'restaurants', restaurantId);
    await updateDoc(restaurantRef, {
      planId,
      updatedAt: Timestamp.now()
    });

    // Aplicar permissões do novo plano ao restaurante
    try {
      const planPermissions = await getPlanPermissions(planId);
      
      // Importar permissões padrão para garantir que todas as permissões sejam definidas
      const { DEFAULT_PERMISSIONS } = await import('../types/permission');
      
      // Criar objeto de permissões completo, sobrescrevendo com as do plano
      const completePermissions = {
        ...DEFAULT_PERMISSIONS,
        ...planPermissions
      };
      
      await updateRestaurantPermissions(restaurantId, completePermissions);
    } catch (error) {
      console.warn('Erro ao aplicar permissões do plano ao restaurante:', error);
      // Não falhar a atualização do plano se houver erro nas permissões
    }
  } catch (error) {
    console.error('Erro ao atualizar plano do restaurante:', error);
    throw new Error('Falha ao atualizar plano do restaurante');
  }
};

// Interface para restaurante com produtos
export interface RestaurantWithMenu {
  id: string;
  name: string;
  address: string;
  phone: string;
  products: Array<{
    name: string;
    description: string;
    price: number;
    category: string;
    preparationTime?: number;
  }>;
}

// Buscar todos os restaurantes ativos com seus cardápios para AI
export const getAllRestaurantsWithMenus = async (): Promise<RestaurantWithMenu[]> => {
  try {
    // Buscar todos os restaurantes ativos
    const q = query(
      collection(db, 'restaurants'), 
      where('active', '==', true)
    );
    const restaurantsSnapshot = await getDocs(q);
    
    const restaurantsWithMenus: RestaurantWithMenu[] = [];
    
    // Para cada restaurante, buscar seus produtos
    for (const restaurantDoc of restaurantsSnapshot.docs) {
      const restaurantData = restaurantDoc.data();
      
      // Buscar produtos do restaurante
      const productsQuery = query(
        collection(db, 'products'),
        where('restaurantId', '==', restaurantDoc.id),
        where('available', '==', true)
      );
      const productsSnapshot = await getDocs(productsQuery);
      
      const products = productsSnapshot.docs.map(productDoc => {
        const data = productDoc.data();
        return {
          name: data.name,
          description: data.description,
          price: data.price,
          category: data.category,
          preparationTime: data.preparationTime
        };
      });
      
      // Adicionar restaurante com seus produtos
      if (products.length > 0) { // Apenas restaurantes com produtos
        restaurantsWithMenus.push({
          id: restaurantDoc.id,
          name: restaurantData.name,
          address: restaurantData.address,
          phone: restaurantData.phone,
          products
        });
      }
    }
    
    return restaurantsWithMenus;
  } catch (error) {
    console.error('Erro ao buscar restaurantes com cardápios:', error);
    throw new Error('Falha ao buscar restaurantes com cardápios');
  }
};