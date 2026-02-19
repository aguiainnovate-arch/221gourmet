import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  updateDoc,
  Timestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../../firebase';
import type { DeliveryRequest, DeliveryRequestStatus, CreateDeliveryRequestData } from '../types/deliveryRequest';

const COLLECTION = 'deliveryRequests';

function docToRequest(docId: string, data: Record<string, unknown>): DeliveryRequest {
  return {
    id: docId,
    orderId: (data.orderId as string) ?? '',
    restaurantId: (data.restaurantId as string) ?? '',
    motoboyUserId: (data.motoboyUserId as string | null) ?? null,
    fee: (data.fee as number) ?? 0,
    status: (data.status as DeliveryRequestStatus) ?? 'PENDENTE',
    createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.() ?? new Date(),
    updatedAt: (data.updatedAt as { toDate?: () => Date })?.toDate?.() ?? new Date(),
    acceptedAt: (data.acceptedAt as { toDate?: () => Date })?.toDate?.() ?? undefined,
    completedAt: (data.completedAt as { toDate?: () => Date })?.toDate?.() ?? undefined
  };
}

export async function createDeliveryRequest(data: CreateDeliveryRequestData): Promise<DeliveryRequest> {
  const now = Timestamp.now();
  const ref = await addDoc(collection(db, COLLECTION), {
    orderId: data.orderId,
    restaurantId: data.restaurantId,
    motoboyUserId: null,
    fee: data.fee,
    status: 'PENDENTE',
    createdAt: now,
    updatedAt: now
  });
  return {
    id: ref.id,
    ...data,
    motoboyUserId: null,
    status: 'PENDENTE',
    createdAt: now.toDate(),
    updatedAt: now.toDate()
  };
}

export async function getDeliveryRequestById(id: string): Promise<DeliveryRequest | null> {
  const ref = doc(db, COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return docToRequest(snap.id, snap.data());
}

/** Lista chamadas pendentes (para motoboys verem e aceitar/recusar). */
export async function getPendingDeliveryRequests(): Promise<DeliveryRequest[]> {
  const q = query(
    collection(db, COLLECTION),
    where('status', '==', 'PENDENTE')
  );
  const snapshot = await getDocs(q);
  const list = snapshot.docs.map((d) => docToRequest(d.id, d.data()));
  list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return list;
}

/** Lista chamadas aceitas por um motoboy (para o painel do motoboy). */
export async function getDeliveryRequestsByMotoboy(motoboyUserId: string): Promise<DeliveryRequest[]> {
  const q = query(
    collection(db, COLLECTION),
    where('motoboyUserId', '==', motoboyUserId)
  );
  const snapshot = await getDocs(q);
  const list = snapshot.docs.map((d) => docToRequest(d.id, d.data()));
  list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return list;
}

/** Lista chamadas por pedido (para o restaurante ver se já chamou e qual status). */
export async function getDeliveryRequestsByOrderId(orderId: string): Promise<DeliveryRequest[]> {
  const q = query(
    collection(db, COLLECTION),
    where('orderId', '==', orderId)
  );
  const snapshot = await getDocs(q);
  const list = snapshot.docs.map((d) => docToRequest(d.id, d.data()));
  list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return list;
}

/** Lista chamadas por restaurante (para o painel do restaurante). */
export async function getDeliveryRequestsByRestaurant(restaurantId: string): Promise<DeliveryRequest[]> {
  const q = query(
    collection(db, COLLECTION),
    where('restaurantId', '==', restaurantId)
  );
  const snapshot = await getDocs(q);
  const list = snapshot.docs.map((d) => docToRequest(d.id, d.data()));
  list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return list;
}

export async function acceptDeliveryRequest(
  requestId: string,
  motoboyUserId: string
): Promise<void> {
  const ref = doc(db, COLLECTION, requestId);
  const now = Timestamp.now();
  await updateDoc(ref, {
    motoboyUserId,
    status: 'ACEITA',
    acceptedAt: now,
    updatedAt: now
  });
}

/** Recusa uma chamada. O motoboyUserId é gravado para que a recusa entre no cálculo da taxa de aceitação. */
export async function refuseDeliveryRequest(requestId: string, motoboyUserId: string): Promise<void> {
  const ref = doc(db, COLLECTION, requestId);
  const now = Timestamp.now();
  await updateDoc(ref, {
    motoboyUserId,
    status: 'RECUSADA',
    updatedAt: now
  });
}

export async function cancelDeliveryRequest(requestId: string): Promise<void> {
  const ref = doc(db, COLLECTION, requestId);
  await updateDoc(ref, {
    status: 'CANCELADA',
    updatedAt: Timestamp.now()
  });
}

/**
 * Inscrição em tempo real para chamadas pendentes (painel do motoboy).
 */
export function subscribePendingDeliveryRequests(
  onRequests: (requests: DeliveryRequest[]) => void
): () => void {
  const q = query(
    collection(db, COLLECTION),
    where('status', '==', 'PENDENTE')
  );
  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map((d) => docToRequest(d.id, d.data()));
    list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    onRequests(list);
  }, (err) => {
    console.error('Erro no listener de delivery requests:', err);
  });
}

export type MotoboyHistoryPeriod = '7d' | '30d' | 'all';

/** Histórico de chamadas do motoboy (aceitas, recusadas, etc.) com filtro de período. */
export async function getMotoboyHistory(
  motoboyUserId: string,
  period: MotoboyHistoryPeriod = 'all'
): Promise<DeliveryRequest[]> {
  const list = await getDeliveryRequestsByMotoboy(motoboyUserId);
  if (period === 'all') return list;
  const now = Date.now();
  const ms = period === '7d' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
  const cutoff = now - ms;
  return list.filter((r) => r.updatedAt.getTime() >= cutoff);
}

export interface MotoboyKPIs {
  deliveriesCompleted: number;
  deliveriesCompleted7d: number;
  deliveriesCompleted30d: number;
  acceptanceRate: number;
  refusalRate: number;
  earnings: number;
  avgAcceptTimeMs: number | null;
}

/** KPIs agregados do motoboy (entregas concluídas, taxas, ganhos). */
export async function getMotoboyKPIs(motoboyUserId: string): Promise<MotoboyKPIs> {
  const [requests, orders] = await Promise.all([
    getDeliveryRequestsByMotoboy(motoboyUserId),
    (async () => {
      const { getDeliveryOrdersByMotoboy } = await import('./deliveryService');
      return getDeliveryOrdersByMotoboy(motoboyUserId);
    })()
  ]);

  const delivered = orders.filter((o) => o.status === 'delivered');
  const now = Date.now();
  const ms7d = 7 * 24 * 60 * 60 * 1000;
  const ms30d = 30 * 24 * 60 * 60 * 1000;
  const deliveriesCompleted = delivered.length;
  const deliveriesCompleted7d = delivered.filter((o) => o.updatedAt.getTime() >= now - ms7d).length;
  const deliveriesCompleted30d = delivered.filter((o) => o.updatedAt.getTime() >= now - ms30d).length;

  const accepted = requests.filter((r) => r.status === 'ACEITA');
  const refused = requests.filter((r) => r.status === 'RECUSADA');
  const totalResponded = accepted.length + refused.length;
  const acceptanceRate = totalResponded > 0 ? accepted.length / totalResponded : 0;
  const refusalRate = totalResponded > 0 ? refused.length / totalResponded : 0;

  const earnings = accepted.reduce((sum, r) => sum + r.fee, 0);

  let avgAcceptTimeMs: number | null = null;
  const withAcceptedAt = accepted.filter((r) => r.acceptedAt);
  if (withAcceptedAt.length > 0) {
    const total = withAcceptedAt.reduce(
      (sum, r) => sum + (r.acceptedAt!.getTime() - r.createdAt.getTime()),
      0
    );
    avgAcceptTimeMs = total / withAcceptedAt.length;
  }

  return {
    deliveriesCompleted,
    deliveriesCompleted7d,
    deliveriesCompleted30d,
    acceptanceRate,
    refusalRate,
    earnings,
    avgAcceptTimeMs
  };
}

/** Retorna entregas do dia e lucro bruto do dia para um motoboy (para resumo do dia). */
export async function getMotoboyDayStats(
  motoboyUserId: string,
  dateStr: string
): Promise<{ deliveriesCount: number; grossProfit: number }> {
  const [requests, orders] = await Promise.all([
    getDeliveryRequestsByMotoboy(motoboyUserId),
    (async () => {
      const { getDeliveryOrdersByMotoboy } = await import('./deliveryService');
      return getDeliveryOrdersByMotoboy(motoboyUserId);
    })()
  ]);

  const [y, m, d] = dateStr.split('-').map(Number);
  const startMs = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
  const endMs = new Date(y, m - 1, d, 23, 59, 59, 999).getTime();

  const deliveredThatDay = orders.filter(
    (o) => o.status === 'delivered' && o.updatedAt.getTime() >= startMs && o.updatedAt.getTime() <= endMs
  );
  const deliveriesCount = deliveredThatDay.length;

  const accepted = requests.filter((r) => r.status === 'ACEITA');
  let grossProfit = 0;
  for (const r of accepted) {
    const dateToUse = r.completedAt ?? r.acceptedAt ?? r.updatedAt;
    const t = dateToUse.getTime();
    if (t >= startMs && t <= endMs) grossProfit += r.fee;
  }

  return { deliveriesCount, grossProfit };
}

/** Estatísticas por dia para um conjunto de datas (uma única leitura). */
export async function getMotoboyDayStatsBatch(
  motoboyUserId: string,
  dateStrs: string[]
): Promise<Map<string, { deliveriesCount: number; grossProfit: number }>> {
  const [requests, orders] = await Promise.all([
    getDeliveryRequestsByMotoboy(motoboyUserId),
    (async () => {
      const { getDeliveryOrdersByMotoboy } = await import('./deliveryService');
      return getDeliveryOrdersByMotoboy(motoboyUserId);
    })()
  ]);

  const accepted = requests.filter((r) => r.status === 'ACEITA');
  const delivered = orders.filter((o) => o.status === 'delivered');

  const result = new Map<string, { deliveriesCount: number; grossProfit: number }>();
  for (const dateStr of dateStrs) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const startMs = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
    const endMs = new Date(y, m - 1, d, 23, 59, 59, 999).getTime();

    const deliveriesCount = delivered.filter(
      (o) => o.updatedAt.getTime() >= startMs && o.updatedAt.getTime() <= endMs
    ).length;

    let grossProfit = 0;
    for (const r of accepted) {
      const dateToUse = r.completedAt ?? r.acceptedAt ?? r.updatedAt;
      const t = dateToUse.getTime();
      if (t >= startMs && t <= endMs) grossProfit += r.fee;
    }
    result.set(dateStr, { deliveriesCount, grossProfit });
  }
  return result;
}
