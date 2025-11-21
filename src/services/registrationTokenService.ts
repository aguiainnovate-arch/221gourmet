import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  doc, 
  query, 
  where,
  Timestamp,
  orderBy,
  limit,
  getDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../../firebase';
import type { 
  RegistrationToken, 
  CreateRegistrationTokenData,
  ValidateTokenResult 
} from '../types/registrationToken';

// Gerar um token único
const generateUniqueToken = (): string => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${randomStr}`;
};

// Criar novo token de registro
export const createRegistrationToken = async (
  tokenData: CreateRegistrationTokenData,
  createdBy: string = 'admin'
): Promise<RegistrationToken> => {
  try {
    const sanitizedMetadata = tokenData.metadata
      ? Object.entries(tokenData.metadata).reduce<Record<string, string>>((acc, [key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            acc[key] = value;
          }
          return acc;
        }, {})
      : undefined;

    const token = generateUniqueToken();
    const expiresIn = tokenData.expiresIn || 7; // 7 dias padrão
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresIn);

    const docRef = await addDoc(collection(db, 'registrationTokens'), {
      token,
      planId: tokenData.planId,
      expiresAt: Timestamp.fromDate(expiresAt),
      used: false,
      createdAt: Timestamp.now(),
      createdBy,
      ...(sanitizedMetadata ? { metadata: sanitizedMetadata } : {})
    });

    return {
      id: docRef.id,
      token,
      planId: tokenData.planId,
      expiresAt,
      used: false,
      createdAt: new Date(),
      createdBy,
      metadata: sanitizedMetadata
    };
  } catch (error: any) {
    console.error('Erro ao criar token de registro:', error);
    console.error('Detalhes do erro:', {
      code: error?.code,
      message: error?.message,
      details: error
    });
    throw new Error(`Falha ao criar token de registro: ${error?.message || 'Erro desconhecido'}`);
  }
};

// Buscar todos os tokens (com paginação opcional)
export const getRegistrationTokens = async (limitCount?: number): Promise<RegistrationToken[]> => {
  try {
    let q = query(
      collection(db, 'registrationTokens'), 
      orderBy('createdAt', 'desc')
    );
    
    if (limitCount) {
      q = query(q, limit(limitCount));
    }
    
    const querySnapshot = await getDocs(q);
    
    const tokens: RegistrationToken[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      tokens.push({
        id: doc.id,
        token: data.token,
        planId: data.planId,
        planName: data.planName,
        expiresAt: data.expiresAt?.toDate() || new Date(),
        used: data.used || false,
        usedAt: data.usedAt?.toDate(),
        restaurantId: data.restaurantId,
        createdAt: data.createdAt?.toDate() || new Date(),
        createdBy: data.createdBy || 'unknown',
        metadata: data.metadata
      });
    });

    return tokens;
  } catch (error) {
    console.error('Erro ao buscar tokens:', error);
    throw new Error('Falha ao buscar tokens');
  }
};

// Buscar tokens ativos (não usados e não expirados)
export const getActiveTokens = async (): Promise<RegistrationToken[]> => {
  try {
    const now = Timestamp.now();
    const q = query(
      collection(db, 'registrationTokens'),
      where('used', '==', false),
      where('expiresAt', '>', now),
      orderBy('expiresAt', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    
    const tokens: RegistrationToken[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      tokens.push({
        id: doc.id,
        token: data.token,
        planId: data.planId,
        planName: data.planName,
        expiresAt: data.expiresAt?.toDate() || new Date(),
        used: data.used || false,
        usedAt: data.usedAt?.toDate(),
        restaurantId: data.restaurantId,
        createdAt: data.createdAt?.toDate() || new Date(),
        createdBy: data.createdBy || 'unknown',
        metadata: data.metadata
      });
    });

    return tokens;
  } catch (error) {
    console.error('Erro ao buscar tokens ativos:', error);
    throw new Error('Falha ao buscar tokens ativos');
  }
};

// Validar token (para uso na página de registro)
export const validateToken = async (token: string): Promise<ValidateTokenResult> => {
  try {
    const q = query(
      collection(db, 'registrationTokens'),
      where('token', '==', token),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return {
        valid: false,
        error: 'Token não encontrado'
      };
    }

    const tokenDoc = querySnapshot.docs[0];
    const data = tokenDoc.data();
    
    const tokenData: RegistrationToken = {
      id: tokenDoc.id,
      token: data.token,
      planId: data.planId,
      planName: data.planName,
      expiresAt: data.expiresAt?.toDate() || new Date(),
      used: data.used || false,
      usedAt: data.usedAt?.toDate(),
      restaurantId: data.restaurantId,
      createdAt: data.createdAt?.toDate() || new Date(),
      createdBy: data.createdBy || 'unknown',
      metadata: data.metadata
    };

    // Verificar se já foi usado
    if (tokenData.used) {
      return {
        valid: false,
        token: tokenData,
        error: 'Token já foi utilizado'
      };
    }

    // Verificar se expirou
    if (tokenData.expiresAt < new Date()) {
      return {
        valid: false,
        token: tokenData,
        error: 'Token expirado'
      };
    }

    return {
      valid: true,
      token: tokenData
    };
  } catch (error) {
    console.error('Erro ao validar token:', error);
    return {
      valid: false,
      error: 'Erro ao validar token'
    };
  }
};

// Marcar token como usado
export const markTokenAsUsed = async (
  tokenId: string, 
  restaurantId: string
): Promise<void> => {
  try {
    const tokenRef = doc(db, 'registrationTokens', tokenId);
    await updateDoc(tokenRef, {
      used: true,
      usedAt: Timestamp.now(),
      restaurantId
    });
  } catch (error) {
    console.error('Erro ao marcar token como usado:', error);
    throw new Error('Falha ao marcar token como usado');
  }
};

// Invalidar token (marcar como usado sem restaurante associado)
export const invalidateToken = async (tokenId: string): Promise<void> => {
  try {
    const tokenRef = doc(db, 'registrationTokens', tokenId);
    await updateDoc(tokenRef, {
      used: true,
      usedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Erro ao invalidar token:', error);
    throw new Error('Falha ao invalidar token');
  }
};

// Buscar token por ID
export const getTokenById = async (tokenId: string): Promise<RegistrationToken | null> => {
  try {
    const tokenRef = doc(db, 'registrationTokens', tokenId);
    const tokenDoc = await getDoc(tokenRef);
    
    if (!tokenDoc.exists()) {
      return null;
    }

    const data = tokenDoc.data();
    return {
      id: tokenDoc.id,
      token: data.token,
      planId: data.planId,
      planName: data.planName,
      expiresAt: data.expiresAt?.toDate() || new Date(),
      used: data.used || false,
      usedAt: data.usedAt?.toDate(),
      restaurantId: data.restaurantId,
      createdAt: data.createdAt?.toDate() || new Date(),
      createdBy: data.createdBy || 'unknown',
      metadata: data.metadata
    };
  } catch (error) {
    console.error('Erro ao buscar token por ID:', error);
    return null;
  }
};

// Gerar URL completa do link de registro
export const generateRegistrationUrl = (token: string, baseUrl?: string): string => {
  const base = baseUrl || window.location.origin;
  return `${base}/register/${token}`;
};

// Deletar token de registro
export const deleteRegistrationToken = async (tokenId: string): Promise<void> => {
  try {
    const tokenRef = doc(db, 'registrationTokens', tokenId);
    await deleteDoc(tokenRef);
  } catch (error) {
    console.error('Erro ao deletar token:', error);
    throw new Error('Falha ao deletar token');
  }
};

