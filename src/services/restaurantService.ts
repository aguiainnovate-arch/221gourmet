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
      }
    });

    return {
      id: docRef.id,
      ...restaurantData,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      settings: {
        maxTables: 999, // Será definido baseado no plano posteriormente
        allowOnlineOrders: true,
        enableAnalytics: true
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
        settings: data.settings
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
        settings: data.settings
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
  } catch (error) {
    console.error('Erro ao atualizar plano do restaurante:', error);
    throw new Error('Falha ao atualizar plano do restaurante');
  }
};
