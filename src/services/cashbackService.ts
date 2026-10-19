import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { RestaurantCashbackSettings } from '../types/cashback';
import {
  maxSpendableCents,
  normalizeCashbackSettings,
  previewCashbackEarn,
  weekdayFromDate,
  type CashbackLineItem,
} from '../types/cashback';
import type { DeliveryOrderItem } from '../types/delivery';
import { getRestaurantById } from './restaurantService';

export interface CashbackBalance {
  id: string;
  deliveryUserId: string;
  restaurantId: string;
  balanceCents: number;
  updatedAt: Date;
}

export type CashbackLedgerType = 'earn' | 'spend' | 'adjust' | 'refund';

export interface CashbackLedgerEntry {
  id: string;
  deliveryUserId: string;
  restaurantId: string;
  type: CashbackLedgerType;
  amountCents: number;
  orderId?: string;
  note?: string;
  createdAt: Date;
}

function balanceDocId(deliveryUserId: string, restaurantId: string): string {
  return `${deliveryUserId}_${restaurantId}`;
}

function roundCents(value: number): number {
  return Math.max(0, Math.round(value));
}

export async function getCashbackSettings(
  restaurantId: string
): Promise<RestaurantCashbackSettings> {
  const restaurant = await getRestaurantById(restaurantId);
  return normalizeCashbackSettings(restaurant?.cashbackSettings);
}

export async function getCashbackBalance(
  deliveryUserId: string,
  restaurantId: string
): Promise<CashbackBalance | null> {
  if (!deliveryUserId || !restaurantId) return null;
  const id = balanceDocId(deliveryUserId, restaurantId);
  const snap = await getDoc(doc(db, 'cashbackBalances', id));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    deliveryUserId,
    restaurantId,
    balanceCents: typeof data.balanceCents === 'number' ? data.balanceCents : 0,
    updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
  };
}

export async function listCashbackBalancesForUser(
  deliveryUserId: string
): Promise<CashbackBalance[]> {
  if (!deliveryUserId) return [];
  const q = query(
    collection(db, 'cashbackBalances'),
    where('deliveryUserId', '==', deliveryUserId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      deliveryUserId,
      restaurantId: String(data.restaurantId ?? ''),
      balanceCents: typeof data.balanceCents === 'number' ? data.balanceCents : 0,
      updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
    };
  });
}

async function appendLedger(
  entry: Omit<CashbackLedgerEntry, 'id' | 'createdAt'> & { idempotencyKey?: string }
): Promise<void> {
  const payload: Record<string, unknown> = {
    deliveryUserId: entry.deliveryUserId,
    restaurantId: entry.restaurantId,
    type: entry.type,
    amountCents: entry.amountCents,
    createdAt: Timestamp.now(),
  };
  if (entry.orderId) payload.orderId = entry.orderId;
  if (entry.note) payload.note = entry.note;
  if (entry.idempotencyKey) payload.idempotencyKey = entry.idempotencyKey;
  await addDoc(collection(db, 'cashbackLedger'), payload);
}

async function adjustBalanceTx(params: {
  deliveryUserId: string;
  restaurantId: string;
  deltaCents: number;
  type: CashbackLedgerType;
  orderId?: string;
  note?: string;
  idempotencyKey?: string;
}): Promise<{ balanceCents: number; applied: boolean }> {
  const {
    deliveryUserId,
    restaurantId,
    deltaCents,
    type,
    orderId,
    note,
    idempotencyKey,
  } = params;
  const id = balanceDocId(deliveryUserId, restaurantId);
  const balanceRef = doc(db, 'cashbackBalances', id);

  if (idempotencyKey) {
    const ledgerQ = query(
      collection(db, 'cashbackLedger'),
      where('idempotencyKey', '==', idempotencyKey)
    );
    const existing = await getDocs(ledgerQ);
    if (!existing.empty) {
      const snap = await getDoc(balanceRef);
      return {
        balanceCents: snap.exists() ? Number(snap.data().balanceCents ?? 0) : 0,
        applied: false,
      };
    }
  }

  const result = await runTransaction(db, async (tx) => {
    const snap = await tx.get(balanceRef);
    const current = snap.exists() ? Number(snap.data().balanceCents ?? 0) : 0;
    const next = Math.max(0, current + deltaCents);
    tx.set(
      balanceRef,
      {
        deliveryUserId,
        restaurantId,
        balanceCents: next,
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    );
    return next;
  });

  await appendLedger({
    deliveryUserId,
    restaurantId,
    type,
    amountCents: deltaCents,
    orderId,
    note,
    idempotencyKey,
  });

  return { balanceCents: result, applied: true };
}

/** Debita saldo no checkout (mesma loja). Retorna centavos realmente debitados. */
export async function spendCashback(params: {
  deliveryUserId: string;
  restaurantId: string;
  amountCents: number;
  orderId: string;
}): Promise<number> {
  const amount = roundCents(params.amountCents);
  if (amount <= 0) return 0;

  const settings = await getCashbackSettings(params.restaurantId);
  if (!settings.enabled) {
    throw new Error('Cashback desativado neste restaurante.');
  }

  const balance = await getCashbackBalance(params.deliveryUserId, params.restaurantId);
  const available = balance?.balanceCents ?? 0;
  if (amount > available) {
    throw new Error('Saldo de cashback insuficiente nesta loja.');
  }

  const { applied } = await adjustBalanceTx({
    deliveryUserId: params.deliveryUserId,
    restaurantId: params.restaurantId,
    deltaCents: -amount,
    type: 'spend',
    orderId: params.orderId,
    note: 'Uso no checkout',
    idempotencyKey: `spend_${params.orderId}`,
  });

  return applied ? amount : 0;
}

/** Credita cashback quando o pedido é entregue. Idempotente por orderId. */
export async function earnCashbackForDeliveredOrder(params: {
  orderId: string;
  deliveryUserId: string;
  restaurantId: string;
  items: DeliveryOrderItem[];
  cashbackSpendCents?: number;
}): Promise<number> {
  const { orderId, deliveryUserId, restaurantId, items } = params;
  if (!deliveryUserId || !restaurantId || !orderId) return 0;

  const settings = await getCashbackSettings(restaurantId);
  if (!settings.enabled) return 0;

  const lineItems: CashbackLineItem[] = items.map((i) => ({
    productId: i.productId,
    quantity: i.quantity,
    price: i.price,
  }));
  const preview = previewCashbackEarn(settings, lineItems, weekdayFromDate());
  if (preview.earnCents <= 0) return 0;

  const { applied } = await adjustBalanceTx({
    deliveryUserId,
    restaurantId,
    deltaCents: preview.earnCents,
    type: 'earn',
    orderId,
    note: 'Cashback do pedido entregue',
    idempotencyKey: `earn_${orderId}`,
  });

  return applied ? preview.earnCents : 0;
}

/** Estorna gasto de cashback se o pedido for cancelado após debitar. */
export async function refundCashbackSpend(params: {
  orderId: string;
  deliveryUserId: string;
  restaurantId: string;
  amountCents: number;
}): Promise<void> {
  const amount = roundCents(params.amountCents);
  if (amount <= 0 || !params.deliveryUserId) return;
  await adjustBalanceTx({
    deliveryUserId: params.deliveryUserId,
    restaurantId: params.restaurantId,
    deltaCents: amount,
    type: 'refund',
    orderId: params.orderId,
    note: 'Estorno por cancelamento',
    idempotencyKey: `refund_spend_${params.orderId}`,
  });
}

export function computeSpendCapCents(
  settings: RestaurantCashbackSettings,
  balanceCents: number,
  orderTotalReais: number
): number {
  return maxSpendableCents(settings, balanceCents, Math.round(orderTotalReais * 100));
}

export { previewCashbackEarn, normalizeCashbackSettings };
