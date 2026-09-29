"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.twilioAuthToken = void 0;
const params_1 = require("firebase-functions/params");
/** Auth Token do Console Twilio (Account → API keys & tokens). */
exports.twilioAuthToken = (0, params_1.defineSecret)('TWILIO_AUTH_TOKEN');
//# sourceMappingURL=twilioSecret.js.map