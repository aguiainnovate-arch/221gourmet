import OpenAI from 'openai';

import { admin } from '../firebaseAdmin';
import { openaiApiKey } from '../openaiSecret';
import { buildBorisSystemPrompt } from './prompt';
import { sendWhatsAppTurn } from './twilioSend';
import { BORIS_TOOLS, executeBorisTool, loadRealFacts, type BorisToolContext } from './tools';
import { conversationDocId, normalizePhone, toWhatsAppAddress } from './phone';

const FALLBACK = 'Tive um problema agora. Pode repetir em instantes?';
const MAX_TOOL_ROUNDS = 3;
const MAX_STORED_MESSAGES = 24;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SANDBOX_RESTAURANT_ID = 'xli1hZjDRsHFtCnzr8hk';
const SANDBOX_RESTAURANT_NAME = 'Restaurante Teste';

async function loadConfig(): Promise<{ restaurantId: string; personality: string } | null> {
  const ref = admin.firestore().doc('whatsappConfig/default');
  const snap = await ref.get();
  const current = snap.exists ? snap.data() || {} : {};
  const existingId = typeof current.restaurantId === 'string' ? current.restaurantId.trim() : '';
  if (existingId) {
    const personality = typeof current.personality === 'string' && current.personality.trim()
      ? current.personality.trim()
      : 'DESCONTRAIDO';
    return { restaurantId: existingId, personality };
  }

  const restaurant = await admin.firestore().collection('restaurants').doc(SANDBOX_RESTAURANT_ID).get();
  const name = restaurant.exists ? restaurant.data()?.name : '';
  if (name !== SANDBOX_RESTAURANT_NAME) {
    console.error('[boris] restaurante sandbox não confere, config não gravada');
    return null;
  }

  const personality = 'DESCONTRAIDO';
  await ref.set(
    {
      restaurantId: SANDBOX_RESTAURANT_ID,
      from: 'whatsapp:+14155238886',
      personality,
    },
    { merge: true }
  );
  return { restaurantId: SANDBOX_RESTAURANT_ID, personality };
}

async function appendConversation(
  conversationId: string,
  patch: Record<string, unknown>,
  message: ChatMessage
): Promise<ChatMessage[]> {
  const ref = admin.firestore().collection('whatsappConversations').doc(conversationId);
  const snap = await ref.get();
  const previous = snap.exists && Array.isArray(snap.data()?.messages) ? (snap.data()?.messages as ChatMessage[]) : [];
  const messages = [...previous, message].slice(-MAX_STORED_MESSAGES);
  await ref.set(
    {
      ...patch,
      messages,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  return messages;
}

export async function replyToInbound(input: {
  from: string;
  body: string;
  profileName: string;
  waId: string;
}): Promise<void> {
  const text = input.body.trim();
  if (!text) return;

  const config = await loadConfig();
  if (!config) {
    console.error('[boris] whatsappConfig/default sem restaurantId');
    return;
  }

  const customerPhone = normalizePhone(input.waId || input.from);
  if (!customerPhone) return;
  const to = toWhatsAppAddress(customerPhone);
  const conversationId = conversationDocId(customerPhone, config.restaurantId);
  const ctx: BorisToolContext = {
    restaurantId: config.restaurantId,
    customerPhone,
    conversationId,
  };

  const existing = await admin.firestore().collection('whatsappConversations').doc(conversationId).get();
  const mode = existing.exists && existing.data()?.mode === 'human' ? 'human' : 'ai';

  const history = await appendConversation(
    conversationId,
    {
      restaurantId: config.restaurantId,
      customerPhone,
      waId: input.waId,
      profileName: input.profileName || '',
      mode,
    },
    { role: 'user', content: text }
  );

  if (mode === 'human') return;

  const apiKey = openaiApiKey.value().trim();
  if (!apiKey) {
    await sendWhatsAppTurn(to, FALLBACK);
    return;
  }

  let facts: unknown = {};
  try {
    const real = await loadRealFacts(ctx);
    facts = { ...real, customer_name: input.profileName || '' };
  } catch (err) {
    console.error('[boris] falha ao carregar fatos', err);
  }

  const client = new OpenAI({ apiKey });
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: buildBorisSystemPrompt({ personality: config.personality, facts }) },
    ...history.slice(-12).map((msg) => ({ role: msg.role, content: msg.content })),
  ];

  let reply = '';
  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        tools: BORIS_TOOLS,
        temperature: 0.4,
      });
      const choice = response.choices[0]?.message;
      if (!choice) break;
      const toolCalls = choice.tool_calls || [];
      if (!toolCalls.length) {
        reply = choice.content?.trim() || '';
        break;
      }
      messages.push(choice);
      for (const call of toolCalls) {
        if (call.type !== 'function') continue;
        const result = await executeBorisTool(call.function.name, call.function.arguments || '{}', ctx);
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }
    }
  } catch (err) {
    console.error('[boris] OpenAI falhou', err);
    reply = '';
  }

  const outbound = reply || FALLBACK;
  await sendWhatsAppTurn(to, outbound);
  await appendConversation(conversationId, {}, { role: 'assistant', content: outbound });
}
