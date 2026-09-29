import { onRequest } from 'firebase-functions/v2/https';
import twilio from 'twilio';

import { admin } from './firebaseAdmin';
import { replyToInbound } from './boris/orchestrator';
import { openaiApiKey } from './openaiSecret';
import { twilioAuthToken } from './twilioSecret';

export { twilioAuthToken };

function asString(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

/** Gen2 costuma chegar com path "/"; a Twilio assinou a URL completa do webhook. */
function candidateWebhookUrls(req: {
  headers: Record<string, unknown>;
  originalUrl?: string;
  url?: string;
}): string[] {
  const protocol = asString(req.headers['x-forwarded-proto']) || 'https';
  const host = asString(req.headers['x-forwarded-host'] || req.headers.host);
  const rawPath = asString(req.originalUrl || req.url) || '/';
  const paths = new Set<string>([rawPath, '/whatsappTwilioWebhook']);
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
export const whatsappTwilioWebhook = onRequest(
  {
    secrets: [twilioAuthToken, openaiApiKey],
    cors: false,
    invoker: 'public',
    timeoutSeconds: 60,
    memory: '512MiB',
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const params = (req.body ?? {}) as Record<string, unknown>;
    const authToken = twilioAuthToken.value().trim();
    const signature = asString(req.headers['x-twilio-signature']);
    // Placeholder "unset" permite deploy antes de colar o Auth Token real.
    const canValidate = Boolean(authToken && authToken !== 'unset' && signature);

    if (canValidate) {
      const urls = candidateWebhookUrls(req);
      const valid = urls.some((url) => twilio.validateRequest(authToken, signature, url, params));
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
      const eventRef = admin.firestore().collection('whatsappWebhookEvents').doc(messageSid);
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
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          source: 'twilio',
        });
      } catch (err) {
        console.warn('[whatsappTwilioWebhook] messageSid duplicado', err);
        res.status(200).type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
        return;
      }
    }

    try {
      await replyToInbound({ from, body, profileName, waId });
    } catch (err) {
      console.error('[whatsappTwilioWebhook] falha ao responder', err);
    }

    res
      .status(200)
      .type('text/xml')
      .send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  }
);
