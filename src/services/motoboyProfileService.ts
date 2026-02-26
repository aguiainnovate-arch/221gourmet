import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../firebase';
import type { MotoboyProfile, MotoboyProfileUpdate } from '../types/motoboyProfile';

const COLLECTION = 'motoboyProfiles';

function docToProfile(userId: string, data: Record<string, unknown> | null): MotoboyProfile | null {
  if (!data) return null;
  return {
    userId,
    name: (data.name as string) ?? '',
    phone: data.phone as string | undefined,
    photoUrl: data.photoUrl as string | undefined,
    isOnline: (data.isOnline as boolean) ?? false,
    city: data.city as string | undefined,
    updatedAt: (data.updatedAt as { toDate?: () => Date })?.toDate?.() ?? new Date()
  };
}

/**
 * Retorna o perfil do motoboy. Se não existir documento, retorna null (UI pode usar user.displayName).
 */
export async function getMotoboyProfile(userId: string): Promise<MotoboyProfile | null> {
  const ref = doc(db, COLLECTION, userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return docToProfile(snap.id, snap.data());
}

/**
 * Cria ou atualiza o perfil do motoboy.
 */
export async function setMotoboyProfile(
  userId: string,
  data: MotoboyProfileUpdate
): Promise<MotoboyProfile> {
  const ref = doc(db, COLLECTION, userId);
  const now = Timestamp.now();
  const snap = await getDoc(ref);
  const existing = snap.exists() ? snap.data() : null;

  const name = data.name !== undefined ? data.name : (existing?.name as string | undefined) ?? '';
  const isOnline = data.isOnline !== undefined ? data.isOnline : (existing?.isOnline as boolean | undefined) ?? false;
  const phone = data.phone !== undefined ? data.phone : (existing?.phone as string | undefined);
  const photoUrl = data.photoUrl !== undefined ? data.photoUrl : (existing?.photoUrl as string | undefined);
  const city = data.city !== undefined ? data.city : (existing?.city as string | undefined);

  const payload = {
    userId,
    name,
    phone: phone ?? null,
    photoUrl: photoUrl ?? null,
    isOnline,
    city: city ?? null,
    updatedAt: now
  };

  if (snap.exists()) {
    await updateDoc(ref, payload);
  } else {
    await setDoc(ref, payload);
  }

  return {
    userId,
    name,
    phone: phone ?? undefined,
    photoUrl: photoUrl ?? undefined,
    isOnline,
    city: city ?? undefined,
    updatedAt: now.toDate()
  };
}

/**
 * Atualiza apenas o status online/offline.
 */
export async function setMotoboyOnline(userId: string, isOnline: boolean): Promise<void> {
  const ref = doc(db, COLLECTION, userId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, { isOnline, updatedAt: Timestamp.now() });
  } else {
    await setDoc(ref, {
      userId,
      name: '',
      isOnline,
      updatedAt: Timestamp.now()
    });
  }
}
