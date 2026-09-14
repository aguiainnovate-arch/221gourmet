import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../firebase';

export type MotoboyLeadStatus = 'pending' | 'approved' | 'rejected';

export interface MotoboyLeadPayload {
  name: string;
  email: string;
  phone: string;
  cityState: string;
  vehicleInfo: string;
  hasCnh: boolean;
  notes: string;
}

export interface MotoboyLead extends MotoboyLeadPayload {
  id: string;
  status: MotoboyLeadStatus;
  createdAt: Date;
  updatedAt: Date;
}

const COLLECTION = 'motoboyLeads';

export async function saveMotoboyLeadToFirestore(
  payload: MotoboyLeadPayload
): Promise<MotoboyLead> {
  const now = Timestamp.now();
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...payload,
    status: 'pending' as MotoboyLeadStatus,
    createdAt: now,
    updatedAt: now,
  });

  return {
    id: docRef.id,
    ...payload,
    status: 'pending',
    createdAt: now.toDate(),
    updatedAt: now.toDate(),
  };
}

export async function getMotoboyLeads(): Promise<MotoboyLead[]> {
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: typeof data.name === 'string' ? data.name : '',
      email: typeof data.email === 'string' ? data.email : '',
      phone: typeof data.phone === 'string' ? data.phone : '',
      cityState: typeof data.cityState === 'string' ? data.cityState : '',
      vehicleInfo: typeof data.vehicleInfo === 'string' ? data.vehicleInfo : '',
      hasCnh: data.hasCnh === true,
      notes: typeof data.notes === 'string' ? data.notes : '',
      status: (data.status as MotoboyLeadStatus) ?? 'pending',
      createdAt: data.createdAt?.toDate?.() ?? new Date(),
      updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
    };
  });
}

export async function updateMotoboyLeadStatus(
  id: string,
  status: MotoboyLeadStatus
): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, { status, updatedAt: Timestamp.now() });
}
