import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { getRestaurantSettings, updateRestaurantSettings, subscribeToSettings } from '../services/settingsService';
import type { RestaurantSettings } from '../services/settingsService';
import { useTestMode } from './TestModeContext';

interface SettingsContextType {
  settings: RestaurantSettings | null;
  updateSettings: (newSettings: Partial<Omit<RestaurantSettings, 'id' | 'updatedAt'>>) => Promise<void>;
  isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { isTestMode, testRestaurant } = useTestMode();

  useEffect(() => {
    // Carregar configurações iniciais
    const loadSettings = async () => {
      try {
        if (isTestMode && testRestaurant) {
          // Em modo de teste, usar dados do restaurante de teste
          const testSettings: RestaurantSettings = {
            id: `test_${testRestaurant.id}`,
            restaurantName: testRestaurant.name,
            primaryColor: testRestaurant.theme?.primaryColor || '#4f46e5',
            secondaryColor: testRestaurant.theme?.secondaryColor || '#6b7280',
            bannerUrl: '',
            audioUrl: '',
            updatedAt: new Date()
          };
          setSettings(testSettings);
        } else {
          const initialSettings = await getRestaurantSettings();
          setSettings(initialSettings);
        }
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();

    // Escutar mudanças em tempo real apenas se não estiver em modo de teste
    if (!isTestMode) {
      const unsubscribe = subscribeToSettings((newSettings) => {
        setSettings(newSettings);
        setIsLoading(false);
      });

      return unsubscribe;
    }
  }, [isTestMode, testRestaurant]);

  const updateSettings = async (newSettings: Partial<Omit<RestaurantSettings, 'id' | 'updatedAt'>>) => {
    try {
      await updateRestaurantSettings(newSettings);
      // O listener em tempo real atualizará o estado automaticamente
    } catch (error) {
      console.error('Erro ao atualizar configurações:', error);
      throw error;
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, isLoading }}>
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