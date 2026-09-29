"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.splitWhatsAppBodies = splitWhatsAppBodies;
exports.sendWhatsApp = sendWhatsApp;
exports.sendWhatsAppTurn = sendWhatsAppTurn;
const twilio_1 = __importDefault(require("twilio"));
const twilioSecret_1 = require("../twilioSecret");
const MAX_BODY = 500;
const GAP_MS = 800;
function clip(body) {
    const text = body.trim();
    if (text.length <= MAX_BODY)
        return text;
    return text.slice(0, MAX_BODY);
}
/** Uma linha em branco separa no máximo duas bolhas. O resto permanece na segunda. */
function splitWhatsAppBodies(text) {
    const trimmed = text.trim();
    if (!trimmed)
        return [];
    const parts = trimmed.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
    const chosen = parts.length >= 2 ? [parts[0], parts.slice(1).join('\n\n')] : [trimmed];
    return chosen.slice(0, 2).map(clip).filter(Boolean);
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
async function sendWhatsApp(to, body) {
    const accountSid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
    const from = (process.env.TWILIO_WHATSAPP_FROM || '').trim();
    const token = twilioSecret_1.twilioAuthToken.value().trim();
    const text = clip(body);
    if (!accountSid || !from || !token || token === 'unset' || !to || !text) {
        console.error('[sendWhatsApp] config ou corpo ausente');
        return false;
    }
    try {
        const client = (0, twilio_1.default)(accountSid, token);
        await client.messages.create({ from, to, body: text });
        return true;
    }
    catch (err) {
        console.error('[sendWhatsApp] falha no envio', err);
        return false;
    }
}
async function sendWhatsAppTurn(to, text) {
    const bodies = splitWhatsAppBodies(text);
    let ok = true;
    for (let i = 0; i < bodies.length; i += 1) {
        if (i > 0)
            await sleep(GAP_MS);
        const sent = await sendWhatsApp(to, bodies[i]);
        if (!sent)
            ok = false;
    }
    return ok;
}
//# sourceMappingURL=twilioSend.js.map