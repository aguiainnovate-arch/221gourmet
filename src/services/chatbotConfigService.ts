import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';

export interface ChatbotConfig {
  greeting: string;
  tone: 'friendly' | 'professional' | 'enthusiastic';
  showCardsThreshold: 'conservative' | 'balanced' | 'eager';
  customRules: string;
  updatedAt?: Date;
}

const CHATBOT_CONFIG_DOC_ID = 'global-chatbot-config';

// Configuração padrão
const DEFAULT_CONFIG: ChatbotConfig = {
  greeting: 'Olá! 👋 Sou seu assistente virtual. Como posso te ajudar a encontrar o restaurante perfeito hoje?',
  tone: 'friendly',
  showCardsThreshold: 'conservative',
  customRules: ''
};

/**
 * Salvar configuração do chatbot no Firestore
 */
export const saveChatbotConfig = async (config: ChatbotConfig): Promise<void> => {
  try {
    const docRef = doc(db, 'settings', CHATBOT_CONFIG_DOC_ID);
    await setDoc(docRef, {
      ...config,
      updatedAt: new Date()
    });
    console.log('✅ Configuração do chatbot salva no Firestore');
  } catch (error) {
    console.error('❌ Erro ao salvar configuração do chatbot:', error);
    throw new Error('Falha ao salvar configuração do chatbot');
  }
};

/**
 * Carregar configuração do chatbot do Firestore
 */
export const getChatbotConfig = async (): Promise<ChatbotConfig> => {
  try {
    const docRef = doc(db, 'settings', CHATBOT_CONFIG_DOC_ID);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        greeting: data.greeting || DEFAULT_CONFIG.greeting,
        tone: data.tone || DEFAULT_CONFIG.tone,
        showCardsThreshold: data.showCardsThreshold || DEFAULT_CONFIG.showCardsThreshold,
        customRules: data.customRules || DEFAULT_CONFIG.customRules,
        updatedAt: data.updatedAt?.toDate()
      };
    } else {
      console.log('ℹ️ Configuração não encontrada, usando padrão');
      return DEFAULT_CONFIG;
    }
  } catch (error) {
    console.error('❌ Erro ao carregar configuração do chatbot:', error);
    // Retornar configuração padrão em caso de erro
    return DEFAULT_CONFIG;
  }
};

/**
 * Resetar configuração para padrão
 */
export const resetChatbotConfig = async (): Promise<void> => {
  try {
    await saveChatbotConfig(DEFAULT_CONFIG);
    console.log('✅ Configuração resetada para padrão');
  } catch (error) {
    console.error('❌ Erro ao resetar configuração:', error);
    throw new Error('Falha ao resetar configuração');
  }
};

