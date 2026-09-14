import {
  saveMotoboyLeadToFirestore,
  type MotoboyLeadPayload,
} from './motoboyLeadFirestoreService';

export type { MotoboyLeadPayload };

export interface MotoboyLeadResponse {
  id: string;
  status: 'created' | 'queued';
}

const LOCAL_KEY = 'bora-comer-motoboy-leads';

function saveFallback(payload: MotoboyLeadPayload): MotoboyLeadResponse {
  const id = `mlead_${Date.now()}`;
  const current = localStorage.getItem(LOCAL_KEY);
  const parsed: Array<MotoboyLeadPayload & { id: string; createdAt: string }> = current
    ? (JSON.parse(current) as Array<MotoboyLeadPayload & { id: string; createdAt: string }>)
    : [];
  parsed.push({ id, createdAt: new Date().toISOString(), ...payload });
  localStorage.setItem(LOCAL_KEY, JSON.stringify(parsed));
  return { id, status: 'queued' };
}

export async function submitMotoboyLead(
  payload: MotoboyLeadPayload
): Promise<MotoboyLeadResponse> {
  try {
    const lead = await saveMotoboyLeadToFirestore(payload);
    return { id: lead.id, status: 'created' };
  } catch {
    return saveFallback(payload);
  }
}
