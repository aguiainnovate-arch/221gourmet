import { 
  collection, 
  getDocs, 
  query, 
  where,
  addDoc,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../../firebase';
import { DEFAULT_PERMISSIONS } from '../types/permission';

/**
 * Script de migração para adicionar permissões padrão a todos os restaurantes existentes
 * que ainda não possuem permissões configuradas
 */
export const migrateRestaurantPermissions = async (): Promise<void> => {
  try {
    console.log('Iniciando migração de permissões de restaurantes...');
    
    // Buscar todos os restaurantes ativos
    const restaurantsQuery = query(
      collection(db, 'restaurants'),
      where('active', '==', true)
    );
    const restaurantsSnapshot = await getDocs(restaurantsQuery);
    
    console.log(`Encontrados ${restaurantsSnapshot.size} restaurantes ativos`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const restaurantDoc of restaurantsSnapshot.docs) {
      const restaurantId = restaurantDoc.id;
      
      // Verificar se já existe registro de permissões
      const permissionsQuery = query(
        collection(db, 'restaurantPermissions'),
        where('restaurantId', '==', restaurantId)
      );
      const permissionsSnapshot = await getDocs(permissionsQuery);
      
      if (permissionsSnapshot.empty) {
        // Criar permissões padrão para o restaurante
        await addDoc(collection(db, 'restaurantPermissions'), {
          restaurantId,
          permissions: DEFAULT_PERMISSIONS,
          updatedAt: Timestamp.now()
        });
        
        migratedCount++;
        console.log(`Permissões criadas para restaurante: ${restaurantId}`);
      } else {
        skippedCount++;
        console.log(`Restaurante ${restaurantId} já possui permissões configuradas`);
      }
    }
    
    console.log(`Migração concluída!`);
    console.log(`- Restaurantes migrados: ${migratedCount}`);
    console.log(`- Restaurantes ignorados: ${skippedCount}`);
    
  } catch (error) {
    console.error('Erro durante a migração de permissões:', error);
    throw error;
  }
};

/**
 * Script de migração para adicionar permissões padrão a todos os planos existentes
 * que ainda não possuem permissões configuradas
 */
export const migratePlanPermissions = async (): Promise<void> => {
  try {
    console.log('Iniciando migração de permissões de planos...');
    
    // Buscar todos os planos
    const plansQuery = query(collection(db, 'plans'));
    const plansSnapshot = await getDocs(plansQuery);
    
    console.log(`Encontrados ${plansSnapshot.size} planos`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const planDoc of plansSnapshot.docs) {
      const planId = planDoc.id;
      
      // Verificar se já existe registro de permissões
      const permissionsQuery = query(
        collection(db, 'planPermissions'),
        where('planId', '==', planId)
      );
      const permissionsSnapshot = await getDocs(permissionsQuery);
      
      if (permissionsSnapshot.empty) {
        // Criar permissões padrão para o plano
        await addDoc(collection(db, 'planPermissions'), {
          planId,
          permissions: DEFAULT_PERMISSIONS,
          updatedAt: Timestamp.now()
        });
        
        migratedCount++;
        console.log(`Permissões criadas para plano: ${planId}`);
      } else {
        skippedCount++;
        console.log(`Plano ${planId} já possui permissões configuradas`);
      }
    }
    
    console.log(`Migração de planos concluída!`);
    console.log(`- Planos migrados: ${migratedCount}`);
    console.log(`- Planos ignorados: ${skippedCount}`);
    
  } catch (error) {
    console.error('Erro durante a migração de permissões de planos:', error);
    throw error;
  }
};

/**
 * Executa todas as migrações de permissões
 */
export const runAllPermissionMigrations = async (): Promise<void> => {
  try {
    console.log('=== INICIANDO MIGRAÇÕES DE PERMISSÕES ===');
    
    await migratePlanPermissions();
    await migrateRestaurantPermissions();
    
    console.log('=== MIGRAÇÕES CONCLUÍDAS COM SUCESSO ===');
  } catch (error) {
    console.error('=== ERRO DURANTE AS MIGRAÇÕES ===', error);
    throw error;
  }
};
