import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc,
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  where 
} from 'firebase/firestore';
import { db } from '../../firebase';

export interface Category {
  id: string;
  name: string;
  createdAt: Date;
}

// Adicionar nova categoria
export const addCategory = async (name: string): Promise<Category> => {
  try {
    const docRef = await addDoc(collection(db, 'categories'), {
      name: name,
      createdAt: new Date()
    });

    return {
      id: docRef.id,
      name: name,
      createdAt: new Date()
    };
  } catch (error) {
    throw new Error('Falha ao adicionar categoria');
  }
};

// Buscar todas as categorias
export const getCategories = async (): Promise<Category[]> => {
  try {
    const q = query(collection(db, 'categories'), orderBy('name'));
    const querySnapshot = await getDocs(q);
    
    const categories: Category[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      categories.push({
        id: doc.id,
        name: data.name,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date()
      });
    });

    return categories;
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    throw new Error('Falha ao buscar categorias');
  }
};

// Atualizar categoria
export const updateCategory = async (id: string, name: string): Promise<void> => {
  try {
    const categoryRef = doc(db, 'categories', id);
    await updateDoc(categoryRef, {
      name: name,
      updatedAt: new Date()
    });
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