import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  doc, 
  query, 
  orderBy,
  where,
  Timestamp,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../../firebase';
import type { Plan, CreatePlanData, UpdatePlanData } from '../types/plan';

// Re-exportar os tipos para facilitar imports
export type { Plan, CreatePlanData, UpdatePlanData } from '../types/plan';

// Adicionar novo plano
export const addPlan = async (planData: CreatePlanData): Promise<Plan> => {
  try {
    const docRef = await addDoc(collection(db, 'plans'), {
      ...planData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

    return {
      id: docRef.id,
      ...planData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  } catch (error) {
    console.error('Erro ao adicionar plano:', error);
    throw new Error('Falha ao adicionar plano');
  }
};

// Buscar todos os planos
export const getPlans = async (): Promise<Plan[]> => {
  try {
    const q = query(collection(db, 'plans'), orderBy('name'));
    const querySnapshot = await getDocs(q);
    
    const plans: Plan[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      plans.push({
        id: doc.id,
        name: data.name,
        description: data.description,
        price: data.price,
        period: data.period,
        features: data.features || [],
        maxTables: data.maxTables,
        maxProducts: data.maxProducts,
        supportLevel: data.supportLevel,
        active: data.active,
        permissions: data.permissions,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      });
    });

    return plans;
  } catch (error) {
    console.error('Erro ao buscar planos:', error);
    throw new Error('Falha ao buscar planos');
  }
};

// Buscar apenas planos ativos
export const getActivePlans = async (): Promise<Plan[]> => {
  try {
    const q = query(
      collection(db, 'plans'), 
      where('active', '==', true)
    );
    const querySnapshot = await getDocs(q);
    
    const plans: Plan[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      plans.push({
        id: doc.id,
        name: data.name,
        description: data.description,
        price: data.price,
        period: data.period,
        features: data.features || [],
        maxTables: data.maxTables,
        maxProducts: data.maxProducts,
        supportLevel: data.supportLevel,
        active: data.active,
        permissions: data.permissions,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      });
    });

    // Ordenar por preço no frontend
    plans.sort((a, b) => a.price - b.price);
    
    return plans;
  } catch (error) {
    console.error('Erro ao buscar planos ativos:', error);
    throw new Error('Falha ao buscar planos ativos');
  }
};

// Buscar plano por ID
export const getPlanById = async (planId: string): Promise<Plan | null> => {
  try {
    const q = query(
      collection(db, 'plans'), 
      where('__name__', '==', planId)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }

    const planDoc = querySnapshot.docs[0];
    const data = planDoc.data();
    
    return {
      id: planDoc.id,
      name: data.name,
      description: data.description,
      price: data.price,
      period: data.period,
      features: data.features || [],
      maxTables: data.maxTables,
      maxProducts: data.maxProducts,
      supportLevel: data.supportLevel,
      active: data.active,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date()
    };
  } catch (error) {
    console.error('Erro ao buscar plano por ID:', error);
    return null;
  }
};

// Atualizar plano
export const updatePlan = async (id: string, updates: UpdatePlanData): Promise<void> => {
  try {
    const planRef = doc(db, 'plans', id);
    await updateDoc(planRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Erro ao atualizar plano:', error);
    throw new Error('Falha ao atualizar plano');
  }
};

// Remover plano (hard delete - use com cuidado)
export const deletePlan = async (id: string): Promise<void> => {
  try {
    const planRef = doc(db, 'plans', id);
    await deleteDoc(planRef);
  } catch (error) {
    console.error('Erro ao deletar plano:', error);
    throw new Error('Falha ao deletar plano');
  }
};

// Ativar/Desativar plano
export const togglePlanStatus = async (id: string, active: boolean): Promise<void> => {
  try {
    const planRef = doc(db, 'plans', id);
    await updateDoc(planRef, {
      active,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Erro ao alterar status do plano:', error);
    throw new Error('Falha ao alterar status do plano');
  }
};

// Buscar estatísticas dos planos (quantos restaurantes por plano)
export const getPlansWithRestaurantCount = async (): Promise<(Plan & { restaurantCount: number })[]> => {
  try {
    // Buscar todos os planos
    const plans = await getPlans();
    
    // Buscar permissões de cada plano
    const plansWithPermissions = await Promise.all(
      plans.map(async (plan) => {
        try {
          // Buscar permissões do plano
          const permissionsQuery = query(
            collection(db, 'planPermissions'),
            where('planId', '==', plan.id)
          );
          const permissionsSnapshot = await getDocs(permissionsQuery);
          
          // Importar DEFAULT_PERMISSIONS para garantir todas as permissões
          const { DEFAULT_PERMISSIONS } = await import('../types/permission');
          
          let permissions = { ...DEFAULT_PERMISSIONS };
          if (!permissionsSnapshot.empty) {
            const permissionsData = permissionsSnapshot.docs[0].data();
            permissions = {
              ...DEFAULT_PERMISSIONS,
              ...(permissionsData.permissions || {})
            };
          }
          
          return {
            ...plan,
            permissions
          };
        } catch (error) {
          console.error(`Erro ao buscar permissões do plano ${plan.id}:`, error);
          return plan;
        }
      })
    );
    
    // Buscar todos os restaurantes para contar por plano
    const restaurantsQuery = query(
      collection(db, 'restaurants'),
      where('active', '==', true)
    );
    const restaurantsSnapshot = await getDocs(restaurantsQuery);
    
    // Contar restaurantes por plano
    const planCounts: { [planId: string]: number } = {};
    restaurantsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.planId) {
        planCounts[data.planId] = (planCounts[data.planId] || 0) + 1;
      }
    });
    
    // Combinar dados dos planos com contagens
    return plansWithPermissions.map(plan => ({
      ...plan,
      restaurantCount: planCounts[plan.id] || 0
    }));
  } catch (error) {
    console.error('Erro ao buscar estatísticas dos planos:', error);
    throw new Error('Falha ao buscar estatísticas dos planos');
  }
};
