import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';

export interface MotoboyUser {
  email?: string;
  displayName?: string;
  phone?: string;
}

/**
 * Busca dados de um usuário motoboy por ID (ex.: documento em coleção users).
 * Retorna null se não existir.
 */
export async function getMotoboyById(motoboyUserId: string): Promise<MotoboyUser | null> {
  const ref = doc(db, 'users', motoboyUserId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    email: (data.email as string) || undefined,
    displayName: (data.displayName as string) || undefined,
    phone: (data.phone as string) || undefined
  };
}
