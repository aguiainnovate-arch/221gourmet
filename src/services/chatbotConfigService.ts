import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { getFirestoreDocument, isCapacitorRuntime } from '../utils/firestoreRest';

export interface ChatbotConfig {
  greeting: string;
  tone: 'friendly' | 'professional' | 'enthusiastic';
  showCardsThreshold: 'conservative' | 'balanced' | 'eager';
  customRules: string;
  updatedAt?: Date;
}

const CHATBOT_CONFIG_DOC_ID = 'global-chatbot-config';

const DEFAULT_CONFIG: ChatbotConfig = {
  greeting:
    'Olá! 👋 Sou seu assistente virtual. Como posso te ajudar a encontrar o restaurante perfeito hoje?',
  tone: 'friendly',
  showCardsThreshold: 'conservative',
  customRules: '',
};

function mapConfig(data: Record<string, unknown>): ChatbotConfig {
  return {
    greeting: String(data.greeting ?? DEFAULT_CONFIG.greeting),
    tone: (data.tone as ChatbotConfig['tone']) || DEFAULT_CONFIG.tone,
    showCardsThreshold:
      (data.showCardsThreshold as ChatbotConfig['showCardsThreshold']) ||
      DEFAULT_CONFIG.showCardsThreshold,
    customRules: String(data.customRules ?? DEFAULT_CONFIG.customRules),
    updatedAt:
      data.updatedAt instanceof Date
        ? data.updatedAt
        : data.updatedAt && typeof (data.updatedAt as { toDate?: () => Date }).toDate === 'function'
          ? (data.updatedAt as { toDate: () => Date }).toDate()
          : undefined,
  };
}

export const saveChatbotConfig = async (config: ChatbotConfig): Promise<void> => {
  try {
    const docRef = doc(db, 'settings', CHATBOT_CONFIG_DOC_ID);
    await setDoc(docRef, {
      ...config,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error('Erro ao salvar configuração do chatbot:', error);
    throw new Error('Falha ao salvar configuração do chatbot');
  }
};

export const getChatbotConfig = async (): Promise<ChatbotConfig> => {
  try {
    if (isCapacitorRuntime()) {
      try {
        const snap = await getFirestoreDocument('settings', CHATBOT_CONFIG_DOC_ID);
        if (snap) return mapConfig(snap.data);
      } catch (error) {
        console.warn('Chatbot config REST falhou; usando default', error);
      }
      return DEFAULT_CONFIG;
    }

    const docSnap = await getDoc(doc(db, 'settings', CHATBOT_CONFIG_DOC_ID));
    if (docSnap.exists()) return mapConfig(docSnap.data() as Record<string, unknown>);
    return DEFAULT_CONFIG;
  } catch (error) {
    console.error('Erro ao carregar configuração do chatbot:', error);
    return DEFAULT_CONFIG;
  }
};

export const resetChatbotConfig = async (): Promise<void> => {
  await saveChatbotConfig(DEFAULT_CONFIG);
};
