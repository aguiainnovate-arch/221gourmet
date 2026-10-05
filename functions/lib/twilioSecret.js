"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.twilioAccountSid = exports.twilioAuthToken = void 0;
const params_1 = require("firebase-functions/params");
/** Auth Token do Console Twilio (Account → API keys & tokens). */
exports.twilioAuthToken = (0, params_1.defineSecret)('TWILIO_AUTH_TOKEN');
/** Account SID da mesma conta. Não vai no Git. */
exports.twilioAccountSid = (0, params_1.defineSecret)('TWILIO_ACCOUNT_SID');
//# sourceMappingURL=twilioSecret.js.map