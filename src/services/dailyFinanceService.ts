import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../firebase';
import type { DailyFinance, DailyFinanceInput } from '../types/dailyFinance';
import { getMotoboyDayStats } from './deliveryRequestService';
import { todayString } from '../utils/dateUtils';

const COLLECTION = 'motoboyDailyFinances';

function docToDailyFinance(docId: string, data: Record<string, unknown>): DailyFinance {
  const createdAt = (data.createdAt as { toDate?: () => Date })?.toDate?.();
  const updatedAt = (data.updatedAt as { toDate?: () => Date })?.toDate?.();
  const fuelExpense = (data.fuelExpense as number) ?? 0;
  const otherExpense = (data.otherExpense as number) ?? 0;
  const totalExpense = fuelExpense + otherExpense;
  const grossProfit = (data.grossProfit as number) ?? 0;
  const netProfit = grossProfit - totalExpense;

  return {
    id: docId,
    motoboyUserId: data.motoboyUserId as string,
    date: data.date as string,
    grossProfit,
    fuelExpense,
    otherExpense,
    totalExpense,
    netProfit,
    note: (data.note as string) || undefined,
    createdAt: createdAt ?? new Date(),
    updatedAt: updatedAt ?? new Date()
  };
}

/** ID do documento: motoboyUserId + date para unicidade por dia. */
function docId(motoboyUserId: string, date: string): string {
  return `${motoboyUserId}_${date}`;
}

/**
 * Busca registro de finanças do dia. Se não existir, retorna null (não cria).
 */
export async function getDailyFinance(
  motoboyUserId: string,
  date: string
): Promise<DailyFinance | null> {
  const ref = doc(db, COLLECTION, docId(motoboyUserId, date));
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return docToDailyFinance(snap.id, snap.data());
}

/**
 * Salva ou atualiza o registro do dia. Atualiza grossProfit com o valor atual do backend.
 */
export async function saveDailyFinance(
  motoboyUserId: string,
  input: DailyFinanceInput
): Promise<DailyFinance> {
  const { date, fuelExpense, otherExpense, note } = input;
  const fuel = Math.max(0, Number(fuelExpense));
  const other = Math.max(0, Number(otherExpense));
  const totalExpense = fuel + other;

  const { grossProfit } = await getMotoboyDayStats(motoboyUserId, date);
  const netProfit = grossProfit - totalExpense;

  const now = Timestamp.now();
  const data = {
    motoboyUserId,
    date,
    grossProfit,
    fuelExpense: fuel,
    otherExpense: other,
    totalExpense,
    netProfit,
    note: note?.trim() || null,
    updatedAt: now,
    createdAt: now
  };

  const ref = doc(db, COLLECTION, docId(motoboyUserId, date));
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const existing = snap.data();
    data.createdAt = (existing.createdAt as Timestamp) ?? now;
  }
  await setDoc(ref, data);

  return docToDailyFinance(ref.id, { ...data, createdAt: data.createdAt, updatedAt: data.updatedAt });
}

/**
 * Lista registros de um motoboy em um intervalo de datas (inclusive).
 * Ordenado por date decrescente.
 */
export async function listDailyFinances(
  motoboyUserId: string,
  startDate: string,
  endDate: string
): Promise<DailyFinance[]> {
  const q = query(
    collection(db, COLLECTION),
    where('motoboyUserId', '==', motoboyUserId)
  );
  const snapshot = await getDocs(q);
  const list = snapshot.docs.map((d) => docToDailyFinance(d.id, d.data()));
  return list
    .filter((r) => r.date >= startDate && r.date <= endDate)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Resumo do dia atual para a tela principal: entregas, lucro bruto, despesas, lucro líquido.
 * Despesas vêm do registro salvo (se existir); senão 0.
 */
export async function getDaySummary(
  motoboyUserId: string,
  date: string = todayString()
): Promise<{
  date: string;
  deliveriesCount: number;
  grossProfit: number;
  totalExpense: number;
  netProfit: number;
}> {
  const [stats, record] = await Promise.all([
    getMotoboyDayStats(motoboyUserId, date),
    getDailyFinance(motoboyUserId, date)
  ]);

  const totalExpense = record?.totalExpense ?? 0;
  const netProfit = stats.grossProfit - totalExpense;

  return {
    date,
    deliveriesCount: stats.deliveriesCount,
    grossProfit: stats.grossProfit,
    totalExpense,
    netProfit
  };
}

/** Gera lista de datas entre start e end (inclusive). */
function dateRange(start: string, end: string): string[] {
  const out: string[] = [];
  const d = new Date(start);
  const endD = new Date(end);
  while (d <= endD) {
    out.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export interface PeriodTotals {
  grossProfit: number;
  totalExpense: number;
  netProfit: number;
}

/**
 * Totais acumulados em um intervalo de datas (cada dia: gross do backend, expense do registro).
 */
export async function getTotalsForPeriod(
  motoboyUserId: string,
  startDate: string,
  endDate: string
): Promise<PeriodTotals> {
  const dates = dateRange(startDate, endDate);
  if (dates.length === 0) return { grossProfit: 0, totalExpense: 0, netProfit: 0 };

  const { getMotoboyDayStatsBatch } = await import('./deliveryRequestService');
  const [statsMap, records] = await Promise.all([
    getMotoboyDayStatsBatch(motoboyUserId, dates),
    listDailyFinances(motoboyUserId, startDate, endDate)
  ]);

  const recordByDate = new Map(records.map((r) => [r.date, r]));
  let grossProfit = 0;
  let totalExpense = 0;
  for (const date of dates) {
    const stats = statsMap.get(date);
    if (stats) grossProfit += stats.grossProfit;
    const rec = recordByDate.get(date);
    totalExpense += rec?.totalExpense ?? 0;
  }

  return {
    grossProfit,
    totalExpense,
    netProfit: grossProfit - totalExpense
  };
}
