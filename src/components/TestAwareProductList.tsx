import { useRestaurantData } from '../hooks/useRestaurantData';
import type { Product } from '../types/product';

interface TestAwareProductListProps {
  children: (products: Product[], isLoading: boolean) => React.ReactNode;
}

export default function TestAwareProductList({ children }: TestAwareProductListProps) {
  const { products, isLoading } = useRestaurantData();

  return <>{children(products, isLoading)}</>;
}
