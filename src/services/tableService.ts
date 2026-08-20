import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  where,
  Timestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../../firebase';
import { getActiveSessionByTable, openSession } from './tableSessionService';
import { logTableEvent } from './tableAuditService';

export type TableStatus = 'livre' | 'ocupada' | 'em_fechamento' | 'fechada' | 'bloqueada';

/** Mesas disponíveis para nova sessão (abertura). */
export const canOpenTable = (status: TableStatus): boolean =>
  status === 'livre' || status === 'fechada';

export interface Table {
  id: string;
  restaurantId: string;
  numero: string;
  areaId: string | null;
  areaName?: string;
  capacidade: number;
  ordem: number;
  status: TableStatus;
  responsavel: string | null;
  observacao: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Legacy shape (id, numero, createdAt only) for backward compatibility when reading old docs
function toTable(docId: string, data: Record<string, unknown>, restaurantId: string): Table {
  const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt as Date) || new Date();
  const updatedAt = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt as Date) || createdAt;
  return {
    id: docId,
    restaurantId: (data.restaurantId as string) || restaurantId,
    numero: String(data.numero ?? ''),
    areaId: (data.areaId as string) || null,
    areaName: data.areaName as string | undefined,
    capacidade: typeof data.capacidade === 'number' ? data.capacidade : 4,
    ordem: typeof data.ordem === 'number' ? data.ordem : 0,
    status: (data.status as TableStatus) || 'livre',
    responsavel: (data.responsavel as string) || null,
    observacao: (data.observacao as string) || null,
    createdAt,
    updatedAt
  };
}

export const addTable = async (
  restaurantId: string,
  numero: string,
  options?: { areaId?: string | null; areaName?: string; capacidade?: number; ordem?: number }
): Promise<Table> => {
  try {
    const now = new Date();
    const docRef = await addDoc(collection(db, 'tables'), {
      restaurantId,
      numero: numero.trim(),
      areaId: options?.areaId ?? null,
      areaName: options?.areaName ?? null,
      capacidade: options?.capacidade ?? 4,
      ordem: options?.ordem ?? 0,
      status: 'livre',
      responsavel: null,
      observacao: null,
      createdAt: now,
      updatedAt: now
    });
    return {
      id: docRef.id,
      restaurantId,
      numero: numero.trim(),
      areaId: options?.areaId ?? null,
      areaName: options?.areaName,
      capacidade: options?.capacidade ?? 4,
      ordem: options?.ordem ?? 0,
      status: 'livre',
      responsavel: null,
      observacao: null,
      createdAt: now,
      updatedAt: now
    };
  } catch (error) {
    console.error('Erro ao adicionar mesa:', error);
    throw new Error('Falha ao adicionar mesa');
  }
};

export const subscribeToTables = (
  restaurantId: string,
  onChange: (tables: Table[]) => void
): (() => void) => {
  const q = query(collection(db, 'tables'), where('restaurantId', '==', restaurantId));
  return onSnapshot(
    q,
    (snapshot) => {
      const tables: Table[] = [];
      snapshot.forEach((d) => {
        tables.push(toTable(d.id, d.data(), restaurantId));
      });
      tables.sort((a, b) => a.ordem - b.ordem || a.numero.localeCompare(b.numero));
      onChange(tables);
    },
    (error) => {
      console.error('Erro ao observar mesas:', error);
    }
  );
};

/**
 * Abre a mesa automaticamente quando o cliente escaneia o QR.
 * Não exige ação prévia no painel. Mesas bloqueadas permanecem fechadas.
 */
export const ensureTableOpenByCustomer = async (
  restaurantId: string,
  mesa: Table
): Promise<Table> => {
  if (mesa.status === 'ocupada' || mesa.status === 'em_fechamento') {
    return mesa;
  }
  if (!canOpenTable(mesa.status)) {
    return mesa;
  }

  const existing = await getActiveSessionByTable(mesa.id);
  if (!existing) {
    await openSession(restaurantId, mesa.id, mesa.numero, 'cliente', 'Cliente');
    await logTableEvent(restaurantId, mesa.id, 'mesa_aberta', 'cliente', {
      mesaNumero: mesa.numero,
      detalhe: 'Aberta pelo QR do cliente'
    });
  }

  await updateTable(mesa.id, { status: 'ocupada' });
  return { ...mesa, status: 'ocupada' };
};

export const getTables = async (restaurantId: string): Promise<Table[]> => {
  try {
    const q = query(
      collection(db, 'tables'),
      where('restaurantId', '==', restaurantId),
      orderBy('numero')
    );
    const querySnapshot = await getDocs(q);
    const tables: Table[] = [];
    querySnapshot.forEach((d) => {
      tables.push(toTable(d.id, d.data(), restaurantId));
    });
    tables.sort((a, b) => a.ordem - b.ordem || a.numero.localeCompare(b.numero));
    return tables;
  } catch (error) {
    try {
      const q = query(collection(db, 'tables'), where('restaurantId', '==', restaurantId));
      const querySnapshot = await getDocs(q);
      const tables: Table[] = [];
      querySnapshot.forEach((d) => {
        tables.push(toTable(d.id, d.data(), restaurantId));
      });
      tables.sort((a, b) => a.ordem - b.ordem || a.numero.localeCompare(b.numero));
      return tables;
    } catch (e2) {
      console.error('Erro ao buscar mesas:', e2);
      throw new Error('Falha ao buscar mesas');
    }
  }
};

export const updateTable = async (
  id: string,
  updates: Partial<Pick<Table, 'status' | 'responsavel' | 'observacao' | 'areaId' | 'areaName' | 'capacidade' | 'ordem' | 'numero'>>
): Promise<void> => {
  try {
    const ref = doc(db, 'tables', id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await updateDoc(ref, { ...updates, updatedAt: new Date() } as any);
  } catch (error) {
    console.error('Erro ao atualizar mesa:', error);
    throw new Error('Falha ao atualizar mesa');
  }
};

export const deleteTable = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'tables', id));
  } catch (error) {
    console.error('Erro ao remover mesa:', error);
    throw new Error('Falha ao remover mesa');
  }
};

/**
 * Gera a URL do cardápio da mesa para QR code. Inclui o restaurantId para o menu certo.
 * Ordem da base: 1) VITE_APP_URL (produção), 2) origem atual no browser.
 */
export const generateTableUrl = (restaurantId: string, numero: string): string => {
  const envBase = import.meta.env.VITE_APP_URL as string | undefined;
  const base =
    (envBase && envBase.trim()) ||
    (typeof window !== 'undefined' ? window.location.origin : '');
  const baseClean = base.replace(/\/$/, '');
  const path = `/${restaurantId}/mesa/${numero}`;
  return baseClean ? `${baseClean}${path}` : path;
};
