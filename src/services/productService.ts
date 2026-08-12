import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc,
  deleteDoc, 
  doc, 
  query,
  where,
  type DocumentData,
  type UpdateData,
} from 'firebase/firestore';
import { db } from '../../firebase';
import type { Product } from '../types/product';

// Adicionar novo produto
export const addProduct = async (product: Omit<Product, 'id'>, restaurantId?: string): Promise<Product> => {
  try {
    const productData: any = {
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      available: product.available,
      image: product.image || '',
      restaurantId: restaurantId || 'YcL3Q98o8zkWRT1ak4BD', // Usar ID específico como padrão
      createdAt: new Date(),
      availableForDelivery: product.availableForDelivery ?? true
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
      ...product,
      restaurantId: restaurantId || 'YcL3Q98o8zkWRT1ak4BD',
      availableForDelivery: product.availableForDelivery ?? true
    };
  } catch (error) {
    console.error('Erro detalhado ao adicionar produto:', error);
    throw new Error(`Falha ao adicionar produto: ${error}`);
  }
};

// Buscar todos os produtos
export const getProducts = async (restaurantId: string): Promise<Product[]> => {
  try {
    // SEMPRE filtrar por restaurantId específico (sem orderBy para evitar índice composto)
    const q = query(
      collection(db, 'products'), 
      where('restaurantId', '==', restaurantId)
    );
    const querySnapshot = await getDocs(q);
    
    const products: Product[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      products.push({
        id: doc.id,
        name: data.name,
        description: data.description,
        price: coercePrice(data.price),
        category: data.category,
        available: data.available,
        image: data.image || '',
        preparationTime: data.preparationTime,
        translations: data.translations,
        availableForDelivery: data.availableForDelivery ?? true
      });
    });

    // Ordenar por nome no JavaScript
    return products.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    throw new Error('Falha ao buscar produtos');
  }
};

// Buscar produtos por categoria
export const getProductsByCategory = async (category: string, restaurantId: string): Promise<Product[]> => {
  try {
    // SEMPRE filtrar por categoria E restaurantId específico (sem orderBy)
    const q = query(
      collection(db, 'products'), 
      where('category', '==', category),
      where('restaurantId', '==', restaurantId)
    );
    const querySnapshot = await getDocs(q);
    
    const products: Product[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      products.push({
        id: doc.id,
        name: data.name,
        description: data.description,
        price: coercePrice(data.price),
        category: data.category,
        available: data.available,
        image: data.image || '',
        preparationTime: data.preparationTime,
        translations: data.translations,
        availableForDelivery: data.availableForDelivery ?? true
      });
    });

    // Ordenar por nome no JavaScript
    return products.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    throw new Error('Falha ao buscar produtos por categoria');
  }
};

function omitUndefinedDeep(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (value === null || value instanceof Date || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map(omitUndefinedDeep).filter((item) => item !== undefined);
  }
  const cleaned: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (nested === undefined) continue;
    const next = omitUndefinedDeep(nested);
    if (next !== undefined) cleaned[key] = next;
  }
  return cleaned;
}

function coercePrice(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = parseFloat(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

// Atualizar produto
export const updateProduct = async (id: string, product: Partial<Product>): Promise<void> => {
  try {
    const { id: _ignoredId, ...rest } = product as Partial<Product> & { id?: string };
    const payload = omitUndefinedDeep({
      ...rest,
      ...(rest.price !== undefined ? { price: coercePrice(rest.price) } : {}),
      updatedAt: new Date(),
    }) as Record<string, unknown>;

    const productRef = doc(db, 'products', id);
    await updateDoc(productRef, payload as UpdateData<DocumentData>);
  } catch (error) {
    console.error('Erro detalhado ao atualizar produto:', error);
    throw new Error(`Falha ao atualizar produto: ${error instanceof Error ? error.message : String(error)}`);
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
export const getProductCategories = async (restaurantId: string): Promise<string[]> => {
  try {
    const products = await getProducts(restaurantId);
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