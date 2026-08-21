import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { getRestaurantSettings, updateRestaurantSettings, subscribeToSettings } from '../services/settingsService';
import type { RestaurantSettings } from '../services/settingsService';
import { useTestMode } from './TestModeContext';
import { useRestaurantId } from '../hooks/useRestaurantId';
import { isCapacitorRuntime } from '../utils/firestoreRest';

interface SettingsContextType {
  settings: RestaurantSettings | null;
  updateSettings: (newSettings: Partial<Omit<RestaurantSettings, 'id' | 'updatedAt'>>) => Promise<void>;
  isLoading: boolean;
  restaurantId: string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const DEFAULT_CAPACITOR_SETTINGS: RestaurantSettings = {
  id: 'capacitor-default',
  restaurantName: 'Bora Comer',
  primaryColor: '#E91120',
  secondaryColor: '#FFF8F2',
  bannerUrl: '',
  audioUrl: '',
  updatedAt: new Date(),
};

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { isTestMode, testRestaurant } = useTestMode();
  const restaurantId = useRestaurantId();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const loadSettings = async () => {
      setIsLoading(true);
      try {
        // No iOS o SDK Firestore trava no boot; delivery não precisa desse listener global.
        if (isCapacitorRuntime()) {
          setSettings({ ...DEFAULT_CAPACITOR_SETTINGS, id: restaurantId || 'capacitor-default' });
          return;
        }

        if (isTestMode && testRestaurant) {
          const testSettings: RestaurantSettings = {
            id: testRestaurant.id,
            restaurantName: testRestaurant.name,
            primaryColor: testRestaurant.theme?.primaryColor || '#4B0082',
            secondaryColor: testRestaurant.theme?.secondaryColor || '#F7F4FC',
            bannerUrl: '',
            audioUrl: '',
            updatedAt: new Date(),
          };
          setSettings(testSettings);
        } else {
          const initialSettings = await getRestaurantSettings(restaurantId);
          setSettings(initialSettings);
        }
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        setSettings({ ...DEFAULT_CAPACITOR_SETTINGS, id: restaurantId || 'fallback' });
      } finally {
        setIsLoading(false);
      }
    };

    void loadSettings();

    if (!isTestMode && !isCapacitorRuntime()) {
      unsubscribe = subscribeToSettings(restaurantId, (newSettings) => {
        setSettings(newSettings);
        setIsLoading(false);
      });
    }

    return () => unsubscribe?.();
  }, [isTestMode, testRestaurant, restaurantId]);

  const updateSettings = async (newSettings: Partial<Omit<RestaurantSettings, 'id' | 'updatedAt'>>) => {
    try {
      if (isCapacitorRuntime()) {
        setSettings((prev) =>
          prev
            ? { ...prev, ...newSettings, updatedAt: new Date() }
            : { ...DEFAULT_CAPACITOR_SETTINGS, ...newSettings, updatedAt: new Date() }
        );
        return;
      }
      await updateRestaurantSettings(restaurantId, newSettings);
      setSettings((prev) =>
        prev
          ? {
              ...prev,
              ...newSettings,
              updatedAt: new Date(),
            }
          : prev
      );
    } catch (error) {
      console.error('Erro ao atualizar configurações:', error);
      throw error;
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, isLoading, restaurantId }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
