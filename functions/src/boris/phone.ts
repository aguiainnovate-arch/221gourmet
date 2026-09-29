/** Mesma regra de src/utils/authInputUtils.normalizePhone, com prefixo whatsapp: removido. */

export function stripWhatsAppPrefix(value: string): string {
  return value.replace(/^whatsapp:/i, '').trim();
}

export function normalizePhone(value: string): string {
  const d = stripWhatsAppPrefix(value).replace(/\D/g, '');
  if (d.length === 0) return '';
  if (d.startsWith('55') && d.length >= 12 && d.length <= 13) return `+${d}`;
  if (d.length === 10 || d.length === 11) return `+55${d}`;
  return `+${d}`;
}

export function phoneDigits(value: string): string {
  return normalizePhone(value).replace(/\D/g, '');
}

export function conversationDocId(phoneOrWa: string, restaurantId: string): string {
  return `${phoneDigits(phoneOrWa)}_${restaurantId}`;
}

export function toWhatsAppAddress(phoneOrWa: string): string {
  const normalized = normalizePhone(phoneOrWa);
  if (!normalized) return '';
  return normalized.startsWith('whatsapp:') ? normalized : `whatsapp:${normalized}`;
}
