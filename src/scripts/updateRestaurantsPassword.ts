import { getDocs, collection, updateDoc, doc } from 'firebase/firestore';
import bcrypt from 'bcryptjs';
import { db } from '../../firebase';

/**
 * Script para atualizar restaurantes existentes com senha padrão "123456" criptografada
 * Execute este script UMA ÚNICA VEZ após deploy
 */
export const updateExistingRestaurantsWithPassword = async () => {
  try {
    console.log('🔄 Iniciando atualização de senhas dos restaurantes...');
    
    // Buscar todos os restaurantes
    const restaurantsSnapshot = await getDocs(collection(db, 'restaurants'));
    
    // Senha padrão criptografada com bcrypt
    const defaultPassword = '123456';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    // Atualizar cada restaurante
    for (const restaurantDoc of restaurantsSnapshot.docs) {
      const restaurantData = restaurantDoc.data();
      
      // Verificar se já tem senha
      if (restaurantData.password) {
        console.log(`⏭️  Restaurante "${restaurantData.name}" já possui senha. Pulando...`);
        skippedCount++;
        continue;
      }
      
      // Atualizar com senha padrão
      const restaurantRef = doc(db, 'restaurants', restaurantDoc.id);
      await updateDoc(restaurantRef, {
        password: hashedPassword
      });
      
      console.log(`✅ Restaurante "${restaurantData.name}" atualizado com senha padrão`);
      updatedCount++;
    }
    
    console.log('\n📊 Resumo:');
    console.log(`   ✅ ${updatedCount} restaurantes atualizados`);
    console.log(`   ⏭️  ${skippedCount} restaurantes pulados (já tinham senha)`);
    console.log(`   📝 Senha padrão: "${defaultPassword}"`);
    console.log('\n✨ Atualização concluída com sucesso!');
    
    return {
      success: true,
      updatedCount,
      skippedCount
    };
  } catch (error) {
    console.error('❌ Erro ao atualizar senhas:', error);
    throw error;
  }
};

// Para executar via console do navegador:
// import { updateExistingRestaurantsWithPassword } from './src/scripts/updateRestaurantsPassword';
// updateExistingRestaurantsWithPassword();

