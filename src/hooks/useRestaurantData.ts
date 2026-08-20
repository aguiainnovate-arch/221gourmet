import { useState, useEffect } from 'react';
import { useRestaurantId } from './useRestaurantId';
import { getProducts } from '../services/productService';
import { getCategories } from '../services/categoryService';
import type { Product } from '../types/product';
import type { Category } from '../services/categoryService';

interface UseRestaurantDataOptions {
  /** Gestão do cardápio: mantém itens indisponíveis visíveis para o restaurante. */
  includeUnavailable?: boolean;
}

export const useRestaurantData = (options?: UseRestaurantDataOptions) => {
  const restaurantId = useRestaurantId();
  const includeUnavailable = options?.includeUnavailable === true;
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [productsData, categoriesData] = await Promise.all([
        getProducts(restaurantId),
        getCategories(restaurantId)
      ]);
      
      setProducts(includeUnavailable ? productsData : productsData.filter(p => p.available));
      setCategories(categoriesData);
    } catch (err) {
      console.error('Erro ao carregar dados do restaurante:', err);
      setError('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [restaurantId, includeUnavailable]);

  return {
    products,
    categories,
    isLoading,
    error,
    restaurantId: restaurantId,
    reload: loadData
  };
};
