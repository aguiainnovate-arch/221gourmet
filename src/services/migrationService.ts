import { 
  collection, 
  getDocs, 
  updateDoc,
  doc,
  query
} from 'firebase/firestore';
import { db } from '../../firebase';

export interface MigrationResult {
  productsUpdated: number;
  categoriesUpdated: number;
  errors: string[];
}

// Migrar produtos sem restaurantId para um restaurante específico
export const migrateProductsToRestaurant = async (restaurantId: string): Promise<MigrationResult> => {
  const result: MigrationResult = {
    productsUpdated: 0,
    categoriesUpdated: 0,
    errors: []
  };

  try {
    console.log(`Iniciando migração de produtos para restaurante: ${restaurantId}`);
    
    // Buscar todos os produtos
    const productsQuery = query(collection(db, 'products'));
    const productsSnapshot = await getDocs(productsQuery);
    
    console.log(`Encontrados ${productsSnapshot.size} produtos no banco`);
    
    // Atualizar produtos que não têm restaurantId ou têm restaurantId vazio
    for (const productDoc of productsSnapshot.docs) {
      try {
        const productData = productDoc.data();
        
        // Se não tem restaurantId ou está vazio/null, migrar
        if (!productData.restaurantId || productData.restaurantId === '') {
          await updateDoc(doc(db, 'products', productDoc.id), {
            restaurantId: restaurantId
          });
          result.productsUpdated++;
          console.log(`Produto migrado: ${productData.name} -> ${restaurantId}`);
        }
      } catch (error) {
        const errorMsg = `Erro ao migrar produto ${productDoc.id}: ${error}`;
        console.error(errorMsg);
        result.errors.push(errorMsg);
      }
    }

    console.log(`Iniciando migração de categorias para restaurante: ${restaurantId}`);
    
    // Buscar todas as categorias
    const categoriesQuery = query(collection(db, 'categories'));
    const categoriesSnapshot = await getDocs(categoriesQuery);
    
    console.log(`Encontradas ${categoriesSnapshot.size} categorias no banco`);
    
    // Atualizar categorias que não têm restaurantId ou têm restaurantId vazio
    for (const categoryDoc of categoriesSnapshot.docs) {
      try {
        const categoryData = categoryDoc.data();
        
        // Se não tem restaurantId ou está vazio/null, migrar
        if (!categoryData.restaurantId || categoryData.restaurantId === '') {
          await updateDoc(doc(db, 'categories', categoryDoc.id), {
            restaurantId: restaurantId
          });
          result.categoriesUpdated++;
          console.log(`Categoria migrada: ${categoryData.name} -> ${restaurantId}`);
        }
      } catch (error) {
        const errorMsg = `Erro ao migrar categoria ${categoryDoc.id}: ${error}`;
        console.error(errorMsg);
        result.errors.push(errorMsg);
      }
    }

    console.log('Migração concluída:', result);
    return result;
    
  } catch (error) {
    const errorMsg = `Erro geral na migração: ${error}`;
    console.error(errorMsg);
    result.errors.push(errorMsg);
    return result;
  }
};

// Contar produtos e categorias sem restaurantId
export const countItemsWithoutRestaurant = async (): Promise<{products: number, categories: number}> => {
  try {
    const [productsSnapshot, categoriesSnapshot] = await Promise.all([
      getDocs(collection(db, 'products')),
      getDocs(collection(db, 'categories'))
    ]);
    
    let productsCount = 0;
    let categoriesCount = 0;
    
    productsSnapshot.forEach(doc => {
      const data = doc.data();
      if (!data.restaurantId || data.restaurantId === '') {
        productsCount++;
      }
    });
    
    categoriesSnapshot.forEach(doc => {
      const data = doc.data();
      if (!data.restaurantId || data.restaurantId === '') {
        categoriesCount++;
      }
    });
    
    return { products: productsCount, categories: categoriesCount };
  } catch (error) {
    console.error('Erro ao contar itens sem restaurante:', error);
    return { products: 0, categories: 0 };
  }
};
