import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut,
  type ConfirmationResult,
  type UserCredential,
} from 'firebase/auth';
import { auth } from '../../firebase';
import { normalizePhone } from '../utils/authInputUtils';
import { isCapacitorRuntime } from '../utils/firestoreRest';
import { withTimeout } from '../utils/withTimeout';

/** No iOS/Android o RecaptchaVerifier do SDK web não carrega (auth/internal-error). */
export function shouldSkipFirebasePhoneOtp(): boolean {
  return isCapacitorRuntime();
}

/** Container do widget (docs do Firebase usam o id em string, não o HTMLElement). */
export const RECAPTCHA_CONTAINER_ID = 'delivery-phone-recaptcha';

let recaptchaVerifier: RecaptchaVerifier | null = null;
let recaptchaReady: Promise<RecaptchaVerifier> | null = null;
let sendInFlight: Promise<ConfirmationResult> | null = null;

function enableTestModeIfConfigured(): void {
  // Nunca no Capacitor/TestFlight: isso gera auth/internal-error em produção.
  if (isCapacitorRuntime()) return;
  const flag = (import.meta as ImportMeta & { env?: Record<string, string> }).env
    ?.VITE_FIREBASE_PHONE_TEST_MODE;
  if (flag === 'true' || flag === '1') {
    auth.settings.appVerificationDisabledForTesting = true;
  }
}

export function clearPhoneRecaptcha(): void {
  recaptchaReady = null;
  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear();
    } catch {
      // ignore
    }
    recaptchaVerifier = null;
  }
  const el = document.getElementById(RECAPTCHA_CONTAINER_ID);
  if (el) el.innerHTML = '';
}

/**
 * Cria o RecaptchaVerifier no id fixo do DOM e espera o render.
 * Invisible no WKWebView do iOS causa auth/internal-error — usar widget visível.
 */
export async function preparePhoneRecaptcha(): Promise<RecaptchaVerifier> {
  enableTestModeIfConfigured();
  auth.languageCode = 'pt-BR';

  if (recaptchaVerifier) return recaptchaVerifier;
  if (recaptchaReady) return recaptchaReady;

  recaptchaReady = (async () => {
    const el = document.getElementById(RECAPTCHA_CONTAINER_ID);
    if (!el) {
      throw new Error('Container do reCAPTCHA não encontrado na página.');
    }

    const verifier = new RecaptchaVerifier(auth, RECAPTCHA_CONTAINER_ID, {
      size: 'normal',
      callback: () => {},
      'expired-callback': () => {
        clearPhoneRecaptcha();
      },
    });
    recaptchaVerifier = verifier;
    await withTimeout(verifier.render(), 20000, 'carregamento do reCAPTCHA');
    return verifier;
  })();

  try {
    return await recaptchaReady;
  } catch (error) {
    recaptchaReady = null;
    recaptchaVerifier = null;
    throw error;
  }
}

export async function sendPhoneOtp(phone: string): Promise<ConfirmationResult> {
  const e164 = normalizePhone(phone);
  if (!e164 || e164.length < 10) {
    throw new Error('Telefone inválido para envio de SMS.');
  }

  if (sendInFlight) {
    try {
      await sendInFlight;
    } catch {
      // nova tentativa
    }
  }

  const run = (async (): Promise<ConfirmationResult> => {
    const verifier = await preparePhoneRecaptcha();
    try {
      return await withTimeout(
        signInWithPhoneNumber(auth, e164, verifier),
        25000,
        'envio do SMS'
      );
    } catch (error) {
      clearPhoneRecaptcha();
      throw error;
    }
  })();

  sendInFlight = run;
  try {
    return await run;
  } finally {
    if (sendInFlight === run) sendInFlight = null;
  }
}

export async function confirmPhoneOtp(
  confirmation: ConfirmationResult,
  code: string
): Promise<UserCredential> {
  const trimmed = code.replace(/\s/g, '');
  if (!/^\d{6}$/.test(trimmed)) {
    throw new Error('Informe o código de 6 dígitos enviado por SMS.');
  }
  return withTimeout(confirmation.confirm(trimmed), 20000, 'confirmação do código');
}

export async function signOutPhoneAuth(): Promise<void> {
  clearPhoneRecaptcha();
  await signOut(auth);
}

export function mapPhoneAuthError(error: unknown): string {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';
  const message =
    error instanceof Error
      ? error.message
      : error && typeof error === 'object' && 'message' in error
        ? String((error as { message: unknown }).message)
        : '';

  if (/already been rendered/i.test(message)) {
    return 'Falha na verificação de segurança. Feche e abra o app e tente de novo.';
  }
  if (/Timeout/i.test(message) || /Tempo esgotado/i.test(message)) {
    return 'A verificação demorou demais. Marque “Não sou um robô” e tente enviar o código de novo.';
  }

  switch (code) {
    case 'auth/internal-error':
      return [
        'O iOS bloqueou o reCAPTCHA do Firebase (auth/internal-error).',
        'Marque a caixa “Não sou um robô” e tente de novo.',
        'Se persistir: no Console Firebase → Authentication → Settings → Authorized domains,',
        'precisa existir gourmet-9ebe6.firebaseapp.com (domínio padrão do projeto).',
      ].join(' ');
    case 'auth/invalid-app-credential':
      if (isCapacitorRuntime()) {
        return [
          'O Firebase recusou o reCAPTCHA no app (auth/invalid-app-credential).',
          'No Console → Authentication → Settings → Authorized domains, inclua gourmet-9ebe6.firebaseapp.com.',
          'Confirme Phone Auth ativo e a política de SMS com o Brasil (BR).',
        ].join(' ');
      }
      return [
        'O Firebase recusou o reCAPTCHA (auth/invalid-app-credential).',
        'No Console: Phone ATIVO, Authorized domains com localhost, SMS region BR.',
      ].join(' ');
    case 'auth/invalid-phone-number':
      return 'Número de telefone inválido. Confira DDI + DDD + número.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
    case 'auth/quota-exceeded':
      return 'Limite de SMS atingido. Plano Blaze é necessário para SMS reais.';
    case 'auth/invalid-verification-code':
      return 'Código inválido. Verifique o SMS e tente novamente.';
    case 'auth/code-expired':
    case 'auth/session-expired':
      return 'Código expirado. Solicite um novo código.';
    case 'auth/captcha-check-failed':
    case 'auth/missing-client-identifier':
      return 'Falha no reCAPTCHA. Marque a caixa “Não sou um robô” e tente de novo.';
    case 'auth/operation-not-allowed':
      return 'Phone Authentication não está habilitado. Ative em Authentication → Sign-in method → Phone.';
    case 'auth/admin-restricted-operation':
      return 'SMS bloqueado pela política de regiões. Em Authentication → Settings → SMS region policy, permita o Brasil (BR).';
    case 'auth/network-request-failed':
      return 'Falha de rede. Verifique sua conexão e tente novamente.';
    default:
      if (message) return message;
      return 'Não foi possível verificar o telefone. Tente novamente.';
  }
}
