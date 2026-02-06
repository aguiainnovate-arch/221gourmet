import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { db } from '../../firebase';

export interface Area {
  id: string;
  restaurantId: string;
  nome: string;
  ordem: number;
  createdAt: Date;
}

export const addArea = async (restaurantId: string, nome: string, ordem?: number): Promise<Area> => {
  try {
    const now = new Date();
    const docRef = await addDoc(collection(db, 'areas'), {
      restaurantId,
      nome: nome.trim(),
      ordem: ordem ?? 0,
      createdAt: now
    });
    return {
      id: docRef.id,
      restaurantId,
      nome: nome.trim(),
      ordem: ordem ?? 0,
      createdAt: now
    };
  } catch (error) {
    console.error('Erro ao adicionar área:', error);
    throw new Error('Falha ao adicionar área');
  }
};

export const getAreas = async (restaurantId: string): Promise<Area[]> => {
  try {
    const q = query(
      collection(db, 'areas'),
      where('restaurantId', '==', restaurantId),
      orderBy('ordem')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        restaurantId: data.restaurantId,
        nome: data.nome,
        ordem: data.ordem ?? 0,
        createdAt: data.createdAt?.toDate?.() ?? new Date()
      };
    });
  } catch (error) {
    try {
      const q = query(collection(db, 'areas'), where('restaurantId', '==', restaurantId));
      const snapshot = await getDocs(q);
      const areas = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          restaurantId: data.restaurantId,
          nome: data.nome,
          ordem: data.ordem ?? 0,
          createdAt: data.createdAt?.toDate?.() ?? new Date()
        };
      });
      areas.sort((a, b) => a.ordem - b.ordem);
      return areas;
    } catch (e2) {
      console.error('Erro ao buscar áreas:', e2);
      throw new Error('Falha ao buscar áreas');
    }
  }
};

export const updateArea = async (id: string, updates: { nome?: string; ordem?: number }): Promise<void> => {
  try {
    await updateDoc(doc(db, 'areas', id), updates);
  } catch (error) {
    console.error('Erro ao atualizar área:', error);
    throw new Error('Falha ao atualizar área');
  }
};

export const deleteArea = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'areas', id));
  } catch (error) {
    console.error('Erro ao remover área:', error);
    throw new Error('Falha ao remover área');
  }
};
