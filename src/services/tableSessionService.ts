import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  type DocumentSnapshot
} from 'firebase/firestore';
import { db } from '../../firebase';

export interface SessionAdjustment {
  valor: number;
  motivo: string;
  userId: string;
  timestamp: Date;
}

export interface TableSession {
  id: string;
  restaurantId: string;
  mesaId: string;
  mesaNumero: string;
  abertaEm: Date;
  fechadaEm: Date | null;
  responsavelAbertura: string | null;
  responsavelFechamento: string | null;
  total: number;
  metodoPagamento: string | null;
  valorPago: number | null;
  ajustes: SessionAdjustment[];
  createdAt: Date;
  updatedAt: Date;
}

function toSession(d: DocumentSnapshot): TableSession {
  const data = d.data()!;
  const abertaEm = data.abertaEm?.toDate?.() ?? new Date();
  const fechadaEm = data.fechadaEm?.toDate?.() ?? null;
  const ajustes = (data.ajustes ?? []).map((a: { valor: number; motivo: string; userId: string; timestamp: Timestamp }) => ({
    valor: a.valor,
    motivo: a.motivo,
    userId: a.userId,
    timestamp: a.timestamp?.toDate?.() ?? new Date()
  }));
  return {
    id: d.id,
    restaurantId: data.restaurantId,
    mesaId: data.mesaId,
    mesaNumero: data.mesaNumero,
    abertaEm,
    fechadaEm,
    responsavelAbertura: data.responsavelAbertura ?? null,
    responsavelFechamento: data.responsavelFechamento ?? null,
    total: data.total ?? 0,
    metodoPagamento: data.metodoPagamento ?? null,
    valorPago: data.valorPago ?? null,
    ajustes,
    createdAt: data.createdAt?.toDate?.() ?? new Date(),
    updatedAt: data.updatedAt?.toDate?.() ?? new Date()
  };
}

export const openSession = async (
  restaurantId: string,
  mesaId: string,
  mesaNumero: string,
  _userId: string,
  responsavel?: string | null
): Promise<TableSession> => {
  const now = new Date();
  const docRef = await addDoc(collection(db, 'tableSessions'), {
    restaurantId,
    mesaId,
    mesaNumero,
    abertaEm: now,
    fechadaEm: null,
    responsavelAbertura: responsavel ?? null,
    responsavelFechamento: null,
    total: 0,
    metodoPagamento: null,
    valorPago: null,
    ajustes: [],
    createdAt: now,
    updatedAt: now
  });
  return {
    id: docRef.id,
    restaurantId,
    mesaId,
    mesaNumero,
    abertaEm: now,
    fechadaEm: null,
    responsavelAbertura: responsavel ?? null,
    responsavelFechamento: null,
    total: 0,
    metodoPagamento: null,
    valorPago: null,
    ajustes: [],
    createdAt: now,
    updatedAt: now
  };
}

export const getActiveSessionByTable = async (mesaId: string): Promise<TableSession | null> => {
  const q = query(
    collection(db, 'tableSessions'),
    where('mesaId', '==', mesaId),
    orderBy('abertaEm', 'desc'),
    limit(20)
  );
  const snapshot = await getDocs(q);
  const open = snapshot.docs.find((d) => d.data().fechadaEm == null);
  if (!open) return null;
  return toSession(open);
};

export const closeSession = async (
  sessionId: string,
  total: number,
  userId: string,
  options?: { metodoPagamento?: string; valorPago?: number }
): Promise<void> => {
  const now = new Date();
  await updateDoc(doc(db, 'tableSessions', sessionId), {
    fechadaEm: now,
    responsavelFechamento: userId,
    total,
    metodoPagamento: options?.metodoPagamento ?? null,
    valorPago: options?.valorPago ?? null,
    updatedAt: now
  });
}

export const addSessionAdjustment = async (
  sessionId: string,
  adjustment: { valor: number; motivo: string; userId: string }
): Promise<void> => {
  const sessionRef = doc(db, 'tableSessions', sessionId);
  const snapshot = await getDoc(sessionRef);
  if (!snapshot.exists()) throw new Error('Sessão não encontrada');
  const current = snapshot.data();
  const ajustes = [
    ...(current.ajustes || []),
    {
      valor: adjustment.valor,
      motivo: adjustment.motivo,
      userId: adjustment.userId,
      timestamp: Timestamp.now()
    }
  ];
  await updateDoc(sessionRef, { ajustes, updatedAt: new Date() });
}

export const getSessionsByRestaurant = async (
  restaurantId: string,
  options?: { mesaId?: string; since?: Date }
): Promise<TableSession[]> => {
  let q = query(
    collection(db, 'tableSessions'),
    where('restaurantId', '==', restaurantId),
    orderBy('abertaEm', 'desc')
  );
  if (options?.mesaId) {
    q = query(
      collection(db, 'tableSessions'),
      where('restaurantId', '==', restaurantId),
      where('mesaId', '==', options.mesaId),
      orderBy('abertaEm', 'desc')
    );
  }
  const snapshot = await getDocs(q);
  let sessions = snapshot.docs.map(toSession);
  if (options?.since) {
    sessions = sessions.filter((s) => s.abertaEm >= options.since!);
  }
  return sessions;
}
