import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
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
  const location = useLocation();

  useEffect(() => {
    const detectTestMode = async () => {
      try {
        setIsLoading(true);
        const path = location.pathname;
        
        // Lista de rotas que NÃO são IDs de restaurante
        const excludedPaths = [
          '/delivery',
          '/owner',
          '/register',
          '/testing',
          '/test'
        ];
        
        // Verificar se a rota começa com alguma rota excluída
        const isExcluded = excludedPaths.some(excluded => path.startsWith(excluded));
        
        // Se não for uma rota excluída e não for a raiz
        if (!isExcluded && path !== '/' && path.length > 1) {
          // Extrair primeiro segmento da URL (ID do restaurante)
          const pathSegments = path.split('/').filter(Boolean);
          const restaurantId = pathSegments[0];
          
          // Verificar se parece um ID do Firestore (geralmente tem pelo menos 20 caracteres)
          // Mas aceitamos IDs com pelo menos 10 caracteres para flexibilidade
          if (restaurantId && restaurantId.length >= 10 && !restaurantId.includes('.')) {
            setIsTestMode(true);
            
            try {
              // Buscar restaurante pelo ID
              const restaurants = await getRestaurants();
              const restaurant = restaurants.find(r => r.id === restaurantId);
              
              if (restaurant && restaurant.active) {
                setTestRestaurant(restaurant);
                setError(null);
              } else {
                setError('Restaurante não encontrado ou inativo');
                setTestRestaurant(null);
              }
            } catch (err) {
              console.error('Erro ao buscar restaurante:', err);
              setError('Erro ao carregar dados do restaurante');
              setTestRestaurant(null);
            }
          } else {
            // Não é um ID válido, não é modo teste
            setIsTestMode(false);
            setTestRestaurant(null);
            setError(null);
          }
        } else {
          // É uma rota excluída ou raiz, não é modo teste
          setIsTestMode(false);
          setTestRestaurant(null);
          setError(null);
        }
      } catch (err) {
        console.error('Erro ao detectar modo de teste:', err);
        setError('Erro ao carregar dados do restaurante');
        setIsTestMode(false);
        setTestRestaurant(null);
      } finally {
        setIsLoading(false);
      }
    };

    detectTestMode();
  }, [location.pathname]);

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
