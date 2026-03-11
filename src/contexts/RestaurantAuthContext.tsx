import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import bcrypt from 'bcryptjs';
import { getRestaurants, updateRestaurant } from '../services/restaurantService';
const DEFAULT_PASSWORD = '123456';

interface RestaurantAuthContextType {
  isAuthenticated: boolean;
  currentRestaurantId: string | null;
  /** Quando logado como motoboy, ID do usuário motoboy. */
  motoboyUserId?: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const RestaurantAuthContext = createContext<RestaurantAuthContextType | undefined>(undefined);

export const RestaurantAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentRestaurantId, setCurrentRestaurantId] = useState<string | null>(null);
  const [motoboyUserId, setMotoboyUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Carregar sessão salva do localStorage
    const savedSession = localStorage.getItem('restaurant_auth_session');
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        const now = new Date().getTime();
        // Verificar se a sessão não expirou (24 horas)
        if (session.expiresAt && session.expiresAt > now) {
          setIsAuthenticated(true);
          setCurrentRestaurantId(session.restaurantId);
          setMotoboyUserId(session.motoboyUserId ?? null);
        } else {
          localStorage.removeItem('restaurant_auth_session');
        }
      } catch (error) {
        console.error('Erro ao carregar sessão:', error);
        localStorage.removeItem('restaurant_auth_session');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // Buscar todos os restaurantes
      const restaurants = await getRestaurants();
      
      // Encontrar restaurante pelo email
      const restaurant = restaurants.find(r => r.email.toLowerCase() === email.toLowerCase());
      
      if (!restaurant) {
        return false;
      }

      // Garantir que o restaurante tem senha configurada
      let passwordHash = restaurant.password;
      if (!passwordHash) {
        // Configurar senha padrão para restaurantes antigos
        passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
        try {
          await updateRestaurant(restaurant.id, { password: passwordHash });
        } catch (err) {
          console.error('Erro ao salvar senha padrão para o restaurante:', err);
        }
      }

      // Verificar senha com bcrypt
      const passwordMatch = await bcrypt.compare(password, passwordHash);
      
      if (passwordMatch) {
        setIsAuthenticated(true);
        setCurrentRestaurantId(restaurant.id);
        setMotoboyUserId(null);

        // Salvar sessão no localStorage (expira em 24 horas)
        const expiresAt = new Date().getTime() + (24 * 60 * 60 * 1000);
        localStorage.setItem('restaurant_auth_session', JSON.stringify({
          restaurantId: restaurant.id,
          motoboyUserId: null,
          expiresAt
        }));
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      return false;
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentRestaurantId(null);
    setMotoboyUserId(null);
    localStorage.removeItem('restaurant_auth_session');
  };

  return (
    <RestaurantAuthContext.Provider
      value={{
        isAuthenticated,
        currentRestaurantId,
        motoboyUserId,
        login,
        logout,
        isLoading
      }}
    >
      {children}
    </RestaurantAuthContext.Provider>
  );
};

export const useRestaurantAuth = () => {
  const context = useContext(RestaurantAuthContext);
  if (context === undefined) {
    throw new Error('useRestaurantAuth must be used within a RestaurantAuthProvider');
  }
  return context;
};

