/**
 * Utilitários para campo de login que aceita email ou telefone:
 * detecção, máscara internacional, validação e normalização.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Verifica se o valor parece um e-mail válido */
export function isEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}

/** Extrai apenas dígitos do valor (e opcionalmente um + no início) */
function digitsAndPlus(value: string): string {
  const trimmed = value.trim();
  let result = '';
  for (let i = 0; i < trimmed.length; i++) {
    const c = trimmed[i];
    if (c === '+' && result === '') result += '+';
    else if (/\d/.test(c)) result += c;
  }
  return result;
}

/**
 * Verifica se o valor parece um telefone (apenas + e dígitos, comprimento mínimo).
 * Não exige + no início para aceitar entradas como 11999999999.
 */
export function looksLikePhone(value: string): boolean {
  const normalized = digitsAndPlus(value);
  const digitsOnly = normalized.replace(/^\+/, '');
  if (digitsOnly.length < 8) return false;
  if (digitsOnly.length > 15) return false;
  if (value.trim().includes('@')) return false;
  return /^\+?\d{8,15}$/.test(normalized);
}

/**
 * Normaliza telefone para formato E.164 (apenas + e dígitos).
 * Usado para persistência e busca no backend.
 */
export function normalizePhone(value: string): string {
  const d = value.replace(/\D/g, '');
  if (d.length === 0) return '';
  return '+' + d;
}

/**
 * Aplica máscara de telefone ao digitar: permite apenas + (no início) e dígitos.
 * Retorna o valor já filtrado (e opcionalmente formatado para exibição).
 */
export function applyPhoneMaskInput(raw: string): string {
  let hasPlus = false;
  let digits = '';
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c === '+') {
      if (i === 0) hasPlus = true;
      continue;
    }
    if (/\d/.test(c)) digits += c;
  }
  const maxDigits = 15;
  digits = digits.slice(0, maxDigits);
  return (hasPlus ? '+' : '') + digits;
}

/**
 * Formata telefone para exibição (espaços a cada 2–3 dígitos após o +).
 * Ex.: +55 11 99999 9999
 */
export function formatPhoneDisplay(normalized: string): string {
  const s = normalized.trim();
  if (!s || s === '+') return s;
  const d = s.replace(/\D/g, '');
  if (d.length === 0) return s.startsWith('+') ? '+' : '';
  const withPlus = s.startsWith('+') ? '+' + d : d;
  const digits = withPlus.replace(/^\+/, '');
  const parts: string[] = [];
  let i = 0;
  if (withPlus.startsWith('+')) {
    parts.push('+');
    i = 0;
  }
  if (digits.length <= 3) {
    return (withPlus.startsWith('+') ? '+' : '') + digits;
  }
  parts.push(digits.slice(0, 2));
  i = 2;
  while (i < digits.length) {
    const chunk = digits.slice(i, i + (digits.length - i >= 5 ? 5 : 4));
    if (chunk) parts.push(chunk);
    i += chunk.length;
  }
  return parts.join(' ').replace(/^\+\s/, '+');
}

export type EmailOrPhoneValidation =
  | { valid: true; kind: 'email' | 'phone'; normalized: string }
  | { valid: false; kind: null; error: string };

/**
 * Valida o valor do campo "email ou telefone" e retorna resultado tipado.
 */
export function validateEmailOrPhone(value: string): EmailOrPhoneValidation {
  const trimmed = value.trim();
  if (!trimmed) {
    return { valid: false, kind: null, error: 'Informe seu email ou telefone.' };
  }
  if (isEmail(trimmed)) {
    return { valid: true, kind: 'email', normalized: trimmed.toLowerCase() };
  }
  const phoneNormalized = applyPhoneMaskInput(trimmed);
  const normalized = normalizePhone(phoneNormalized);
  const digitsOnly = normalized.replace(/^\+/, '');
  if (digitsOnly.length < 8) {
    return { valid: false, kind: null, error: 'Telefone deve ter pelo menos 8 dígitos.' };
  }
  if (digitsOnly.length > 15) {
    return { valid: false, kind: null, error: 'Telefone inválido.' };
  }
  if (!/^\+?\d{8,15}$/.test(phoneNormalized || normalized)) {
    return { valid: false, kind: null, error: 'Formato de telefone inválido. Use + e números.' };
  }
  return { valid: true, kind: 'phone', normalized };
}

/**
 * Retorna o tipo de entrada atual (email, phone ou empty) para UX (placeholder, ícone, etc.).
 */
export function getInputKind(value: string): 'email' | 'phone' | 'empty' {
  const t = value.trim();
  if (!t) return 'empty';
  if (t.includes('@')) return 'email';
  if (/^\+?\d/.test(t) && /^[\d+\s\-()]*$/.test(t)) return 'phone';
  return 'email';
}
