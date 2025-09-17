import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { getRestaurants, type Restaurant } from '../services/restaurantService';

interface TestModeContextType {
  isTestMode: boolean;
  testRestaurant: Restaurant | null;
  isLoading: boolean;
  error: string | null;
}

const TestModeContext = createContext<TestModeContextType | undefined>(undefined);

export const TestModeProvider = ({ children }: { children: ReactNode }) => {
  const [isTestMode, setIsTestMode] = useState(false);
  const [testRestaurant, setTestRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const detectTestMode = async () => {
      try {
        setIsLoading(true);
        const path = window.location.pathname;
        const testMatch = path.match(/^\/test\/([^\/]+)/);
        
        if (testMatch) {
          const restaurantSlug = testMatch[1];
          setIsTestMode(true);
          
          // Buscar restaurante pelo slug (nome formatado)
          const restaurants = await getRestaurants();
          const restaurant = restaurants.find(r => 
            r.name.toLowerCase().replace(/\s+/g, '-') === restaurantSlug ||
            r.name.toLowerCase().replace(/\s+/g, '') === restaurantSlug.replace(/-/g, '')
          );
          
          if (restaurant && restaurant.active) {
            setTestRestaurant(restaurant);
            setError(null);
          } else {
            setError('Restaurante não encontrado ou inativo');
            setTestRestaurant(null);
          }
        } else {
          setIsTestMode(false);
          setTestRestaurant(null);
          setError(null);
        }
      } catch (err) {
        console.error('Erro ao detectar modo de teste:', err);
        setError('Erro ao carregar dados do restaurante');
      } finally {
        setIsLoading(false);
      }
    };

    detectTestMode();
  }, []);

  return (
    <TestModeContext.Provider value={{ isTestMode, testRestaurant, isLoading, error }}>
      {children}
    </TestModeContext.Provider>
  );
};

export const useTestMode = () => {
  const context = useContext(TestModeContext);
  if (context === undefined) {
    throw new Error('useTestMode must be used within a TestModeProvider');
  }
  return context;
};
