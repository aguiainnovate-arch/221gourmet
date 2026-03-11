import { doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import type { MotoboyProfile } from '../types/motoboyProfile';

const COLLECTION = 'motoboyProfiles';

function docToProfile(docId: string, data: Record<string, unknown>): MotoboyProfile {
  return {
    id: docId,
    motoboyUserId: (data.motoboyUserId as string) ?? docId,
    name: (data.name as string) ?? '',
    phone: (data.phone as string) || undefined,
    city: (data.city as string) || undefined,
    photoUrl: (data.photoUrl as string) || undefined,
    isOnline: (data.isOnline as boolean) ?? false,
    createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.() ?? new Date(),
    updatedAt: (data.updatedAt as { toDate?: () => Date })?.toDate?.() ?? new Date()
  };
}

export async function getMotoboyProfile(motoboyUserId: string): Promise<MotoboyProfile | null> {
  const ref = doc(db, COLLECTION, motoboyUserId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return docToProfile(snap.id, snap.data());
}

export async function setMotoboyProfile(
  motoboyUserId: string,
  data: { name?: string; phone?: string; city?: string }
): Promise<MotoboyProfile> {
  const ref = doc(db, COLLECTION, motoboyUserId);
  const snap = await getDoc(ref);
  const now = Timestamp.now();
  const payload = {
    motoboyUserId,
    name: data.name ?? '',
    phone: data.phone ?? null,
    city: data.city ?? null,
    updatedAt: now
  };
  if (!snap.exists()) {
    await setDoc(ref, { ...payload, createdAt: now });
  } else {
    await updateDoc(ref, payload);
  }
  const updated = await getDoc(ref);
  return docToProfile(updated.id, updated.data()!);
}

export async function setMotoboyOnline(motoboyUserId: string, isOnline: boolean): Promise<void> {
  const ref = doc(db, COLLECTION, motoboyUserId);
  await updateDoc(ref, { isOnline, updatedAt: Timestamp.now() });
}
