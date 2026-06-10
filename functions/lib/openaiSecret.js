"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openaiApiKey = void 0;
const params_1 = require("firebase-functions/params");
/** Secret compartilhado por `moderateLead`, `recommendRestaurantsWithAI`, etc. */
exports.openaiApiKey = (0, params_1.defineSecret)('OPENAI_API_KEY');
//# sourceMappingURL=openaiSecret.js.map