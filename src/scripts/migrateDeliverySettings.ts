/**
 * Script de migração: Adicionar configurações de delivery para restaurantes e produtos
 * 
 * Este script garante que todos os restaurantes e produtos existentes tenham as
 * configurações de delivery definidas, evitando que eles "desapareçam" do sistema
 * de delivery após a adição das novas configurações.
 */

import { 
  collection, 
  getDocs,
  updateDoc,
  doc
} from 'firebase/firestore';
import { db } from '../../firebase';

async function migrateDeliverySettings() {
  console.log('🚀 Iniciando migração de configurações de delivery...');
  
  try {
    // 1. Migrar Restaurantes
    console.log('\n📦 MIGRANDO RESTAURANTES...');
    const restaurantsSnapshot = await getDocs(collection(db, 'restaurants'));
    
    console.log(`   Encontrados ${restaurantsSnapshot.size} restaurantes`);
    
    let restaurantsUpdated = 0;
    let restaurantsSkipped = 0;
    
    for (const restaurantDoc of restaurantsSnapshot.docs) {
      const restaurantData = restaurantDoc.data();
      const restaurantName = restaurantData.name;
      
      console.log(`\n   📍 Processando: ${restaurantName} (${restaurantDoc.id})`);
      
      // Verificar se já tem deliverySettings
      if (restaurantData.deliverySettings) {
        console.log(`      ⏭️  Já possui deliverySettings`);
        restaurantsSkipped++;
        continue;
      }
      
      // Adicionar deliverySettings padrão
      await updateDoc(doc(db, 'restaurants', restaurantDoc.id), {
        deliverySettings: {
          enabled: true, // Por padrão, todos os restaurantes ficam visíveis
          aiDescription: '' // Descrição vazia para ser preenchida depois
        }
      });
      
      console.log(`      ✅ Adicionado deliverySettings (enabled: true)`);
      restaurantsUpdated++;
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO - RESTAURANTES:');
    console.log(`   - Atualizados: ${restaurantsUpdated}`);
    console.log(`   - Já existiam: ${restaurantsSkipped}`);
    console.log(`   - Total: ${restaurantsSnapshot.size}`);
    console.log('='.repeat(60));
    
    // 2. Migrar Produtos
    console.log('\n📦 MIGRANDO PRODUTOS...');
    const productsSnapshot = await getDocs(collection(db, 'products'));
    
    console.log(`   Encontrados ${productsSnapshot.size} produtos`);
    
    let productsUpdated = 0;
    let productsSkipped = 0;
    
    for (const productDoc of productsSnapshot.docs) {
      const productData = productDoc.data();
      
      // Verificar se já tem availableForDelivery
      if (productData.availableForDelivery !== undefined) {
        productsSkipped++;
        continue;
      }
      
      // Adicionar availableForDelivery padrão
      await updateDoc(doc(db, 'products', productDoc.id), {
        availableForDelivery: true // Por padrão, todos os produtos ficam disponíveis
      });
      
      productsUpdated++;
      
      // Log a cada 10 produtos
      if (productsUpdated % 10 === 0) {
        console.log(`   ⏳ Processados ${productsUpdated} produtos...`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO - PRODUTOS:');
    console.log(`   - Atualizados: ${productsUpdated}`);
    console.log(`   - Já existiam: ${productsSkipped}`);
    console.log(`   - Total: ${productsSnapshot.size}`);
    console.log('='.repeat(60));
    
    console.log('\n✨ Migração concluída com sucesso!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    throw error;
  }
}

// Executar a migração
migrateDeliverySettings()
  .then(() => {
    console.log('\n✅ Script finalizado!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script finalizado com erro:', error);
    process.exit(1);
  });

