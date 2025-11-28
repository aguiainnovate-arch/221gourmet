/**
 * Script de migração: Adicionar permissão de delivery para todos os restaurantes
 * 
 * Este script garante que todos os restaurantes existentes tenham a permissão
 * de delivery ativada por padrão, evitando que eles "desapareçam" do sistema
 * de delivery após a adição da nova permissão.
 */

import { 
  collection, 
  getDocs,
  query,
  where,
  Timestamp,
  addDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../../firebase';
import { DEFAULT_PERMISSIONS } from '../types/permission';

async function migrateDeliveryPermission() {
  console.log('🚀 Iniciando migração de permissões de delivery...');
  
  try {
    // 1. Buscar todos os restaurantes
    const restaurantsQuery = query(collection(db, 'restaurants'));
    const restaurantsSnapshot = await getDocs(restaurantsQuery);
    
    console.log(`📦 Encontrados ${restaurantsSnapshot.size} restaurantes`);
    
    let updated = 0;
    let created = 0;
    let skipped = 0;
    
    // 2. Para cada restaurante, verificar/criar/atualizar permissões
    for (const restaurantDoc of restaurantsSnapshot.docs) {
      const restaurantId = restaurantDoc.id;
      const restaurantName = restaurantDoc.data().name;
      
      console.log(`\n📍 Processando: ${restaurantName} (${restaurantId})`);
      
      // Verificar se já existe registro de permissões
      const permissionsQuery = query(
        collection(db, 'restaurantPermissions'),
        where('restaurantId', '==', restaurantId)
      );
      const permissionsSnapshot = await getDocs(permissionsQuery);
      
      if (permissionsSnapshot.empty) {
        // Criar novo registro com todas as permissões padrão
        await addDoc(collection(db, 'restaurantPermissions'), {
          restaurantId,
          permissions: DEFAULT_PERMISSIONS,
          updatedAt: Timestamp.now()
        });
        console.log(`  ✅ Criado novo registro de permissões (delivery: ${DEFAULT_PERMISSIONS.delivery})`);
        created++;
      } else {
        // Atualizar registro existente
        const permissionDoc = permissionsSnapshot.docs[0];
        const currentPermissions = permissionDoc.data().permissions || {};
        
        // Verificar se já tem a permissão de delivery
        if (currentPermissions.delivery !== undefined) {
          console.log(`  ⏭️  Permissão de delivery já existe (delivery: ${currentPermissions.delivery})`);
          skipped++;
          continue;
        }
        
        // Adicionar permissão de delivery mantendo as outras
        const updatedPermissions = {
          ...DEFAULT_PERMISSIONS,
          ...currentPermissions,
          delivery: true // Garantir que delivery seja true para restaurantes existentes
        };
        
        await updateDoc(permissionDoc.ref, {
          permissions: updatedPermissions,
          updatedAt: Timestamp.now()
        });
        
        console.log(`  ✅ Atualizado com permissão de delivery (delivery: true)`);
        updated++;
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✨ Migração concluída com sucesso!');
    console.log(`📊 Resumo:`);
    console.log(`   - Criados: ${created}`);
    console.log(`   - Atualizados: ${updated}`);
    console.log(`   - Já existiam: ${skipped}`);
    console.log(`   - Total: ${restaurantsSnapshot.size}`);
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    throw error;
  }
}

// Executar a migração
migrateDeliveryPermission()
  .then(() => {
    console.log('\n✅ Script finalizado!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script finalizado com erro:', error);
    process.exit(1);
  });

