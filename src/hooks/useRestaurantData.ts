import { useState, useEffect } from 'react';
import { useRestaurantId } from './useRestaurantId';
import { getProducts } from '../services/productService';
import { getCategories } from '../services/categoryService';
import type { Product } from '../types/product';
import type { Category } from '../services/categoryService';

export const useRestaurantData = () => {
  const restaurantId = useRestaurantId();
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
      
      // Filtrar apenas produtos disponíveis
      setProducts(productsData.filter(p => p.available));
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
  }, [restaurantId]);

  return {
    products,
    categories,
    isLoading,
    error,
    restaurantId: restaurantId,
    reload: loadData
  };
};
