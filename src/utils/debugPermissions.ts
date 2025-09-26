import { 
  collection, 
  getDocs, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from '../../firebase';

/**
 * Script de debug para verificar o estado das permissões no banco de dados
 */
export const debugPermissions = async (restaurantId?: string, planId?: string): Promise<void> => {
  try {
    console.log('=== DEBUG DE PERMISSÕES ===');
    
    if (restaurantId) {
      console.log(`\n🔍 Verificando restaurante: ${restaurantId}`);
      
      // Buscar dados do restaurante
      const restaurantQuery = query(
        collection(db, 'restaurants'),
        where('__name__', '==', restaurantId)
      );
      const restaurantSnapshot = await getDocs(restaurantQuery);
      
      if (!restaurantSnapshot.empty) {
        const restaurantData = restaurantSnapshot.docs[0].data();
        console.log('📋 Dados do restaurante:', {
          id: restaurantSnapshot.docs[0].id,
          name: restaurantData.name,
          planId: restaurantData.planId,
          active: restaurantData.active
        });
      } else {
        console.log('❌ Restaurante não encontrado');
        return;
      }
      
      // Buscar permissões do restaurante
      const restaurantPermissionsQuery = query(
        collection(db, 'restaurantPermissions'),
        where('restaurantId', '==', restaurantId)
      );
      const restaurantPermissionsSnapshot = await getDocs(restaurantPermissionsQuery);
      
      if (!restaurantPermissionsSnapshot.empty) {
        const permissionsData = restaurantPermissionsSnapshot.docs[0].data();
        console.log('🔐 Permissões do restaurante:', permissionsData);
      } else {
        console.log('⚠️ Nenhuma permissão encontrada para o restaurante');
      }
    }
    
    if (planId) {
      console.log(`\n🔍 Verificando plano: ${planId}`);
      
      // Buscar dados do plano
      const planQuery = query(
        collection(db, 'plans'),
        where('__name__', '==', planId)
      );
      const planSnapshot = await getDocs(planQuery);
      
      if (!planSnapshot.empty) {
        const planData = planSnapshot.docs[0].data();
        console.log('📋 Dados do plano:', {
          id: planSnapshot.docs[0].id,
          name: planData.name,
          active: planData.active
        });
      } else {
        console.log('❌ Plano não encontrado');
        return;
      }
      
      // Buscar permissões do plano
      const planPermissionsQuery = query(
        collection(db, 'planPermissions'),
        where('planId', '==', planId)
      );
      const planPermissionsSnapshot = await getDocs(planPermissionsQuery);
      
      if (!planPermissionsSnapshot.empty) {
        const permissionsData = planPermissionsSnapshot.docs[0].data();
        console.log('🔐 Permissões do plano:', permissionsData);
      } else {
        console.log('⚠️ Nenhuma permissão encontrada para o plano');
      }
    }
    
    // Listar todos os restaurantes e seus planos
    console.log('\n📊 Lista de todos os restaurantes:');
    const allRestaurantsQuery = query(collection(db, 'restaurants'));
    const allRestaurantsSnapshot = await getDocs(allRestaurantsQuery);
    
    allRestaurantsSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`- ${data.name} (ID: ${doc.id}, Plano: ${data.planId || 'N/A'})`);
    });
    
    // Listar todos os planos
    console.log('\n📊 Lista de todos os planos:');
    const allPlansQuery = query(collection(db, 'plans'));
    const allPlansSnapshot = await getDocs(allPlansQuery);
    
    allPlansSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`- ${data.name} (ID: ${doc.id})`);
    });
    
    // Listar todas as permissões de restaurantes
    console.log('\n🔐 Permissões de restaurantes:');
    const allRestaurantPermissionsQuery = query(collection(db, 'restaurantPermissions'));
    const allRestaurantPermissionsSnapshot = await getDocs(allRestaurantPermissionsQuery);
    
    allRestaurantPermissionsSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`- Restaurante ${data.restaurantId}:`, data.permissions);
    });
    
    // Listar todas as permissões de planos
    console.log('\n🔐 Permissões de planos:');
    const allPlanPermissionsQuery = query(collection(db, 'planPermissions'));
    const allPlanPermissionsSnapshot = await getDocs(allPlanPermissionsQuery);
    
    allPlanPermissionsSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`- Plano ${data.planId}:`, data.permissions);
    });
    
    console.log('\n=== FIM DO DEBUG ===');
    
  } catch (error) {
    console.error('Erro durante o debug:', error);
  }
};

/**
 * Função para forçar a aplicação de permissões de um plano a um restaurante específico
 * Esta função sobrescreve COMPLETAMENTE as permissões do restaurante com as do plano
 */
export const forceApplyPlanPermissions = async (restaurantId: string, planId: string): Promise<void> => {
  try {
    console.log(`🔄 Forçando aplicação de permissões do plano ${planId} ao restaurante ${restaurantId}`);
    
    // Buscar permissões do plano
    const planPermissionsQuery = query(
      collection(db, 'planPermissions'),
      where('planId', '==', planId)
    );
    const planPermissionsSnapshot = await getDocs(planPermissionsQuery);
    
    if (planPermissionsSnapshot.empty) {
      console.log('❌ Plano não possui permissões configuradas');
      return;
    }
    
    const planPermissionsData = planPermissionsSnapshot.docs[0].data();
    console.log('📋 Permissões do plano:', planPermissionsData.permissions);
    
    // Importar permissões padrão para garantir que todas as permissões sejam definidas
    const { DEFAULT_PERMISSIONS } = await import('../types/permission');
    
    // Criar objeto de permissões completo, sobrescrevendo com as do plano
    const completePermissions = {
      ...DEFAULT_PERMISSIONS,
      ...planPermissionsData.permissions
    };
    
    console.log('📋 Permissões completas a serem aplicadas:', completePermissions);
    
    // Aplicar permissões ao restaurante (isso sobrescreve completamente as permissões existentes)
    const { updateRestaurantPermissions } = await import('../services/permissionService');
    await updateRestaurantPermissions(restaurantId, completePermissions);
    
    console.log('✅ Permissões aplicadas com sucesso!');
    
  } catch (error) {
    console.error('Erro ao forçar aplicação de permissões:', error);
  }
};
