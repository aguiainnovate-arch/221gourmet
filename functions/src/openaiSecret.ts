import { defineSecret } from 'firebase-functions/params';

/** Secret compartilhado por `moderateLead`, `recommendRestaurantsWithAI`, etc. */
export const openaiApiKey = defineSecret('OPENAI_API_KEY');
