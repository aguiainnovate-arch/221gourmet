"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeSecretKey = void 0;
exports.getStripe = getStripe;
const params_1 = require("firebase-functions/params");
const stripe_1 = __importDefault(require("stripe"));
const https_1 = require("firebase-functions/v2/https");
exports.stripeSecretKey = (0, params_1.defineSecret)('STRIPE_SECRET_KEY');
function getStripe() {
    const secret = exports.stripeSecretKey.value();
    if (!secret) {
        throw new https_1.HttpsError('failed-precondition', 'Stripe não configurado (secret ausente).');
    }
    return new stripe_1.default(secret);
}
//# sourceMappingURL=stripeClient.js.map