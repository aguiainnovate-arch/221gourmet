"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeMetadata = sanitizeMetadata;
exports.translateStripeError = translateStripeError;
const stripe_1 = __importDefault(require("stripe"));
const https_1 = require("firebase-functions/v2/https");
function sanitizeMetadata(raw) {
    const metadata = {};
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        for (const [k, v] of Object.entries(raw)) {
            if (typeof k === 'string' && k.length <= 40 && typeof v === 'string' && v.length <= 500) {
                metadata[k] = v.slice(0, 500);
            }
        }
    }
    return metadata;
}
function translateStripeError(err, ctx) {
    if (err instanceof stripe_1.default.errors.StripeError) {
        console.error(`[${ctx}] Stripe`, err.type, err.message);
        const msg = `Stripe: ${err.message}`.slice(0, 240);
        return new https_1.HttpsError('failed-precondition', msg);
    }
    console.error(`[${ctx}]`, err);
    return new https_1.HttpsError('internal', 'Erro inesperado com o Stripe.');
}
//# sourceMappingURL=stripeUtils.js.map