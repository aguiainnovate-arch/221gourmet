import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc,
  deleteDoc, 
  doc, 
  query, 
  where
} from 'firebase/firestore';
import { db } from '../../firebase';

interface Translation {
  'en-US': string;
  'fr-FR': string;
}

export interface Category {
  id: string;
  name: string;
  restaurantId: string;
  createdAt: Date;
  // Traduções
  translations?: {
    name?: Translation;
  };
}

// Adicionar nova categoria
export const addCategory = async (name: string, restaurantId?: string, translations?: { name?: Translation }): Promise<Category> => {
  try {
    const targetRestaurantId = restaurantId || 'YcL3Q98o8zkWRT1ak4BD';
    const categoryData: any = {
      name: name,
      restaurantId: targetRestaurantId,
      createdAt: new Date()
    };
    
    if (translations) {
      categoryData.translations = translations;
    }

    const docRef = await addDoc(collection(db, 'categories'), categoryData);

    return {
      id: docRef.id,
      name: name,
      restaurantId: targetRestaurantId,
      createdAt: new Date(),
      translations
    };
  } catch (error) {
    throw new Error('Falha ao adicionar categoria');
  }
};

// Buscar todas as categorias
export const getCategories = async (restaurantId: string): Promise<Category[]> => {
  try {
    // SEMPRE filtrar por restaurantId específico (sem orderBy para evitar índice composto)
    const q = query(
      collection(db, 'categories'), 
      where('restaurantId', '==', restaurantId)
    );
    const querySnapshot = await getDocs(q);
    
    const categories: Category[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      categories.push({
        id: doc.id,
        name: data.name,
        restaurantId: data.restaurantId,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
        translations: data.translations
      });
    });

    // Ordenar por nome no JavaScript
    return categories.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    throw new Error('Falha ao buscar categorias');
  }
};

// Atualizar categoria
export const updateCategory = async (id: string, name: string, translations?: { name?: Translation }): Promise<void> => {
  try {
    const categoryRef = doc(db, 'categories', id);
    const updateData: any = {
      name: name,
      updatedAt: new Date()
    };
    
    if (translations) {
      updateData.translations = translations;
    }
    
    await updateDoc(categoryRef, updateData);
  } catch (error) {
    throw new Error('Falha ao atualizar categoria');
  }
};

// Remover categoria
export const deleteCategory = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'categories', id));
  } catch (error) {
    throw new Error('Falha ao remover categoria');
  }
}; 