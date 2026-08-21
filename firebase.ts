// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { Capacitor } from "@capacitor/core";

// Configuração lida de variáveis de ambiente (.env)
// Em ambiente Node (scripts com tsx) usa process.env; no browser usa import.meta.env
const getEnv = (key: string): string =>
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.[key]) ||
  (typeof process !== 'undefined' && process.env?.[key]) ||
  '';

const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY'),
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('VITE_FIREBASE_APP_ID'),
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth (Phone OTP / SMS para clientes delivery)
export const auth = getAuth(app);

auth.languageCode = 'pt-BR';

function isNativeApp(): boolean {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_CAPACITOR_BUILD === 'true') {
    return true;
  }
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * WKWebView do Capacitor quebra o WebChannel do Firestore (listen/channel).
 * Force long polling no binário nativo — detectado no build (VITE_CAPACITOR_BUILD),
 * não só em runtime (isNativePlatform() pode ser false na importação do módulo).
 */
function createFirestore() {
  if (isNativeApp()) {
    return initializeFirestore(app, {
      experimentalForceLongPolling: true,
    });
  }
  return getFirestore(app);
}

export const db = createFirestore();

// Initialize Firebase Storage
export const storage = getStorage(app);

// Initialize Firebase Functions
export const functions = getFunctions(app, 'us-central1');

// Em dev, conecta ao emulador local se VITE_USE_FUNCTIONS_EMULATOR=true
if (
  typeof import.meta !== 'undefined' &&
  (import.meta as any).env?.DEV &&
  (import.meta as any).env?.VITE_USE_FUNCTIONS_EMULATOR === 'true'
) {
  connectFunctionsEmulator(functions, 'localhost', 5001);
}

export default app;
