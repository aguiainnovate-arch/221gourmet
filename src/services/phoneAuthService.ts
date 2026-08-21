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

/** Container do widget (docs do Firebase usam o id em string, não o HTMLElement). */
export const RECAPTCHA_CONTAINER_ID = 'delivery-phone-recaptcha';

let recaptchaVerifier: RecaptchaVerifier | null = null;
let sendInFlight: Promise<ConfirmationResult> | null = null;

function enableTestModeIfConfigured(): void {
  const flag = (import.meta as ImportMeta & { env?: Record<string, string> }).env
    ?.VITE_FIREBASE_PHONE_TEST_MODE;
  if (flag === 'true' || flag === '1') {
    auth.settings.appVerificationDisabledForTesting = true;
  }
}

export function clearPhoneRecaptcha(): void {
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
 * Cria o RecaptchaVerifier no id fixo do DOM.
 * Não passar HTMLElement: o SDK web espera o id string.
 */
export function preparePhoneRecaptcha(): RecaptchaVerifier {
  enableTestModeIfConfigured();
  auth.languageCode = 'pt-BR';

  if (recaptchaVerifier) return recaptchaVerifier;

  const el = document.getElementById(RECAPTCHA_CONTAINER_ID);
  if (!el) {
    throw new Error('Container do reCAPTCHA não encontrado na página.');
  }

  // No Capacitor, widget visível costuma falhar no WKWebView.
  recaptchaVerifier = new RecaptchaVerifier(auth, RECAPTCHA_CONTAINER_ID, {
    size: isCapacitorRuntime() ? 'invisible' : 'normal',
    callback: () => {},
    'expired-callback': () => {},
  });

  return recaptchaVerifier;
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
    const verifier = preparePhoneRecaptcha();
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
    return 'Falha na verificação de segurança. Recarregue a página (Ctrl+F5) e tente de novo.';
  }

  switch (code) {
    case 'auth/invalid-app-credential':
      if (isCapacitorRuntime()) {
        return [
          'O Firebase recusou o reCAPTCHA no app (auth/invalid-app-credential).',
          'No Console → Authentication → Settings → Authorized domains, inclua localhost.',
          'Confirme Phone Auth ativo e use número de teste se necessário.',
        ].join(' ');
      }
      return [
        'O Firebase recusou o reCAPTCHA (auth/invalid-app-credential). Isso é configuração do projeto, não do formulário.',
        'No Console: 1) Authentication → Sign-in method → Phone ATIVO.',
        '2) Settings → Authorized domains: localhost e 127.0.0.1.',
        '3) Settings → SMS region policy: permitir Brasil (BR). Projetos novos bloqueiam todos os países.',
        '4) Abra o app em http://127.0.0.1:5173 (não só localhost).',
        '5) Para testar sem SMS real: Phone → Phone numbers for testing (ex. +5511999999999 / 123456).',
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
      return 'Falha no reCAPTCHA. Marque a caixa e tente de novo.';
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
