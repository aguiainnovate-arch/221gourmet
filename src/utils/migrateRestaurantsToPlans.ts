// Script para migrar restaurantes antigos e adicionar planId
// Execute este script apenas uma vez para migrar restaurantes sem planId

import { updateRestaurant, getRestaurants } from '../services/restaurantService';
import { getActivePlans } from '../services/planService';

export async function migrateRestaurantsToPlans() {
  console.log('🔄 Iniciando migração de restaurantes para planos...');
  
  try {
    // Buscar todos os restaurantes
    const restaurants = await getRestaurants();
    const restaurantsWithoutPlan = restaurants.filter(r => !r.planId);
    
    if (restaurantsWithoutPlan.length === 0) {
      console.log('✅ Todos os restaurantes já possuem planos associados!');
      return { success: true, migrated: 0 };
    }
    
    console.log(`📋 Encontrados ${restaurantsWithoutPlan.length} restaurantes sem plano`);
    
    // Buscar planos ativos
    const activePlans = await getActivePlans();
    
    if (activePlans.length === 0) {
      console.error('❌ Nenhum plano ativo encontrado. Crie um plano ativo primeiro.');
      return { success: false, error: 'Nenhum plano ativo encontrado' };
    }
    
    // Usar o plano mais barato como padrão
    const defaultPlan = activePlans[0]; // Já ordenado por preço
    console.log(`📌 Usando plano padrão: ${defaultPlan.name} (${defaultPlan.id})`);
    
    let migrated = 0;
    const errors: string[] = [];
    
    // Migrar cada restaurante
    for (const restaurant of restaurantsWithoutPlan) {
      try {
        await updateRestaurant(restaurant.id, {
          planId: defaultPlan.id
        });
        
        console.log(`✅ Restaurante "${restaurant.name}" migrado para o plano "${defaultPlan.name}"`);
        migrated++;
      } catch (error) {
        const errorMsg = `Erro ao migrar restaurante "${restaurant.name}": ${error}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }
    
    console.log(`🎉 Migração concluída!`);
    console.log(`✅ ${migrated} restaurantes migrados`);
    if (errors.length > 0) {
      console.log(`❌ ${errors.length} erros encontrados`);
    }
    
    return { 
      success: true, 
      migrated, 
      errors,
      defaultPlan: defaultPlan.name 
    };
    
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    return { success: false, error: String(error) };
  }
}

// Para executar no console do navegador:
/*
const { migrateRestaurantsToPlans } = await import('./utils/migrateRestaurantsToPlans');
migrateRestaurantsToPlans().then(result => {
  console.log('Resultado da migração:', result);
});
*/
