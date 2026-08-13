import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut,
  type ConfirmationResult,
  type UserCredential,
} from 'firebase/auth';
import { auth } from '../../firebase';
import { normalizePhone } from '../utils/authInputUtils';

export const RECAPTCHA_CONTAINER_ID = 'delivery-phone-recaptcha';

let recaptchaVerifier: RecaptchaVerifier | null = null;

/** Remove o reCAPTCHA atual (necessário antes de reenviar SMS). */
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

function ensureRecaptchaContainer(): void {
  let el = document.getElementById(RECAPTCHA_CONTAINER_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = RECAPTCHA_CONTAINER_ID;
    el.setAttribute('aria-hidden', 'true');
    el.style.display = 'none';
    document.body.appendChild(el);
  }
}

function getOrCreateRecaptcha(): RecaptchaVerifier {
  ensureRecaptchaContainer();
  if (recaptchaVerifier) return recaptchaVerifier;

  recaptchaVerifier = new RecaptchaVerifier(auth, RECAPTCHA_CONTAINER_ID, {
    size: 'invisible',
    callback: () => {
      // resolvido automaticamente no fluxo invisible
    },
    'expired-callback': () => {
      clearPhoneRecaptcha();
    },
  });

  return recaptchaVerifier;
}

/**
 * Envia SMS com código OTP via Firebase Phone Auth.
 * `phone` deve estar em E.164 (ex.: +5511999999999).
 */
export async function sendPhoneOtp(phone: string): Promise<ConfirmationResult> {
  const e164 = normalizePhone(phone);
  if (!e164 || e164.length < 10) {
    throw new Error('Telefone inválido para envio de SMS.');
  }

  clearPhoneRecaptcha();
  const verifier = getOrCreateRecaptcha();
  await verifier.render();
  return signInWithPhoneNumber(auth, e164, verifier);
}

/** Confirma o código digitado pelo usuário e autentica no Firebase Auth. */
export async function confirmPhoneOtp(
  confirmation: ConfirmationResult,
  code: string
): Promise<UserCredential> {
  const trimmed = code.replace(/\s/g, '');
  if (!/^\d{6}$/.test(trimmed)) {
    throw new Error('Informe o código de 6 dígitos enviado por SMS.');
  }
  return confirmation.confirm(trimmed);
}

export async function signOutPhoneAuth(): Promise<void> {
  clearPhoneRecaptcha();
  await signOut(auth);
}

/** Mensagens amigáveis para erros comuns do Phone Auth. */
export function mapPhoneAuthError(error: unknown): string {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';

  switch (code) {
    case 'auth/invalid-phone-number':
      return 'Número de telefone inválido. Use o formato internacional (+55…).';
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
    case 'auth/quota-exceeded':
      return 'Limite de SMS atingido. Tente novamente mais tarde.';
    case 'auth/invalid-verification-code':
      return 'Código inválido. Verifique o SMS e tente novamente.';
    case 'auth/code-expired':
      return 'Código expirado. Solicite um novo código.';
    case 'auth/session-expired':
      return 'Sessão expirada. Solicite um novo código.';
    case 'auth/captcha-check-failed':
      return 'Falha na verificação de segurança. Recarregue a página e tente de novo.';
    case 'auth/missing-client-identifier':
      return 'reCAPTCHA não configurado. Recarregue a página e tente de novo.';
    case 'auth/operation-not-allowed':
      return 'Login por telefone não está habilitado no Firebase. Ative Phone Authentication no Console.';
    case 'auth/network-request-failed':
      return 'Falha de rede. Verifique sua conexão e tente novamente.';
    default: {
      if (error instanceof Error && error.message) return error.message;
      return 'Não foi possível verificar o telefone. Tente novamente.';
    }
  }
}
