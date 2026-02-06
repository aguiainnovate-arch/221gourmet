import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../firebase';

export type TableAuditEventType =
  | 'mesa_aberta'
  | 'mesa_fechada'
  | 'mesa_em_fechamento'
  | 'mesa_livre'
  | 'ajuste'
  | 'responsavel_alterado'
  | 'forcar_fechamento';

export interface TableAuditEvent {
  id: string;
  restaurantId: string;
  mesaId: string;
  mesaNumero?: string;
  evento: TableAuditEventType;
  userId: string;
  detalhe: string | null;
  motivo: string | null;
  timestamp: Date;
}

function toEvent(d: { id: string; data: () => Record<string, unknown> }): TableAuditEvent {
  const data = d.data();
  return {
    id: d.id,
    restaurantId: data.restaurantId as string,
    mesaId: data.mesaId as string,
    mesaNumero: data.mesaNumero as string | undefined,
    evento: data.evento as TableAuditEventType,
    userId: data.userId as string,
    detalhe: (data.detalhe as string) ?? null,
    motivo: (data.motivo as string) ?? null,
    timestamp: (data.timestamp as Timestamp)?.toDate?.() ?? new Date()
  };
}

export const logTableEvent = async (
  restaurantId: string,
  mesaId: string,
  evento: TableAuditEventType,
  userId: string,
  options?: { mesaNumero?: string; detalhe?: string; motivo?: string }
): Promise<void> => {
  await addDoc(collection(db, 'tableAuditEvents'), {
    restaurantId,
    mesaId,
    mesaNumero: options?.mesaNumero ?? null,
    evento,
    userId,
    detalhe: options?.detalhe ?? null,
    motivo: options?.motivo ?? null,
    timestamp: Timestamp.now()
  });
}

export const getTableAuditEvents = async (
  restaurantId: string,
  filters?: { mesaId?: string; since?: Date; until?: Date; limitCount?: number }
): Promise<TableAuditEvent[]> => {
  const q = query(
    collection(db, 'tableAuditEvents'),
    where('restaurantId', '==', restaurantId),
    orderBy('timestamp', 'desc'),
    limit(filters?.limitCount ?? 200)
  );
  const snapshot = await getDocs(q);
  let events = snapshot.docs.map((doc) => toEvent({ id: doc.id, data: doc.data }));
  if (filters?.mesaId) {
    events = events.filter((e) => e.mesaId === filters.mesaId);
  }
  if (filters?.since) {
    events = events.filter((e) => e.timestamp >= filters.since!);
  }
  if (filters?.until) {
    events = events.filter((e) => e.timestamp <= filters.until!);
  }
  return events;
}
