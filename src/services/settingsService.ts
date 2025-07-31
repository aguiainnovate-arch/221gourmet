import { 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../../firebase';

export interface RestaurantSettings {
  id: string;
  restaurantName: string;
  primaryColor: string;
  secondaryColor: string;
  updatedAt: Date;
}

const SETTINGS_DOC_ID = 'restaurant-config';

// Configurações padrão
const DEFAULT_SETTINGS: Omit<RestaurantSettings, 'id' | 'updatedAt'> = {
  restaurantName: '221 Gourmet',
  primaryColor: '#92400e', // amber-800
  secondaryColor: '#fffbeb', // amber-50
};

// Buscar configurações do restaurante
export const getRestaurantSettings = async (): Promise<RestaurantSettings> => {
  try {
    const settingsRef = doc(db, 'settings', SETTINGS_DOC_ID);
    const docSnap = await getDoc(settingsRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        restaurantName: data.restaurantName,
        primaryColor: data.primaryColor,
        secondaryColor: data.secondaryColor,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date()
      };
    } else {
      // Se não existir, criar com configurações padrão
      return await createDefaultSettings();
    }
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    // Retorna configurações padrão em caso de erro
    return {
      id: SETTINGS_DOC_ID,
      ...DEFAULT_SETTINGS,
      updatedAt: new Date()
    };
  }
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
    console.error('Erro ao escutar configurações:', error);
    // Em caso de erro, usar configurações padrão
    callback({
      id: SETTINGS_DOC_ID,
      ...DEFAULT_SETTINGS,
      updatedAt: new Date()
    });
  });
};