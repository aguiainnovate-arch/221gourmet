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
import { getRestaurantById } from './restaurantService';

export interface RestaurantSettings {
  id: string;
  restaurantName: string;
  primaryColor: string;
  secondaryColor: string;
  bannerUrl?: string;
  audioUrl?: string;
  updatedAt: Date;
}

/** Documento legado (configuração global única — fallback). */
const LEGACY_SETTINGS_DOC_ID = 'restaurant-config';

const DEFAULT_SETTINGS: Omit<RestaurantSettings, 'id' | 'updatedAt'> = {
  restaurantName: 'Noctis',
  primaryColor: '#4B0082',
  secondaryColor: '#F7F4FC',
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
    restaurantName: data.restaurantName ?? DEFAULT_SETTINGS.restaurantName,
    primaryColor: data.primaryColor ?? DEFAULT_SETTINGS.primaryColor,
    secondaryColor: data.secondaryColor ?? DEFAULT_SETTINGS.secondaryColor,
    bannerUrl: data.bannerUrl || '',
    audioUrl: data.audioUrl || '',
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
  };
}

function defaultForRestaurant(restaurantId: string): RestaurantSettings {
  return {
    id: restaurantId,
    ...DEFAULT_SETTINGS,
    updatedAt: new Date(),
  };
}

async function readSettingsDoc(docId: string, fromServer: boolean): Promise<RestaurantSettings | null> {
  const settingsRef = doc(db, 'settings', docId);
  const docSnap = fromServer ? await getDocFromServer(settingsRef) : await getDoc(settingsRef);
  return docToSettings(docSnap);
}

async function loadFromRestaurantTheme(restaurantId: string): Promise<RestaurantSettings | null> {
  try {
    const restaurant = await getRestaurantById(restaurantId);
    if (!restaurant) return null;
    return {
      id: restaurantId,
      restaurantName: restaurant.name,
      primaryColor: restaurant.theme?.primaryColor ?? DEFAULT_SETTINGS.primaryColor,
      secondaryColor: restaurant.theme?.secondaryColor ?? DEFAULT_SETTINGS.secondaryColor,
      bannerUrl: '',
      audioUrl: '',
      updatedAt: restaurant.updatedAt ?? new Date(),
    };
  } catch {
    return null;
  }
}

async function resolveSettings(restaurantId: string, fromServer: boolean): Promise<RestaurantSettings> {
  const perRestaurant = await readSettingsDoc(restaurantId, fromServer);
  if (perRestaurant) return perRestaurant;

  const legacy = await readSettingsDoc(LEGACY_SETTINGS_DOC_ID, fromServer);
  if (legacy) {
    return { ...legacy, id: restaurantId };
  }

  const fromTheme = await loadFromRestaurantTheme(restaurantId);
  if (fromTheme) return fromTheme;

  return defaultForRestaurant(restaurantId);
}

export const getRestaurantSettings = async (restaurantId: string): Promise<RestaurantSettings> => {
  try {
    return await resolveSettings(restaurantId, true);
  } catch (serverErr) {
    if (!isOfflineError(serverErr)) {
      console.error('Erro ao buscar configurações (servidor):', serverErr);
    }
  }

  try {
    return await resolveSettings(restaurantId, false);
  } catch (cacheErr) {
    if (!isOfflineError(cacheErr)) {
      console.error('Erro ao buscar configurações (cache):', cacheErr);
    }
  }

  return defaultForRestaurant(restaurantId);
};

export const updateRestaurantSettings = async (
  restaurantId: string,
  settings: Partial<Omit<RestaurantSettings, 'id' | 'updatedAt'>>
): Promise<void> => {
  try {
    const settingsRef = doc(db, 'settings', restaurantId);
    await setDoc(
      settingsRef,
      {
        ...settings,
        restaurantId,
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
    throw new Error('Falha ao atualizar configurações');
  }
};

export const subscribeToSettings = (
  restaurantId: string,
  callback: (settings: RestaurantSettings) => void
): (() => void) => {
  const settingsRef = doc(db, 'settings', restaurantId);

  return onSnapshot(
    settingsRef,
    async (snapshot) => {
      if (snapshot.exists()) {
        const parsed = docToSettings(snapshot);
        if (parsed) {
          callback(parsed);
          return;
        }
      }

      const fallback = await getRestaurantSettings(restaurantId);
      callback(fallback);
    },
    async (error) => {
      if (!isOfflineError(error)) {
        console.error('Erro ao escutar configurações:', error);
      }
      const fallback = await getRestaurantSettings(restaurantId);
      callback(fallback);
    }
  );
};
