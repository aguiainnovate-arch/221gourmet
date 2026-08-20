import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import bcrypt from 'bcryptjs';
import { getRestaurants, updateRestaurant } from '../services/restaurantService';
import { verifyWaiterPassword } from '../services/waiterService';

const DEFAULT_PASSWORD = '123456';

interface WaiterLoginResult {
  restaurantId: string;
  waiterId: string;
}

interface RestaurantAuthContextType {
  isAuthenticated: boolean;
  currentRestaurantId: string | null;
  /** Quando logado como motoboy, ID do usuário motoboy. */
  motoboyUserId?: string | null;
  waiterId: string | null;
  isWaiter: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  loginWaiter: (cpf: string, password: string) => Promise<WaiterLoginResult | null>;
  logout: () => void;
  isLoading: boolean;
}

const RestaurantAuthContext = createContext<RestaurantAuthContextType | undefined>(undefined);

function persistSession(restaurantId: string, waiterId: string | null, motoboyUserId: string | null) {
  const expiresAt = new Date().getTime() + 24 * 60 * 60 * 1000;
  localStorage.setItem(
    'restaurant_auth_session',
    JSON.stringify({
      restaurantId,
      waiterId,
      motoboyUserId,
      expiresAt
    })
  );
}

export const RestaurantAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentRestaurantId, setCurrentRestaurantId] = useState<string | null>(null);
  const [motoboyUserId, setMotoboyUserId] = useState<string | null>(null);
  const [waiterId, setWaiterId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedSession = localStorage.getItem('restaurant_auth_session');
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        const now = new Date().getTime();
        if (session.expiresAt && session.expiresAt > now) {
          setIsAuthenticated(true);
          setCurrentRestaurantId(session.restaurantId);
          setMotoboyUserId(session.motoboyUserId ?? null);
          setWaiterId(session.waiterId ?? null);
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
      const restaurants = await getRestaurants();
      const restaurant = restaurants.find((r) => r.email.toLowerCase() === email.toLowerCase());

      if (!restaurant) {
        return false;
      }

      let passwordHash = restaurant.password;
      if (!passwordHash) {
        passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
        try {
          await updateRestaurant(restaurant.id, { password: passwordHash });
        } catch (err) {
          console.error('Erro ao salvar senha padrão para o restaurante:', err);
        }
      }

      const passwordMatch = await bcrypt.compare(password, passwordHash);

      if (passwordMatch) {
        setIsAuthenticated(true);
        setCurrentRestaurantId(restaurant.id);
        setMotoboyUserId(null);
        setWaiterId(null);
        persistSession(restaurant.id, null, null);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      return false;
    }
  };

  const loginWaiter = async (cpf: string, password: string): Promise<WaiterLoginResult | null> => {
    try {
      const waiter = await verifyWaiterPassword(cpf, password);
      if (!waiter) return null;

      setIsAuthenticated(true);
      setCurrentRestaurantId(waiter.restaurantId);
      setMotoboyUserId(null);
      setWaiterId(waiter.id);
      persistSession(waiter.restaurantId, waiter.id, null);
      return { restaurantId: waiter.restaurantId, waiterId: waiter.id };
    } catch (error) {
      console.error('Erro ao fazer login do garçom:', error);
      return null;
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentRestaurantId(null);
    setMotoboyUserId(null);
    setWaiterId(null);
    localStorage.removeItem('restaurant_auth_session');
  };

  return (
    <RestaurantAuthContext.Provider
      value={{
        isAuthenticated,
        currentRestaurantId,
        motoboyUserId,
        waiterId,
        isWaiter: Boolean(waiterId),
        login,
        loginWaiter,
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
