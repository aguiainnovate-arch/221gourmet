import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebase';
import type { DeliveryUser } from '../types/deliveryUser';
import {
  getDeliveryUserById,
  getDeliveryUserByPhone,
  getDeliveryUserByAuthUid,
  linkDeliveryUserAuthUid,
} from '../services/deliveryUserService';
import { signOutPhoneAuth } from '../services/phoneAuthService';

interface DeliveryAuthContextType {
  user: DeliveryUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Estabelece sessão do perfil delivery (após OTP SMS bem-sucedido). */
  login: (userId: string) => Promise<void>;
  /**
   * Após Firebase Phone Auth, resolve o perfil delivery pelo telefone/uid
   * e vincula authUid se ainda não estiver ligado.
   */
  loginAfterPhoneAuth: (authUid: string, phoneE164: string) => Promise<DeliveryUser>;
  logout: () => Promise<void>;
  updateUser: (user: DeliveryUser) => void;
}

const DeliveryAuthContext = createContext<DeliveryAuthContextType | undefined>(undefined);

const STORAGE_KEY = 'delivery_user_id';

async function resolveProfileFromFirebaseAuth(
  authUid: string,
  phoneNumber: string | null
): Promise<DeliveryUser | null> {
  let profile = await getDeliveryUserByAuthUid(authUid);
  if (!profile && phoneNumber) {
    profile = await getDeliveryUserByPhone(phoneNumber);
    if (profile && profile.authUid !== authUid) {
      await linkDeliveryUserAuthUid(profile.id, authUid);
      profile = { ...profile, authUid };
    }
  }
  return profile;
}

export const DeliveryAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<DeliveryUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      try {
        if (fbUser?.uid && fbUser.phoneNumber) {
          const profile = await resolveProfileFromFirebaseAuth(fbUser.uid, fbUser.phoneNumber);
          if (cancelled) return;
          if (profile) {
            setUser(profile);
            localStorage.setItem(STORAGE_KEY, profile.id);
            return;
          }
        }

        // Sem sessão Phone Auth: mantém sessão legada em localStorage até o próximo login SMS
        const savedUserId = localStorage.getItem(STORAGE_KEY);
        if (savedUserId) {
          const userData = await getDeliveryUserById(savedUserId);
          if (cancelled) return;
          if (userData) {
            setUser(userData);
          } else {
            localStorage.removeItem(STORAGE_KEY);
            setUser(null);
          }
        } else if (!cancelled) {
          setUser(null);
        }
      } catch (error) {
        console.error('Erro ao carregar sessão delivery:', error);
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const login = async (userId: string) => {
    const userData = await getDeliveryUserById(userId);
    if (!userData) {
      throw new Error('Usuário não encontrado');
    }
    setUser(userData);
    localStorage.setItem(STORAGE_KEY, userId);
  };

  const loginAfterPhoneAuth = async (authUid: string, phoneE164: string): Promise<DeliveryUser> => {
    const profile = await resolveProfileFromFirebaseAuth(authUid, phoneE164);
    if (!profile) {
      throw new Error(
        'Conta verificada, mas perfil de delivery não encontrado. Crie uma conta primeiro.'
      );
    }
    setUser(profile);
    localStorage.setItem(STORAGE_KEY, profile.id);
    return profile;
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    try {
      await signOutPhoneAuth();
    } catch (error) {
      console.error('Erro ao encerrar sessão Firebase Auth:', error);
    }
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
        loginAfterPhoneAuth,
        logout,
        updateUser,
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
