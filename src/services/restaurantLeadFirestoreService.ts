import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  query,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../firebase';
import type { RestaurantLeadPayload } from './restaurantLeadService';

export type LeadStatus = 'pending' | 'approved' | 'rejected';

export interface RestaurantLead extends RestaurantLeadPayload {
  id: string;
  status: LeadStatus;
  createdAt: Date;
  updatedAt: Date;
  /** Preenchido quando o lead foi salvo sem decisão da IA por falha técnica na moderação. */
  savedWithoutAiModeration?: boolean;
}

const COLLECTION = 'restaurantLeads';

export type SaveLeadOptions = {
  /** Falha técnica na moderação automática; lead segue pendente para revisão humana. */
  savedWithoutAiModeration?: boolean;
};

export async function saveLeadToFirestore(
  payload: RestaurantLeadPayload,
  options?: SaveLeadOptions
): Promise<RestaurantLead> {
  const now = Timestamp.now();
  const savedWithoutAiModeration = options?.savedWithoutAiModeration === true;
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...payload,
    status: 'pending',
    ...(savedWithoutAiModeration ? { savedWithoutAiModeration: true } : {}),
    createdAt: now,
    updatedAt: now
  });

  return {
    id: docRef.id,
    ...payload,
    status: 'pending',
    savedWithoutAiModeration: savedWithoutAiModeration ? true : undefined,
    createdAt: now.toDate(),
    updatedAt: now.toDate()
  };
}

export async function getRestaurantLeads(): Promise<RestaurantLead[]> {
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      restaurantName: data.restaurantName ?? '',
      ownerName: data.ownerName ?? '',
      phone: data.phone ?? '',
      whatsapp: data.whatsapp ?? '',
      email: data.email ?? '',
      cnpj: data.cnpj ?? '',
      address: data.address ?? '',
      cityState: data.cityState ?? '',
      cuisineType: data.cuisineType ?? '',
      openingHours: data.openingHours ?? '',
      priceRange: data.priceRange ?? '',
      socialLink: data.socialLink ?? '',
      description: data.description ?? '',
      ...(data.savedWithoutAiModeration === true ? { savedWithoutAiModeration: true as const } : {}),
      status: (data.status as LeadStatus) ?? 'pending',
      createdAt: data.createdAt?.toDate?.() ?? new Date(),
      updatedAt: data.updatedAt?.toDate?.() ?? new Date()
    };
  });
}

export async function updateLeadStatus(
  id: string,
  status: LeadStatus
): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, { status, updatedAt: Timestamp.now() });
}
