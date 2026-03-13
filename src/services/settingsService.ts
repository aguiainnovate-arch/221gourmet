import {
  doc,
  setDoc,
  getDoc,
  getDocFromServer,
  onSnapshot,
  Timestamp,
  type DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../../firebase';

export interface RestaurantSettings {
  id: string;
  restaurantName: string;
  primaryColor: string;
  secondaryColor: string;
  bannerUrl?: string;
  audioUrl?: string;
  updatedAt: Date;
}

const SETTINGS_DOC_ID = 'restaurant-config';

// Configurações padrão
const DEFAULT_SETTINGS: Omit<RestaurantSettings, 'id' | 'updatedAt'> = {
  restaurantName: 'Noctis',
  primaryColor: '#92400e', // amber-800
  secondaryColor: '#fffbeb', // amber-50
  bannerUrl: '',
  audioUrl: '',
};

const isOfflineError = (err: unknown): boolean =>
  err instanceof Error && /offline|unavailable/i.test(err.message);

function docToSettings(docSnap: DocumentSnapshot): RestaurantSettings | null {
  if (!docSnap.exists()) return null;
  const data = docSnap.data();
  return {
    id: docSnap.id,
    restaurantName: data.restaurantName,
    primaryColor: data.primaryColor,
    secondaryColor: data.secondaryColor,
    bannerUrl: data.bannerUrl || '',
    audioUrl: data.audioUrl || '',
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
  };
}

// Buscar configurações do restaurante (tenta rede, depois cache, depois padrão)
export const getRestaurantSettings = async (): Promise<RestaurantSettings> => {
  const settingsRef = doc(db, 'settings', SETTINGS_DOC_ID);
  const defaultResult: RestaurantSettings = {
    id: SETTINGS_DOC_ID,
    ...DEFAULT_SETTINGS,
    updatedAt: new Date(),
  };

  // 1) Tentar do servidor (evita falso "client is offline" no primeiro carregamento)
  try {
    const docSnap = await getDocFromServer(settingsRef);
    const parsed = docToSettings(docSnap);
    if (parsed) return parsed;
    return await createDefaultSettings();
  } catch (serverErr) {
    if (!isOfflineError(serverErr)) {
      console.error('Erro ao buscar configurações (servidor):', serverErr);
    }
  }

  // 2) Tentar do cache (útil quando realmente offline)
  try {
    const docSnap = await getDoc(settingsRef);
    const parsed = docToSettings(docSnap);
    if (parsed) return parsed;
  } catch (cacheErr) {
    if (!isOfflineError(cacheErr)) {
      console.error('Erro ao buscar configurações (cache):', cacheErr);
    }
  }

  return defaultResult;
};

// Criar configurações padrão
const createDefaultSettings = async (): Promise<RestaurantSettings> => {
  try {
    const settingsRef = doc(db, 'settings', SETTINGS_DOC_ID);
    const newSettings = {
      ...DEFAULT_SETTINGS,
      updatedAt: Timestamp.now()
    };
    
    await setDoc(settingsRef, newSettings);
    
    return {
      id: SETTINGS_DOC_ID,
      ...DEFAULT_SETTINGS,
      updatedAt: new Date()
    };
  } catch (error) {
    console.error('Erro ao criar configurações padrão:', error);
    throw new Error('Falha ao criar configurações padrão');
  }
};

// Atualizar configurações do restaurante
export const updateRestaurantSettings = async (
  settings: Partial<Omit<RestaurantSettings, 'id' | 'updatedAt'>>
): Promise<void> => {
  try {
    const settingsRef = doc(db, 'settings', SETTINGS_DOC_ID);
    await setDoc(settingsRef, {
      ...settings,
      updatedAt: Timestamp.now()
    }, { merge: true });
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
    throw new Error('Falha ao atualizar configurações');
  }
};

// Escutar mudanças nas configurações em tempo real
export const subscribeToSettings = (
  callback: (settings: RestaurantSettings) => void
): (() => void) => {
  const settingsRef = doc(db, 'settings', SETTINGS_DOC_ID);
  
  return onSnapshot(settingsRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      callback({
        id: doc.id,
        restaurantName: data.restaurantName,
        primaryColor: data.primaryColor,
        secondaryColor: data.secondaryColor,
        bannerUrl: data.bannerUrl || '',
        audioUrl: data.audioUrl || '',
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date()
      });
    } else {
      // Se não existir, usar configurações padrão
      callback({
        id: SETTINGS_DOC_ID,
        ...DEFAULT_SETTINGS,
        updatedAt: new Date()
      });
    }
  }, (error) => {
    if (!isOfflineError(error)) {
      console.error('Erro ao escutar configurações:', error);
    }
    callback({
      id: SETTINGS_DOC_ID,
      ...DEFAULT_SETTINGS,
      updatedAt: new Date(),
    });
  });
};