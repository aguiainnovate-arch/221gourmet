import { collection, addDoc, getDocs, getDoc, updateDoc, doc, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import type { DeliveryUser, CreateDeliveryUserData } from '../types/deliveryUser';

// Criar ou atualizar usuário de delivery
export const saveDeliveryUser = async (userData: CreateDeliveryUserData): Promise<DeliveryUser> => {
  try {
    // Verificar se já existe usuário com este email ou telefone
    const emailQuery = query(collection(db, 'deliveryUsers'), where('email', '==', userData.email));
    const phoneQuery = query(collection(db, 'deliveryUsers'), where('phone', '==', userData.phone));
    
    const [emailSnapshot, phoneSnapshot] = await Promise.all([
      getDocs(emailQuery),
      getDocs(phoneQuery)
    ]);

    const existingUserByEmail = emailSnapshot.docs[0];
    const existingUserByPhone = phoneSnapshot.docs[0];
    const existingUser = existingUserByEmail || existingUserByPhone;

    if (existingUser) {
      // Atualizar usuário existente
      const userRef = doc(db, 'deliveryUsers', existingUser.id);
      await updateDoc(userRef, {
        ...userData,
        updatedAt: Timestamp.now()
      });

      return {
        id: existingUser.id,
        ...userData,
        createdAt: existingUser.data().createdAt?.toDate() || new Date(),
        updatedAt: new Date()
      };
    } else {
      // Criar novo usuário
      const docRef = await addDoc(collection(db, 'deliveryUsers'), {
        ...userData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      return {
        id: docRef.id,
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
  } catch (error) {
    console.error('Erro ao salvar usuário de delivery:', error);
    throw new Error('Falha ao salvar informações do usuário');
  }
};

// Buscar usuário por email
export const getDeliveryUserByEmail = async (email: string): Promise<DeliveryUser | null> => {
  try {
    const q = query(collection(db, 'deliveryUsers'), where('email', '==', email));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();
    
    return {
      id: doc.id,
      email: data.email,
      phone: data.phone,
      name: data.name,
      address: data.address,
      defaultPaymentMethod: data.defaultPaymentMethod,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date()
    };
  } catch (error) {
    console.error('Erro ao buscar usuário de delivery:', error);
    return null;
  }
};

// Buscar usuário por telefone
export const getDeliveryUserByPhone = async (phone: string): Promise<DeliveryUser | null> => {
  try {
    const q = query(collection(db, 'deliveryUsers'), where('phone', '==', phone));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();
    
    return {
      id: doc.id,
      email: data.email,
      phone: data.phone,
      name: data.name,
      address: data.address,
      defaultPaymentMethod: data.defaultPaymentMethod,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date()
    };
  } catch (error) {
    console.error('Erro ao buscar usuário de delivery:', error);
    return null;
  }
};

// Buscar usuário por ID
export const getDeliveryUserById = async (userId: string): Promise<DeliveryUser | null> => {
  try {
    const userRef = doc(db, 'deliveryUsers', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return null;
    }

    const data = userSnap.data();
    
    return {
      id: userSnap.id,
      email: data.email,
      phone: data.phone,
      name: data.name,
      address: data.address,
      defaultPaymentMethod: data.defaultPaymentMethod,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date()
    };
  } catch (error) {
    console.error('Erro ao buscar usuário de delivery:', error);
    return null;
  }
};

