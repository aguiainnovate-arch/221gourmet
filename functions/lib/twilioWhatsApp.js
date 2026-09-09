"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.whatsappTwilioWebhook = exports.twilioAuthToken = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const twilio_1 = __importDefault(require("twilio"));
const firebaseAdmin_1 = require("./firebaseAdmin");
/** Auth Token do Console Twilio (Account → API keys & tokens). */
exports.twilioAuthToken = (0, params_1.defineSecret)('TWILIO_AUTH_TOKEN');
function asString(value) {
    return typeof value === 'string' ? value : value == null ? '' : String(value);
}
/** Gen2 costuma chegar com path "/"; a Twilio assinou a URL completa do webhook. */
function candidateWebhookUrls(req) {
    const protocol = asString(req.headers['x-forwarded-proto']) || 'https';
    const host = asString(req.headers['x-forwarded-host'] || req.headers.host);
    const rawPath = asString(req.originalUrl || req.url) || '/';
    const paths = new Set([rawPath, '/whatsappTwilioWebhook']);
    if (rawPath === '/' || rawPath === '') {
        paths.add('/whatsappTwilioWebhook');
    }
    return [...paths].map((path) => `${protocol}://${host}${path.startsWith('/') ? path : `/${path}`}`);
}
/**
 * Webhook inbound do Twilio WhatsApp (Sandbox ou produção).
 * Fase 0: valida assinatura (se o secret existir), loga e grava em Firestore.
 * Responde TwiML vazio para o Twilio não retentar.
 */
exports.whatsappTwilioWebhook = (0, https_1.onRequest)({
    secrets: [exports.twilioAuthToken],
    cors: false,
    invoker: 'public',
}, async (req, res) => {
    var _a;
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    const params = ((_a = req.body) !== null && _a !== void 0 ? _a : {});
    const authToken = exports.twilioAuthToken.value().trim();
    const signature = asString(req.headers['x-twilio-signature']);
    // Placeholder "unset" permite deploy antes de colar o Auth Token real.
    const canValidate = Boolean(authToken && authToken !== 'unset' && signature);
    if (canValidate) {
        const urls = candidateWebhookUrls(req);
        const valid = urls.some((url) => twilio_1.default.validateRequest(authToken, signature, url, params));
        if (!valid) {
            console.warn('[whatsappTwilioWebhook] assinatura inválida', { urls });
            res.status(403).send('Invalid Twilio signature');
            return;
        }
    }
    const from = asString(params.From);
    const to = asString(params.To);
    const body = asString(params.Body);
    const messageSid = asString(params.MessageSid);
    const profileName = asString(params.ProfileName);
    const waId = asString(params.WaId);
    console.log('[whatsappTwilioWebhook] inbound', {
        from,
        to,
        body,
        messageSid,
        profileName,
        waId,
    });
    try {
        await firebaseAdmin_1.admin.firestore().collection('whatsappWebhookEvents').add({
            from,
            to,
            body,
            messageSid,
            profileName,
            waId,
            createdAt: firebaseAdmin_1.admin.firestore.FieldValue.serverTimestamp(),
            source: 'twilio',
        });
    }
    catch (err) {
        console.error('[whatsappTwilioWebhook] falha ao gravar evento', err);
    }
    res
        .status(200)
        .type('text/xml')
        .send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
});
//# sourceMappingURL=twilioWhatsApp.js.map