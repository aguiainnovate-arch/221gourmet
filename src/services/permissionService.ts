import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../../firebase';
import type { PermissionKey } from '../types/permission';
import { DEFAULT_PERMISSIONS } from '../types/permission';

// Re-exportar os tipos para facilitar imports
export type { PermissionKey } from '../types/permission';

// Buscar permissões de um restaurante
export const getRestaurantPermissions = async (restaurantId: string): Promise<Record<PermissionKey, boolean>> => {
  try {
    const q = query(
      collection(db, 'restaurantPermissions'), 
      where('restaurantId', '==', restaurantId)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      // Retornar permissões padrão se não existir registro
      return {
        automaticTranslation: false
      };
    }

    const doc = querySnapshot.docs[0];
    const data = doc.data();
    
    return {
      automaticTranslation: data.permissions?.automaticTranslation || false
    };
  } catch (error) {
    console.error('Erro ao buscar permissões do restaurante:', error);
    return {
      automaticTranslation: false
    };
  }
};

// Atualizar permissões de um restaurante
export const updateRestaurantPermissions = async (
  restaurantId: string, 
  permissions: Record<PermissionKey, boolean>
): Promise<void> => {
  try {
    // Verificar se já existe registro
    const q = query(
      collection(db, 'restaurantPermissions'), 
      where('restaurantId', '==', restaurantId)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      // Criar novo registro
      await addDoc(collection(db, 'restaurantPermissions'), {
        restaurantId,
        permissions,
        updatedAt: Timestamp.now()
      });
    } else {
      // Atualizar registro existente
      const docRef = querySnapshot.docs[0].ref;
      await updateDoc(docRef, {
        permissions,
        updatedAt: Timestamp.now()
      });
    }
  } catch (error) {
    console.error('Erro ao atualizar permissões do restaurante:', error);
    throw new Error('Falha ao atualizar permissões do restaurante');
  }
};

// Buscar permissões de um plano
export const getPlanPermissions = async (planId: string): Promise<Record<PermissionKey, boolean>> => {
  try {
    const q = query(
      collection(db, 'planPermissions'), 
      where('planId', '==', planId)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      // Retornar permissões padrão se não existir registro
      return {
        automaticTranslation: false
      };
    }

    const doc = querySnapshot.docs[0];
    const data = doc.data();
    
    return {
      automaticTranslation: data.permissions?.automaticTranslation || false
    };
  } catch (error) {
    console.error('Erro ao buscar permissões do plano:', error);
    return {
      automaticTranslation: false
    };
  }
};

// Atualizar permissões de um plano
export const updatePlanPermissions = async (
  planId: string, 
  permissions: Record<PermissionKey, boolean>
): Promise<void> => {
  try {
    // Verificar se já existe registro
    const q = query(
      collection(db, 'planPermissions'), 
      where('planId', '==', planId)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      // Criar novo registro
      await addDoc(collection(db, 'planPermissions'), {
        planId,
        permissions,
        updatedAt: Timestamp.now()
      });
    } else {
      // Atualizar registro existente
      const docRef = querySnapshot.docs[0].ref;
      await updateDoc(docRef, {
        permissions,
        updatedAt: Timestamp.now()
      });
    }
  } catch (error) {
    console.error('Erro ao atualizar permissões do plano:', error);
    throw new Error('Falha ao atualizar permissões do plano');
  }
};

// Aplicar permissões do plano a todos os restaurantes do plano
export const applyPlanPermissionsToRestaurants = async (planId: string): Promise<void> => {
  try {
    // Buscar permissões do plano
    const planPermissions = await getPlanPermissions(planId);
    
    // Criar objeto de permissões completo, garantindo que todas as permissões sejam definidas
    const completePermissions = {
      ...DEFAULT_PERMISSIONS,
      ...planPermissions
    };
    
    // Buscar todos os restaurantes do plano
    const restaurantsQuery = query(
      collection(db, 'restaurants'),
      where('planId', '==', planId),
      where('active', '==', true)
    );
    const restaurantsSnapshot = await getDocs(restaurantsQuery);
    
    // Aplicar permissões a cada restaurante (sobrescreve completamente)
    const updatePromises = restaurantsSnapshot.docs.map(async (restaurantDoc) => {
      const restaurantId = restaurantDoc.id;
      await updateRestaurantPermissions(restaurantId, completePermissions);
    });
    
    await Promise.all(updatePromises);
  } catch (error) {
    console.error('Erro ao aplicar permissões do plano aos restaurantes:', error);
    throw new Error('Falha ao aplicar permissões do plano aos restaurantes');
  }
};

// Verificar se um restaurante tem uma permissão específica
export const hasRestaurantPermission = async (
  restaurantId: string, 
  permission: PermissionKey
): Promise<boolean> => {
  try {
    const permissions = await getRestaurantPermissions(restaurantId);
    return permissions[permission] || false;
  } catch (error) {
    console.error('Erro ao verificar permissão do restaurante:', error);
    return false;
  }
};
