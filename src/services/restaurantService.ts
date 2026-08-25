import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  updateDoc, 
  doc, 
  query, 
  orderBy,
  where,
  Timestamp,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { getPlanPermissions, updateRestaurantPermissions } from './permissionService';
import type { Restaurant, CreateRestaurantData, UpdateRestaurantData, RestaurantDeliverySettings } from '../types/restaurant';
import { normalizeDeliverySettings, normalizeOpeningHours } from '../types/restaurant';
import { normalizeMenuShifts } from '../types/menuShift';
import {
  createTrialPartnershipSubscription,
  normalizePartnershipSubscription,
  partnershipSubscriptionToFirestore,
} from '../types/partnership';
import { isCapacitorRuntime, listFirestoreCollection, getFirestoreDocument, deleteFirestoreDocument } from '../utils/firestoreRest';

// Re-exportar os tipos para facilitar imports
export type { Restaurant, CreateRestaurantData, UpdateRestaurantData } from '../types/restaurant';

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => stripUndefined(v)) as unknown as T;
  }
  if (value && typeof value === 'object' && value.constructor === Object) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue;
      out[k] = stripUndefined(v);
    }
    return out as T;
  }
  return value;
}

function toJsDate(value: unknown): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

function mapRestaurantDoc(id: string, data: Record<string, unknown>): Restaurant {
  return {
    id,
    name: String(data.name ?? ''),
    domain: String(data.domain ?? ''),
    email: String(data.email ?? ''),
    phone: String(data.phone ?? ''),
    address: String(data.address ?? ''),
    password: typeof data.password === 'string' ? data.password : '',
    planId: typeof data.planId === 'string' ? data.planId : undefined,
    active: data.active === true,
    createdAt: toJsDate(data.createdAt),
    updatedAt: toJsDate(data.updatedAt),
    theme: data.theme as Restaurant['theme'],
    settings: data.settings as Restaurant['settings'],
    permissions: data.permissions as Restaurant['permissions'],
    deliverySettings: normalizeDeliverySettings(data.deliverySettings),
    openingHours: data.openingHours ? normalizeOpeningHours(data.openingHours) : undefined,
    menuShifts: normalizeMenuShifts(data.menuShifts),
    partnershipSubscription: normalizePartnershipSubscription(data.partnershipSubscription),
    stripeConnectAccountId:
      typeof data.stripeConnectAccountId === 'string' ? data.stripeConnectAccountId : undefined,
    stripeConnectChargesEnabled:
      typeof data.stripeConnectChargesEnabled === 'boolean'
        ? data.stripeConnectChargesEnabled
        : undefined,
    stripeConnectDetailsSubmitted:
      typeof data.stripeConnectDetailsSubmitted === 'boolean'
        ? data.stripeConnectDetailsSubmitted
        : undefined,
    stripeConnectPayoutsEnabled:
      typeof data.stripeConnectPayoutsEnabled === 'boolean'
        ? data.stripeConnectPayoutsEnabled
        : undefined,
    stripeConnectDisabledReason:
      typeof data.stripeConnectDisabledReason === 'string'
        ? data.stripeConnectDisabledReason
        : null,
    stripeConnectRequirementsSummary:
      typeof data.stripeConnectRequirementsSummary === 'string'
        ? data.stripeConnectRequirementsSummary
        : null,
  };
}

// Adicionar novo restaurante
export const addRestaurant = async (restaurantData: CreateRestaurantData): Promise<Restaurant> => {
  try {
    const now = new Date();
    const partnershipSubscription =
      restaurantData.partnershipSubscription ?? createTrialPartnershipSubscription(now);

    const docRef = await addDoc(collection(db, 'restaurants'), {
      ...restaurantData,
      partnershipSubscription: partnershipSubscriptionToFirestore(partnershipSubscription),
      active: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      settings: {
        maxTables: 999, // Será definido baseado no plano posteriormente
        allowOnlineOrders: true,
        enableAnalytics: true
      },
      permissions: {
        automaticTranslation: false,
        imageMenuTransfer: false
      },
      deliverySettings: restaurantData.deliverySettings ?? {
        enabled: true,
        aiDescription: ''
      }
    });

    const restaurantId = docRef.id;

    // Aplicar permissões do plano ao restaurante
    if (restaurantData.planId) {
      try {
        const planPermissions = await getPlanPermissions(restaurantData.planId);
        
        // Importar permissões padrão para garantir que todas as permissões sejam definidas
        const { DEFAULT_PERMISSIONS } = await import('../types/permission');
        
        // Criar objeto de permissões completo, sobrescrevendo com as do plano
        const completePermissions = {
          ...DEFAULT_PERMISSIONS,
          ...planPermissions
        };
        
        await updateRestaurantPermissions(restaurantId, completePermissions);
      } catch (error) {
        console.warn('Erro ao aplicar permissões do plano ao restaurante:', error);
        // Não falhar a criação do restaurante se houver erro nas permissões
      }
    }

    return {
      id: restaurantId,
      ...restaurantData,
      partnershipSubscription,
      active: true,
      createdAt: now,
      updatedAt: now,
      settings: {
        maxTables: 999, // Será definido baseado no plano posteriormente
        allowOnlineOrders: true,
        enableAnalytics: true
      },
      permissions: {
        automaticTranslation: false,
        imageMenuTransfer: false
      },
      deliverySettings: restaurantData.deliverySettings ?? {
        enabled: true,
        aiDescription: ''
      }
    };
  } catch (error) {
    console.error('Erro ao adicionar restaurante:', error);
    throw new Error('Falha ao adicionar restaurante');
  }
};

async function getRestaurantsFromSdk(): Promise<Restaurant[]> {
  const querySnapshot = await getDocs(collection(db, 'restaurants'));
  const restaurants: Restaurant[] = [];
  querySnapshot.forEach((docSnap) => {
    restaurants.push(mapRestaurantDoc(docSnap.id, docSnap.data() as Record<string, unknown>));
  });
  restaurants.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  return restaurants;
}

async function getRestaurantsFromRest(): Promise<Restaurant[]> {
  const docs = await listFirestoreCollection('restaurants');
  const restaurants = docs.map((doc) => mapRestaurantDoc(doc.id, doc.data));
  restaurants.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  return restaurants;
}

// Buscar todos os restaurantes
export const getRestaurants = async (): Promise<Restaurant[]> => {
  try {
    // No Capacitor NÃO fazer fallback para SDK — WebChannel trava e parece “sem internet”.
    if (isCapacitorRuntime()) {
      return await getRestaurantsFromRest();
    }
    return await getRestaurantsFromSdk();
  } catch (error) {
    console.error('Erro ao buscar restaurantes:', error);
    if (!isCapacitorRuntime()) {
      try {
        return await getRestaurantsFromRest();
      } catch (fallbackError) {
        console.error('Erro ao buscar restaurantes (fallback REST):', fallbackError);
      }
    }
    throw new Error('Falha ao buscar restaurantes');
  }
};

// Buscar restaurante por ID
export const getRestaurantById = async (id: string): Promise<Restaurant | null> => {
  try {
    if (isCapacitorRuntime()) {
      const docSnap = await getFirestoreDocument('restaurants', id);
      if (!docSnap) return null;
      return mapRestaurantDoc(docSnap.id, docSnap.data);
    }
    const docSnap = await getDoc(doc(db, 'restaurants', id));
    if (!docSnap.exists()) return null;
    return mapRestaurantDoc(docSnap.id, docSnap.data() as Record<string, unknown>);
  } catch (error) {
    console.error('Erro ao buscar restaurante por ID:', error);
    return null;
  }
};

// Buscar restaurante por domínio
export const getRestaurantByDomain = async (domain: string): Promise<Restaurant | null> => {
  try {
    const q = query(
      collection(db, 'restaurants'), 
      where('domain', '==', domain),
      where('active', '==', true)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }

    const docSnap = querySnapshot.docs[0];
    return mapRestaurantDoc(docSnap.id, docSnap.data() as Record<string, unknown>);
  } catch (error) {
    console.error('Erro ao buscar restaurante por domínio:', error);
    return null;
  }
};

// Atualizar restaurante
export const updateRestaurant = async (id: string, updates: UpdateRestaurantData | CreateRestaurantData): Promise<void> => {
  try {
    const restaurantRef = doc(db, 'restaurants', id);
    const payload: Record<string, unknown> = { ...updates };
    if (updates.partnershipSubscription) {
      payload.partnershipSubscription = partnershipSubscriptionToFirestore(
        updates.partnershipSubscription
      );
    }
    await updateDoc(restaurantRef, stripUndefined({
      ...payload,
      updatedAt: Timestamp.now()
    }));

    // Se o planId foi alterado, aplicar as permissões do novo plano
    if (updates.planId) {
      try {
        const planPermissions = await getPlanPermissions(updates.planId);
        
        // Importar permissões padrão para garantir que todas as permissões sejam definidas
        const { DEFAULT_PERMISSIONS } = await import('../types/permission');
        
        // Criar objeto de permissões completo, sobrescrevendo com as do plano
        const completePermissions = {
          ...DEFAULT_PERMISSIONS,
          ...planPermissions
        };
        
        await updateRestaurantPermissions(id, completePermissions);
      } catch (error) {
        console.warn('Erro ao aplicar permissões do plano ao restaurante:', error);
        // Não falhar a atualização do restaurante se houver erro nas permissões
      }
    }
  } catch (error) {
    console.error('Erro ao atualizar restaurante:', error);
    throw new Error('Falha ao atualizar restaurante');
  }
};

// Remover restaurante (soft delete — painel admin)
export const deleteRestaurant = async (id: string): Promise<void> => {
  try {
    const restaurantRef = doc(db, 'restaurants', id);
    await updateDoc(restaurantRef, {
      active: false,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Erro ao desativar restaurante:', error);
    throw new Error('Falha ao desativar restaurante');
  }
};

/** Exclusão definitiva da conta do restaurante (Guideline 5.1.1). Não usar o soft delete. */
export const deleteRestaurantAccount = async (id: string): Promise<void> => {
  if (isCapacitorRuntime()) {
    await deleteFirestoreDocument('restaurants', id);
    return;
  }
  await deleteDoc(doc(db, 'restaurants', id));
};

// Verificar se domínio já existe
export const checkDomainExists = async (domain: string, excludeId?: string): Promise<boolean> => {
  try {
    const q = query(
      collection(db, 'restaurants'), 
      where('domain', '==', domain)
    );
    const querySnapshot = await getDocs(q);
    
    if (excludeId) {
      // Se estamos editando, excluir o próprio restaurante da verificação
      return querySnapshot.docs.some(doc => doc.id !== excludeId);
    }
    
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Erro ao verificar domínio:', error);
    return false;
  }
};

/** Verifica se já existe restaurante com o mesmo e-mail (normalizado ou valor exato). */
export const checkRestaurantEmailTaken = async (email: string): Promise<boolean> => {
  const trimmed = email.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  try {
    const qLower = query(collection(db, 'restaurants'), where('email', '==', lower));
    const snapLower = await getDocs(qLower);
    if (!snapLower.empty) return true;
    if (lower !== trimmed) {
      const qExact = query(collection(db, 'restaurants'), where('email', '==', trimmed));
      const snapExact = await getDocs(qExact);
      if (!snapExact.empty) return true;
    }
    return false;
  } catch (error) {
    console.error('Erro ao verificar e-mail do restaurante:', error);
    throw new Error('Falha ao verificar disponibilidade do e-mail');
  }
};

// Buscar restaurantes por plano
export const getRestaurantsByPlan = async (planId: string): Promise<Restaurant[]> => {
  try {
    const q = query(
      collection(db, 'restaurants'), 
      where('planId', '==', planId),
      where('active', '==', true),
      orderBy('name')
    );
    const querySnapshot = await getDocs(q);
    
    const restaurants: Restaurant[] = [];
    querySnapshot.forEach((docSnap) => {
      restaurants.push(mapRestaurantDoc(docSnap.id, docSnap.data() as Record<string, unknown>));
    });

    return restaurants;
  } catch (error) {
    console.error('Erro ao buscar restaurantes por plano:', error);
    throw new Error('Falha ao buscar restaurantes por plano');
  }
};

// Atualizar plano de um restaurante
export const updateRestaurantPlan = async (restaurantId: string, planId: string): Promise<void> => {
  try {
    const restaurantRef = doc(db, 'restaurants', restaurantId);
    await updateDoc(restaurantRef, {
      planId,
      updatedAt: Timestamp.now()
    });

    // Aplicar permissões do novo plano ao restaurante
    try {
      const planPermissions = await getPlanPermissions(planId);
      
      // Importar permissões padrão para garantir que todas as permissões sejam definidas
      const { DEFAULT_PERMISSIONS } = await import('../types/permission');
      
      // Criar objeto de permissões completo, sobrescrevendo com as do plano
      const completePermissions = {
        ...DEFAULT_PERMISSIONS,
        ...planPermissions
      };
      
      await updateRestaurantPermissions(restaurantId, completePermissions);
    } catch (error) {
      console.warn('Erro ao aplicar permissões do plano ao restaurante:', error);
      // Não falhar a atualização do plano se houver erro nas permissões
    }
  } catch (error) {
    console.error('Erro ao atualizar plano do restaurante:', error);
    throw new Error('Falha ao atualizar plano do restaurante');
  }
};

// Atualizar configurações de delivery de um restaurante
export const updateRestaurantDeliverySettings = async (
  restaurantId: string,
  deliverySettings: RestaurantDeliverySettings
): Promise<void> => {
  try {
    const restaurantRef = doc(db, 'restaurants', restaurantId);
    await updateDoc(restaurantRef, {
      deliverySettings,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Erro ao atualizar configurações de delivery:', error);
    throw new Error('Falha ao atualizar configurações de delivery');
  }
};

// Interface para restaurante com produtos
export interface RestaurantWithMenu {
  id: string;
  name: string;
  address: string;
  phone: string;
  products: Array<{
    name: string;
    description: string;
    price: number;
    category: string;
    preparationTime?: number;
  }>;
}

// Buscar todos os restaurantes ativos com seus cardápios para AI
export const getAllRestaurantsWithMenus = async (): Promise<RestaurantWithMenu[]> => {
  try {
    const restaurants = (await getRestaurants()).filter((r) => r.active);
    let productDocs: Array<{ data: Record<string, unknown> }> = [];
    try {
      productDocs = await listFirestoreCollection('products');
    } catch (productError) {
      console.warn('Cardápios indisponíveis para o chat; usando só restaurantes.', productError);
    }

    const productsByRestaurant = new Map<string, RestaurantWithMenu['products']>();
    for (const product of productDocs) {
      if (product.data.available === false) continue;
      const restaurantId = String(product.data.restaurantId ?? '');
      if (!restaurantId) continue;
      const list = productsByRestaurant.get(restaurantId) ?? [];
      list.push({
        name: String(product.data.name ?? ''),
        description: String(product.data.description ?? ''),
        price: Number(product.data.price ?? 0),
        category: String(product.data.category ?? ''),
        preparationTime:
          typeof product.data.preparationTime === 'number'
            ? product.data.preparationTime
            : undefined,
      });
      productsByRestaurant.set(restaurantId, list);
    }

    return restaurants.map((restaurant) => ({
      id: restaurant.id,
      name: restaurant.name,
      address: restaurant.address,
      phone: restaurant.phone,
      products: productsByRestaurant.get(restaurant.id) ?? [],
    }));
  } catch (error) {
    console.error('Erro ao buscar restaurantes com cardápios:', error);
    throw new Error('Falha ao buscar restaurantes com cardápios');
  }
};