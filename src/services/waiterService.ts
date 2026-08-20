import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  Timestamp
} from 'firebase/firestore';
import bcrypt from 'bcryptjs';
import { db } from '../../firebase';
import type { CreateWaiterData, Waiter } from '../types/waiter';
import { isValidCpf, normalizeCpf } from '../utils/cpf';

const COLLECTION = 'waiters';
const BCRYPT_ROUNDS = 10;

function toWaiter(id: string, data: Record<string, unknown>): Waiter {
  return {
    id,
    restaurantId: (data.restaurantId as string) ?? '',
    name: (data.name as string) ?? '',
    cpf: (data.cpf as string) ?? '',
    createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.() ?? new Date(),
    updatedAt: (data.updatedAt as { toDate?: () => Date })?.toDate?.() ?? new Date()
  };
}

export async function getWaiterByCpf(cpf: string): Promise<(Waiter & { password: string }) | null> {
  const normalized = normalizeCpf(cpf);
  if (!normalized) return null;
  const q = query(collection(db, COLLECTION), where('cpf', '==', normalized));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const d = snapshot.docs[0];
  const data = d.data();
  return {
    ...toWaiter(d.id, data),
    password: (data.password as string) ?? ''
  };
}

export async function getWaitersByRestaurant(restaurantId: string): Promise<Waiter[]> {
  const q = query(collection(db, COLLECTION), where('restaurantId', '==', restaurantId));
  const snapshot = await getDocs(q);
  const list = snapshot.docs.map((d) => toWaiter(d.id, d.data()));
  list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  return list;
}

export async function createWaiter(data: CreateWaiterData): Promise<Waiter> {
  const name = data.name.trim();
  const cpf = normalizeCpf(data.cpf);
  const password = data.password.trim();

  if (!name) throw new Error('Informe o nome do garçom.');
  if (!isValidCpf(cpf)) throw new Error('CPF inválido.');
  if (password.length < 4) throw new Error('A senha precisa ter pelo menos 4 caracteres.');

  const existing = await getWaiterByCpf(cpf);
  if (existing) throw new Error('Já existe um garçom cadastrado com este CPF.');

  const now = Timestamp.now();
  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const docRef = await addDoc(collection(db, COLLECTION), {
    restaurantId: data.restaurantId,
    name,
    cpf,
    password: hashedPassword,
    createdAt: now,
    updatedAt: now
  });

  return {
    id: docRef.id,
    restaurantId: data.restaurantId,
    name,
    cpf,
    createdAt: now.toDate(),
    updatedAt: now.toDate()
  };
}

export async function updateWaiterPassword(waiterId: string, password: string): Promise<void> {
  const next = password.trim();
  if (next.length < 4) throw new Error('A senha precisa ter pelo menos 4 caracteres.');
  const hashedPassword = await bcrypt.hash(next, BCRYPT_ROUNDS);
  await updateDoc(doc(db, COLLECTION, waiterId), {
    password: hashedPassword,
    updatedAt: Timestamp.now()
  });
}

export async function deleteWaiter(waiterId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, waiterId));
}

export async function verifyWaiterPassword(cpf: string, password: string): Promise<Waiter | null> {
  const waiter = await getWaiterByCpf(cpf);
  if (!waiter?.password) return null;
  const ok = await bcrypt.compare(password, waiter.password);
  if (!ok) return null;
  const { password: _ignored, ...publicWaiter } = waiter;
  return publicWaiter;
}
