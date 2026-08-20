import {
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  Timestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../../firebase';

const COLLECTION = 'waiterCalls';

export type WaiterCallStatus = 'pendente' | 'atendida';

export interface WaiterCall {
  id: string;
  restaurantId: string;
  mesaId: string;
  mesaNumero: string;
  status: WaiterCallStatus;
  createdAt: Date;
  updatedAt: Date;
  attendedAt: Date | null;
}

function toWaiterCall(id: string, data: Record<string, unknown>): WaiterCall {
  const toDate = (value: unknown): Date =>
    (value as { toDate?: () => Date })?.toDate?.() ?? (value as Date) ?? new Date();

  return {
    id,
    restaurantId: (data.restaurantId as string) ?? '',
    mesaId: (data.mesaId as string) ?? '',
    mesaNumero: String(data.mesaNumero ?? ''),
    status: (data.status as WaiterCallStatus) ?? 'pendente',
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    attendedAt: data.attendedAt ? toDate(data.attendedAt) : null
  };
}

export async function createWaiterCall(
  restaurantId: string,
  mesaId: string,
  mesaNumero: string
): Promise<WaiterCall> {
  const now = new Date();
  const docRef = await addDoc(collection(db, COLLECTION), {
    restaurantId,
    mesaId,
    mesaNumero,
    status: 'pendente',
    createdAt: now,
    updatedAt: now,
    attendedAt: null
  });
  return {
    id: docRef.id,
    restaurantId,
    mesaId,
    mesaNumero,
    status: 'pendente',
    createdAt: now,
    updatedAt: now,
    attendedAt: null
  };
}

export async function acknowledgeWaiterCall(callId: string): Promise<void> {
  const now = Timestamp.now();
  await updateDoc(doc(db, COLLECTION, callId), {
    status: 'atendida',
    attendedAt: now,
    updatedAt: now
  });
}

export function subscribePendingWaiterCalls(
  restaurantId: string,
  onChange: (calls: WaiterCall[]) => void
): () => void {
  const q = query(collection(db, COLLECTION), where('restaurantId', '==', restaurantId));
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs
        .map((d) => toWaiterCall(d.id, d.data()))
        .filter((call) => call.status === 'pendente')
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      onChange(list);
    },
    (error) => {
      console.error('Erro no listener de chamadas de garçom:', error);
    }
  );
}

export function subscribeTableWaiterCall(
  restaurantId: string,
  mesaId: string,
  onChange: (call: WaiterCall | null) => void
): () => void {
  const q = query(collection(db, COLLECTION), where('mesaId', '==', mesaId));
  return onSnapshot(
    q,
    (snapshot) => {
      const pending = snapshot.docs
        .map((d) => toWaiterCall(d.id, d.data()))
        .filter((call) => call.restaurantId === restaurantId && call.status === 'pendente')
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      onChange(pending[0] ?? null);
    },
    (error) => {
      console.error('Erro no listener de chamada da mesa:', error);
    }
  );
}
