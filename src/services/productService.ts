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
import type { Product } from '../types/product';

// Adicionar novo produto
export const addProduct = async (product: Omit<Product, 'id'>): Promise<Product> => {
  try {
    const productData: any = {
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      available: product.available,
      image: product.image || '',
      createdAt: new Date()
    };

    // Adicionar preparationTime apenas se não for undefined
    if (product.preparationTime !== undefined) {
      productData.preparationTime = product.preparationTime;
    }
    
    if (product.translations) {
      productData.translations = product.translations;
    }
    
    const docRef = await addDoc(collection(db, 'products'), productData);

    return {
      id: docRef.id,
      ...product
    };
  } catch (error) {
    console.error('Erro detalhado ao adicionar produto:', error);
    throw new Error(`Falha ao adicionar produto: ${error}`);
  }
};

// Buscar todos os produtos
export const getProducts = async (): Promise<Product[]> => {
  try {
    // Simplificar a query para evitar problemas com índices compostos
    const q = query(collection(db, 'products'), orderBy('name'));
    const querySnapshot = await getDocs(q);
    
    const products: Product[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      products.push({
        id: doc.id,
        name: data.name,
        description: data.description,
        price: data.price,
        category: data.category,
        available: data.available,
        image: data.image || '',
        preparationTime: data.preparationTime,
        translations: data.translations
      });
    });

    // Ordenar por categoria e depois por nome no JavaScript
    return products.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    throw new Error('Falha ao buscar produtos');
  }
};

// Buscar produtos por categoria
export const getProductsByCategory = async (category: string): Promise<Product[]> => {
  try {
    const q = query(
      collection(db, 'products'), 
      where('category', '==', category),
      orderBy('name')
    );
    const querySnapshot = await getDocs(q);
    
    const products: Product[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      products.push({
        id: doc.id,
        name: data.name,
        description: data.description,
        price: data.price,
        category: data.category,
        available: data.available,
        image: data.image || '',
        preparationTime: data.preparationTime,
        translations: data.translations
      });
    });

    return products;
  } catch (error) {
    throw new Error('Falha ao buscar produtos por categoria');
  }
};

// Atualizar produto
export const updateProduct = async (id: string, product: Partial<Product>): Promise<void> => {
  try {
    const productRef = doc(db, 'products', id);
    await updateDoc(productRef, {
      ...product,
      updatedAt: new Date()
    });
  } catch (error) {
    throw new Error('Falha ao atualizar produto');
  }
};

// Remover produto
export const deleteProduct = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'products', id));
  } catch (error) {
    throw new Error('Falha ao remover produto');
  }
};

// Buscar categorias únicas dos produtos (para compatibilidade)
export const getProductCategories = async (): Promise<string[]> => {
  try {
    const products = await getProducts();
    const categories = [...new Set(products.map(p => p.category))];
    return categories.sort();
  } catch (error) {
    throw new Error('Falha ao buscar categorias');
  }
};

// Filtrar produtos por preço
export const filterProductsByPrice = (products: Product[], maxPrice?: number, minPrice?: number): Product[] => {
  return products.filter(product => {
    if (maxPrice && product.price > maxPrice) return false;
    if (minPrice && product.price < minPrice) return false;
    return true;
  });
};

// Filtrar produtos por tempo de preparo
export const filterProductsByPreparationTime = (products: Product[], maxTime?: number): Product[] => {
  return products.filter(product => {
    if (maxTime && product.preparationTime && product.preparationTime > maxTime) return false;
    return true;
  });
}; 