"use strict";
/** Mesma regra de src/utils/authInputUtils.normalizePhone, com prefixo whatsapp: removido. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripWhatsAppPrefix = stripWhatsAppPrefix;
exports.normalizePhone = normalizePhone;
exports.phoneDigits = phoneDigits;
exports.conversationDocId = conversationDocId;
exports.toWhatsAppAddress = toWhatsAppAddress;
function stripWhatsAppPrefix(value) {
    return value.replace(/^whatsapp:/i, '').trim();
}
function normalizePhone(value) {
    const d = stripWhatsAppPrefix(value).replace(/\D/g, '');
    if (d.length === 0)
        return '';
    if (d.startsWith('55') && d.length >= 12 && d.length <= 13)
        return `+${d}`;
    if (d.length === 10 || d.length === 11)
        return `+55${d}`;
    return `+${d}`;
}
function phoneDigits(value) {
    return normalizePhone(value).replace(/\D/g, '');
}
function conversationDocId(phoneOrWa, restaurantId) {
    return `${phoneDigits(phoneOrWa)}_${restaurantId}`;
}
function toWhatsAppAddress(phoneOrWa) {
    const normalized = normalizePhone(phoneOrWa);
    if (!normalized)
        return '';
    return normalized.startsWith('whatsapp:') ? normalized : `whatsapp:${normalized}`;
}
//# sourceMappingURL=phone.js.map