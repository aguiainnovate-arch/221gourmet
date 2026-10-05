import { onDocumentWritten } from 'firebase-functions/v2/firestore';

import { admin } from '../firebaseAdmin';
import { conversationDocId, normalizePhone, toWhatsAppAddress } from './phone';
import { sendWhatsAppTurn } from './twilioSend';
import { twilioAccountSid, twilioAuthToken } from '../twilioSecret';

type OrderData = Record<string, unknown>;

function itemNames(data: OrderData): string {
  if (!Array.isArray(data.items)) return '';
  const names = data.items
    .map((item) => {
      if (!item || typeof item !== 'object') return '';
      const name = (item as { productName?: unknown }).productName;
      return typeof name === 'string' ? name.trim() : '';
    })
    .filter(Boolean);
  return names.join(', ');
}

function firstName(data: OrderData): string {
  if (typeof data.customerName !== 'string') return '';
  return data.customerName.trim().split(/\s+/)[0] || '';
}

function withItems(text: string, names: string): string {
  if (!names) return text;
  return `${text}\nItens: ${names}.`;
}

export function statusMessage(data: OrderData): string | null {
  const status = typeof data.status === 'string' ? data.status : '';
  const pickup = data.fulfillmentType === 'pickup';
  const names = itemNames(data);
  const who = firstName(data);

  if (status === 'pending') {
    return withItems(`${who ? `${who}, ` : ''}Pedido recebido. Ele está aguardando a confirmação do restaurante.`, names);
  }
  if (status === 'confirmed') {
    return withItems(`${who ? `${who}, ` : ''}O restaurante confirmou seu pedido.`, names);
  }
  if (status === 'preparing') {
    return withItems(`${who ? `${who}, ` : ''}Seu pedido entrou em preparo.`, names);
  }
  if (status === 'delivering') {
    if (pickup) return null;
    return withItems(`${who ? `${who}, ` : ''}Seu pedido saiu para entrega.`, names);
  }
  if (status === 'delivered' && pickup) {
    return withItems(`${who ? `${who}, ` : ''}Seu pedido está pronto para retirada.`, names);
  }
  if (status === 'delivered') {
    return withItems(`${who ? `${who}, ` : ''}Seu pedido chegou.`, names);
  }
  if (status === 'cancelled') {
    const reason = typeof data.cancellationReason === 'string' ? data.cancellationReason.trim() : '';
    const base = `${who ? `${who}, ` : ''}Seu pedido foi cancelado.`;
    return reason ? `${base} Motivo: ${reason}` : base;
  }
  return null;
}

export const notifyDeliveryStatusOnWhatsApp = onDocumentWritten(
  {
    document: 'deliveries/{orderId}',
    secrets: [twilioAuthToken, twilioAccountSid],
    region: 'southamerica-east1',
    timeoutSeconds: 30,
  },
  async (event) => {
    const afterSnap = event.data?.after;
    if (!afterSnap?.exists) return;
    const after = afterSnap.data() as OrderData;
    const beforeSnap = event.data?.before;
    const before = beforeSnap?.exists ? (beforeSnap.data() as OrderData) : null;
    if (before && before.status === after.status) return;

    const status = typeof after.status === 'string' ? after.status : '';
    if (!status || after.whatsappStatusNotified === status) return;

    const restaurantId = typeof after.restaurantId === 'string' ? after.restaurantId : '';
    const customerPhone = typeof after.customerPhone === 'string' ? after.customerPhone : '';
    if (!restaurantId || !customerPhone) return;

    const conversationId = conversationDocId(customerPhone, restaurantId);
    const conversation = await admin.firestore().collection('whatsappConversations').doc(conversationId).get();
    if (!conversation.exists) return;
    const storedPhone = normalizePhone(
      typeof conversation.data()?.customerPhone === 'string' ? conversation.data()?.customerPhone : ''
    );
    if (!storedPhone || storedPhone !== normalizePhone(customerPhone)) return;

    const text = statusMessage(after);
    if (!text) {
      await afterSnap.ref.set({ whatsappStatusNotified: status }, { merge: true });
      return;
    }

    const to = toWhatsAppAddress(customerPhone);
    const sent = await sendWhatsAppTurn(to, text);
    if (!sent) return;

    await afterSnap.ref.set(
      {
        whatsappStatusNotified: status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    await conversation.ref.set({ orderId: afterSnap.id }, { merge: true });
  }
);
