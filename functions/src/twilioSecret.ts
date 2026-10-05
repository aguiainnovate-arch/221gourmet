import { defineSecret } from 'firebase-functions/params';

/** Auth Token do Console Twilio (Account → API keys & tokens). */
export const twilioAuthToken = defineSecret('TWILIO_AUTH_TOKEN');

/** Account SID da mesma conta. Não vai no Git. */
export const twilioAccountSid = defineSecret('TWILIO_ACCOUNT_SID');
