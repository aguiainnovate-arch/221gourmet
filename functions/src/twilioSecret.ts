import { defineSecret } from 'firebase-functions/params';

/** Auth Token do Console Twilio (Account → API keys & tokens). */
export const twilioAuthToken = defineSecret('TWILIO_AUTH_TOKEN');
