import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import bcrypt from 'bcryptjs';
import { getRestaurants, updateRestaurant } from '../services/restaurantService';
import { getAppUserByEmail } from '../services/userService';
const DEFAULT_PASSWORD = '123456';

export type AuthType = 'restaurant' | 'motoboy' | null;

interface RestaurantAuthContextType {
  isAuthenticated: boolean;
  authType: AuthType;
  currentRestaurantId: string | null;
  motoboyUserId: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const RestaurantAuthContext = createContext<RestaurantAuthContextType | undefined>(undefined);

const SESSION_KEY = 'restaurant_auth_session';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export const RestaurantAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authType, setAuthType] = useState<AuthType>(null);
  const [currentRestaurantId, setCurrentRestaurantId] = useState<string | null>(null);
  const [motoboyUserId, setMotoboyUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedSession = localStorage.getItem(SESSION_KEY);
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        const now = new Date().getTime();
        if (session.expiresAt && session.expiresAt > now) {
          setIsAuthenticated(true);
          setAuthType(session.type ?? 'restaurant');
          setCurrentRestaurantId(session.restaurantId ?? null);
          setMotoboyUserId(session.motoboyUserId ?? null);
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
      } catch (error) {
        console.error('Erro ao carregar sessão:', error);
        localStorage.removeItem(SESSION_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // 1) Tentar login como motoboy (coleção users com role MOTOBOY)
      const appUser = await getAppUserByEmail(email);
      if (appUser && appUser.role === 'MOTOBOY') {
        const passwordMatch = await bcrypt.compare(password, appUser.passwordHash);
        if (passwordMatch) {
          setIsAuthenticated(true);
          setAuthType('motoboy');
          setCurrentRestaurantId(null);
          setMotoboyUserId(appUser.id);
          const expiresAt = new Date().getTime() + SESSION_TTL_MS;
          localStorage.setItem(SESSION_KEY, JSON.stringify({
            type: 'motoboy',
            motoboyUserId: appUser.id,
            expiresAt
          }));
          return true;
        }
        return false;
      }

      // 2) Login como restaurante (email do restaurante)
      const restaurants = await getRestaurants();
      const restaurant = restaurants.find(r => r.email.toLowerCase() === email.toLowerCase());
      if (!restaurant) return false;

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
        setAuthType('restaurant');
        setCurrentRestaurantId(restaurant.id);
        setMotoboyUserId(null);
        const expiresAt = new Date().getTime() + SESSION_TTL_MS;
        localStorage.setItem(SESSION_KEY, JSON.stringify({
          type: 'restaurant',
          restaurantId: restaurant.id,
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
    setAuthType(null);
    setCurrentRestaurantId(null);
    setMotoboyUserId(null);
    localStorage.removeItem(SESSION_KEY);
  };

  return (
    <RestaurantAuthContext.Provider
      value={{
        isAuthenticated,
        authType,
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

