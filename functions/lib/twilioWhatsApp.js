"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.whatsappTwilioWebhook = exports.twilioAuthToken = void 0;
const https_1 = require("firebase-functions/v2/https");
const twilio_1 = __importDefault(require("twilio"));
const firebaseAdmin_1 = require("./firebaseAdmin");
const orchestrator_1 = require("./boris/orchestrator");
const openaiSecret_1 = require("./openaiSecret");
const twilioSecret_1 = require("./twilioSecret");
Object.defineProperty(exports, "twilioAuthToken", { enumerable: true, get: function () { return twilioSecret_1.twilioAuthToken; } });
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
    secrets: [twilioSecret_1.twilioAuthToken, openaiSecret_1.openaiApiKey],
    cors: false,
    invoker: 'public',
    timeoutSeconds: 60,
    memory: '512MiB',
}, async (req, res) => {
    var _a;
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    const params = ((_a = req.body) !== null && _a !== void 0 ? _a : {});
    const authToken = twilioSecret_1.twilioAuthToken.value().trim();
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
    if (messageSid) {
        const eventRef = firebaseAdmin_1.admin.firestore().collection('whatsappWebhookEvents').doc(messageSid);
        const existing = await eventRef.get();
        if (existing.exists) {
            res.status(200).type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
            return;
        }
        try {
            await eventRef.create({
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
            console.warn('[whatsappTwilioWebhook] messageSid duplicado', err);
            res.status(200).type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
            return;
        }
    }
    try {
        await (0, orchestrator_1.replyToInbound)({ from, body, profileName, waId });
    }
    catch (err) {
        console.error('[whatsappTwilioWebhook] falha ao responder', err);
    }
    res
        .status(200)
        .type('text/xml')
        .send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
});
//# sourceMappingURL=twilioWhatsApp.js.map