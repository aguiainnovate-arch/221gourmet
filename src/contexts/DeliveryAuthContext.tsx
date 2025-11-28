import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { DeliveryUser } from '../types/deliveryUser';
import { getDeliveryUserById } from '../services/deliveryUserService';

interface DeliveryAuthContextType {
  user: DeliveryUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (userId: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: DeliveryUser) => void;
}

const DeliveryAuthContext = createContext<DeliveryAuthContextType | undefined>(undefined);

export const DeliveryAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<DeliveryUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Carregar usuário salvo do localStorage
    const loadSavedUser = async () => {
      try {
        const savedUserId = localStorage.getItem('delivery_user_id');
        if (savedUserId) {
          const userData = await getDeliveryUserById(savedUserId);
          if (userData) {
            setUser(userData);
          } else {
            // Usuário não encontrado, limpar localStorage
            localStorage.removeItem('delivery_user_id');
          }
        }
      } catch (error) {
        console.error('Erro ao carregar usuário:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSavedUser();
  }, []);

  const login = async (userId: string) => {
    try {
      const userData = await getDeliveryUserById(userId);
      if (userData) {
        setUser(userData);
        localStorage.setItem('delivery_user_id', userId);
      } else {
        throw new Error('Usuário não encontrado');
      }
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('delivery_user_id');
  };

  const updateUser = (updatedUser: DeliveryUser) => {
    setUser(updatedUser);
  };

  return (
    <DeliveryAuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        updateUser
      }}
    >
      {children}
    </DeliveryAuthContext.Provider>
  );
};

export const useDeliveryAuth = () => {
  const context = useContext(DeliveryAuthContext);
  if (context === undefined) {
    throw new Error('useDeliveryAuth must be used within a DeliveryAuthProvider');
  }
  return context;
};

