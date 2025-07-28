import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../../firebase';

export interface Table {
  id: string;
  numero: string;
  createdAt: Date;
}

// Adicionar nova mesa
export const addTable = async (numero: string): Promise<Table> => {
  try {
    const docRef = await addDoc(collection(db, 'tables'), {
      numero: numero,
      createdAt: new Date()
    });

    return {
      id: docRef.id,
      numero: numero,
      createdAt: new Date()
    };
  } catch (error) {
    throw new Error('Falha ao adicionar mesa');
  }
};

// Buscar todas as mesas
export const getTables = async (): Promise<Table[]> => {
  try {
    const q = query(collection(db, 'tables'), orderBy('numero'));
    const querySnapshot = await getDocs(q);
    
    const tables: Table[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      tables.push({
        id: doc.id,
        numero: data.numero,
        createdAt: data.createdAt.toDate()
      });
    });

    return tables;
  } catch (error) {
    throw new Error('Falha ao buscar mesas');
  }
};

// Remover mesa
export const deleteTable = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'tables', id));
  } catch (error) {
    throw new Error('Falha ao remover mesa');
  }
};

// Gerar URL da mesa
export const generateTableUrl = (numero: string): string => {
  //return `http://localhost:5173/mesa/${numero}`;
  return `https://golden-gelato-091b37.netlify.app/mesa/${numero}`;
  
}; 