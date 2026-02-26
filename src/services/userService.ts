import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../firebase';
import type { AppUser, CreateMotoboyData } from '../types/user';

const USERS_COLLECTION = 'users';

function docToUser(docId: string, data: Record<string, unknown>): AppUser {
  return {
    id: docId,
    email: (data.email as string) ?? '',
    passwordHash: (data.passwordHash as string) ?? '',
    role: (data.role as AppUser['role']) ?? 'MOTOBOY',
    displayName: data.displayName as string | undefined,
    phone: data.phone as string | undefined,
    restaurantId: data.restaurantId as string | undefined,
    createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.() ?? new Date(),
    updatedAt: (data.updatedAt as { toDate?: () => Date })?.toDate?.() ?? new Date()
  };
}

/**
 * Busca usuário por email (para login).
 * Retorna o primeiro com role MOTOBOY (motoboys estão na coleção users).
 */
export async function getAppUserByEmail(email: string): Promise<AppUser | null> {
  const q = query(
    collection(db, USERS_COLLECTION),
    where('email', '==', email.trim().toLowerCase())
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const d = snapshot.docs[0];
  return docToUser(d.id, d.data());
}

/**
 * Verifica se o email já está cadastrado (restaurante ou usuário app).
 */
export async function isEmailUsedByMotoboy(email: string): Promise<boolean> {
  const user = await getAppUserByEmail(email);
  return user != null && user.role === 'MOTOBOY';
}

/**
 * Cria um usuário motoboy (senha é hasheada com bcrypt).
 * Retorna o usuário criado (sem o hash no retorno opcional).
 */
export async function createMotoboy(
  data: CreateMotoboyData,
  passwordHash: string
): Promise<AppUser> {
  const now = Timestamp.now();
  const docRef = await addDoc(collection(db, USERS_COLLECTION), {
    email: data.email.trim().toLowerCase(),
    passwordHash,
    role: 'MOTOBOY',
    displayName: data.displayName ?? null,
    phone: data.phone ?? null,
    restaurantId: null,
    createdAt: now,
    updatedAt: now
  });
  return {
    id: docRef.id,
    email: data.email.trim().toLowerCase(),
    passwordHash,
    role: 'MOTOBOY',
    displayName: data.displayName,
    phone: data.phone,
    createdAt: now.toDate(),
    updatedAt: now.toDate()
  };
}

export async function getMotoboyById(userId: string): Promise<AppUser | null> {
  const ref = doc(db, USERS_COLLECTION, userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return docToUser(snap.id, snap.data());
}

/**
 * Lista todos os usuários com role MOTOBOY (para seleção no painel do restaurante).
 */
export async function listMotoboys(): Promise<AppUser[]> {
  const q = query(
    collection(db, USERS_COLLECTION),
    where('role', '==', 'MOTOBOY')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => docToUser(d.id, d.data()));
}
