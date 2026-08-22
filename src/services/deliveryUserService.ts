import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';
import type { DeliveryUser, CreateDeliveryUserData } from '../types/deliveryUser';
import { normalizePhone } from '../utils/authInputUtils';
import bcrypt from 'bcryptjs';
import {
  getFirestoreDocument,
  isCapacitorRuntime,
  queryFirestoreByField,
  createFirestoreDocument,
  updateFirestoreDocument,
  deleteFirestoreDocument,
} from '../utils/firestoreRest';

function toDate(value: unknown): Date {
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

function mapDeliveryUserDoc(id: string, data: Record<string, unknown>): DeliveryUser {
  return {
    id,
    email: String(data.email ?? ''),
    phone: String(data.phone ?? ''),
    name: String(data.name ?? ''),
    address: String(data.address ?? ''),
    defaultPaymentMethod: data.defaultPaymentMethod as DeliveryUser['defaultPaymentMethod'],
    stripeCustomerId:
      typeof data.stripeCustomerId === 'string' ? data.stripeCustomerId : undefined,
    authUid: typeof data.authUid === 'string' ? data.authUid : undefined,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

async function findDeliveryUserRecord(
  field: 'email' | 'phone' | 'authUid',
  value: string
): Promise<{ user: DeliveryUser; passwordHash: string } | null> {
  let id = '';
  let data: Record<string, unknown> = {};

  if (isCapacitorRuntime()) {
    const docs = await queryFirestoreByField('deliveryUsers', field, value, 1);
    if (docs.length === 0) return null;
    id = docs[0].id;
    data = docs[0].data;
  } else {
    const q = query(collection(db, 'deliveryUsers'), where(field, '==', value));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const d = snapshot.docs[0];
    id = d.id;
    data = d.data() as Record<string, unknown>;
  }

  return {
    user: mapDeliveryUserDoc(id, data),
    passwordHash: typeof data.passwordHash === 'string' ? data.passwordHash : '',
  };
}

async function findDeliveryUserByField(
  field: 'email' | 'phone' | 'authUid',
  value: string
): Promise<DeliveryUser | null> {
  const record = await findDeliveryUserRecord(field, value);
  return record?.user ?? null;
}

export const loginDeliveryUserWithEmail = async (
  email: string,
  password: string
): Promise<DeliveryUser> => {
  const record = await findDeliveryUserRecord('email', email.trim().toLowerCase());
  if (!record) {
    throw new Error('Usuário não encontrado. Crie uma conta para continuar.');
  }
  if (!record.passwordHash) {
    throw new Error('Esta conta ainda não tem senha. Use o telefone ou peça para definir a senha 123456.');
  }
  const matches = await bcrypt.compare(password, record.passwordHash);
  if (!matches) {
    throw new Error('Senha incorreta.');
  }
  return record.user;
};

export const saveDeliveryUser = async (
  userData: CreateDeliveryUserData
): Promise<DeliveryUser> => {
  try {
    const normalizedPhone = normalizePhone(userData.phone);
    const [existingUserByEmail, existingUserByPhone] = await Promise.all([
      getDeliveryUserByEmail(userData.email),
      getDeliveryUserByPhone(normalizedPhone),
    ]);
    const existingUser = existingUserByEmail || existingUserByPhone;

    const { password, ...userFields } = userData;
    const cleanData: Record<string, unknown> = {
      ...userFields,
      phone: normalizedPhone,
    };
    if (userData.stripeCustomerId === undefined) delete cleanData.stripeCustomerId;
    if (userData.authUid === undefined) delete cleanData.authUid;
    if (password && password.trim().length >= 6) {
      cleanData.passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    if (existingUser) {
      const payload = { ...cleanData, updatedAt: new Date() };
      if (isCapacitorRuntime()) {
        await updateFirestoreDocument('deliveryUsers', existingUser.id, payload);
      } else {
        await updateDoc(doc(db, 'deliveryUsers', existingUser.id), {
          ...cleanData,
          updatedAt: Timestamp.now(),
        });
      }

      return {
        ...existingUser,
        ...userData,
        phone: normalizedPhone,
        stripeCustomerId: userData.stripeCustomerId ?? existingUser.stripeCustomerId,
        authUid: userData.authUid ?? existingUser.authUid,
        updatedAt: new Date(),
      };
    }

    if (isCapacitorRuntime()) {
      const created = await createFirestoreDocument('deliveryUsers', {
        ...cleanData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return {
        id: created.id,
        ...userData,
        phone: normalizedPhone,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    const docRef = await addDoc(collection(db, 'deliveryUsers'), {
      ...cleanData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    return {
      id: docRef.id,
      ...userData,
      phone: normalizedPhone,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } catch (error) {
    console.error('Erro ao salvar usuário de delivery:', error);
    throw new Error('Falha ao salvar informações do usuário');
  }
};

export const linkDeliveryUserAuthUid = async (
  userId: string,
  authUid: string
): Promise<void> => {
  if (isCapacitorRuntime()) {
    await updateFirestoreDocument('deliveryUsers', userId, {
      authUid,
      updatedAt: new Date(),
    });
    return;
  }
  await updateDoc(doc(db, 'deliveryUsers', userId), {
    authUid,
    updatedAt: Timestamp.now(),
  });
};

export const getDeliveryUserByAuthUid = async (
  authUid: string
): Promise<DeliveryUser | null> => {
  try {
    if (!authUid) return null;
    return await findDeliveryUserByField('authUid', authUid);
  } catch (error) {
    console.error('Erro ao buscar usuário de delivery por authUid:', error);
    return null;
  }
};

export const getDeliveryUserByEmail = async (
  email: string
): Promise<DeliveryUser | null> => {
  try {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return null;
    return await findDeliveryUserByField('email', normalized);
  } catch (error) {
    console.error('Erro ao buscar usuário de delivery:', error);
    return null;
  }
};

export const getDeliveryUserByPhone = async (
  phone: string
): Promise<DeliveryUser | null> => {
  try {
    const normalized = normalizePhone(phone);
    if (!normalized || normalized === '+') return null;
    return await findDeliveryUserByField('phone', normalized);
  } catch (error) {
    console.error('Erro ao buscar usuário de delivery:', error);
    return null;
  }
};

export const getDeliveryUserById = async (
  userId: string
): Promise<DeliveryUser | null> => {
  try {
    if (isCapacitorRuntime()) {
      const docSnap = await getFirestoreDocument('deliveryUsers', userId);
      if (!docSnap) return null;
      return mapDeliveryUserDoc(docSnap.id, docSnap.data);
    }

    const userSnap = await getDoc(doc(db, 'deliveryUsers', userId));
    if (!userSnap.exists()) return null;
    return mapDeliveryUserDoc(userSnap.id, userSnap.data() as Record<string, unknown>);
  } catch (error) {
    console.error('Erro ao buscar usuário de delivery:', error);
    return null;
  }
};

export const deleteDeliveryUserAccount = async (userId: string): Promise<void> => {
  if (isCapacitorRuntime()) {
    await deleteFirestoreDocument('deliveryUsers', userId);
    return;
  }
  await deleteDoc(doc(db, 'deliveryUsers', userId));
};

export const updateDeliveryUserProfile = async (
  userId: string,
  data: Partial<Pick<DeliveryUser, 'name' | 'email' | 'phone' | 'address'>>
): Promise<DeliveryUser> => {
  const payload: Record<string, unknown> = {
    ...(data.name !== undefined ? { name: data.name.trim() } : {}),
    ...(data.email !== undefined ? { email: data.email.trim().toLowerCase() } : {}),
    ...(data.phone !== undefined ? { phone: normalizePhone(data.phone) } : {}),
    ...(data.address !== undefined ? { address: data.address.trim() } : {}),
    updatedAt: new Date(),
  };
  if (isCapacitorRuntime()) {
    await updateFirestoreDocument('deliveryUsers', userId, payload);
  } else {
    await updateDoc(doc(db, 'deliveryUsers', userId), {
      ...payload,
      updatedAt: Timestamp.now(),
    });
  }
  const updated = await getDeliveryUserById(userId);
  if (!updated) throw new Error('Usuário não encontrado após atualização.');
  return updated;
};

export const updateDeliveryUserStripeCustomer = async (
  userId: string,
  stripeCustomerId: string
): Promise<void> => {
  try {
    if (isCapacitorRuntime()) {
      await updateFirestoreDocument('deliveryUsers', userId, {
        stripeCustomerId,
        updatedAt: new Date(),
      });
      return;
    }
    await updateDoc(doc(db, 'deliveryUsers', userId), {
      stripeCustomerId,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Erro ao atualizar stripeCustomerId:', error);
    throw new Error('Falha ao salvar cliente Stripe.');
  }
};

export const getAllDeliveryUsers = async (): Promise<DeliveryUser[]> => {
  try {
    const q = query(collection(db, 'deliveryUsers'), orderBy('name', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) =>
      mapDeliveryUserDoc(d.id, d.data() as Record<string, unknown>)
    );
  } catch (error) {
    console.error('Erro ao listar usuários de delivery:', error);
    return [];
  }
};

const DEFAULT_DELIVERY_PASSWORD = '123456';

/** Define senha 123456 só para clientes que ainda não têm passwordHash. */
export const setDefaultPasswordForUsersWithoutOne = async (): Promise<number> => {
  const snapshot = await getDocs(collection(db, 'deliveryUsers'));
  const hash = await bcrypt.hash(DEFAULT_DELIVERY_PASSWORD, 10);
  let updated = 0;
  for (const userDoc of snapshot.docs) {
    const hashValue = userDoc.data().passwordHash;
    if (typeof hashValue === 'string' && hashValue.length > 0) continue;
    await updateDoc(userDoc.ref, {
      passwordHash: hash,
      updatedAt: Timestamp.now(),
    });
    updated += 1;
  }
  return updated;
};
