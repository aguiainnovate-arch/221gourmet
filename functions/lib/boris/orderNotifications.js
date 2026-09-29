"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyDeliveryStatusOnWhatsApp = void 0;
exports.statusMessage = statusMessage;
const firestore_1 = require("firebase-functions/v2/firestore");
const firebaseAdmin_1 = require("../firebaseAdmin");
const phone_1 = require("./phone");
const twilioSend_1 = require("./twilioSend");
const twilioSecret_1 = require("../twilioSecret");
function itemNames(data) {
    if (!Array.isArray(data.items))
        return '';
    const names = data.items
        .map((item) => {
        if (!item || typeof item !== 'object')
            return '';
        const name = item.productName;
        return typeof name === 'string' ? name.trim() : '';
    })
        .filter(Boolean);
    return names.join(', ');
}
function firstName(data) {
    if (typeof data.customerName !== 'string')
        return '';
    return data.customerName.trim().split(/\s+/)[0] || '';
}
function withItems(text, names) {
    if (!names)
        return text;
    return `${text}\nItens: ${names}.`;
}
function statusMessage(data) {
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
        if (pickup)
            return null;
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
exports.notifyDeliveryStatusOnWhatsApp = (0, firestore_1.onDocumentWritten)({
    document: 'deliveries/{orderId}',
    secrets: [twilioSecret_1.twilioAuthToken],
    region: 'us-central1',
    timeoutSeconds: 30,
}, async (event) => {
    var _a, _b, _c, _d;
    const afterSnap = (_a = event.data) === null || _a === void 0 ? void 0 : _a.after;
    if (!(afterSnap === null || afterSnap === void 0 ? void 0 : afterSnap.exists))
        return;
    const after = afterSnap.data();
    const beforeSnap = (_b = event.data) === null || _b === void 0 ? void 0 : _b.before;
    const before = (beforeSnap === null || beforeSnap === void 0 ? void 0 : beforeSnap.exists) ? beforeSnap.data() : null;
    if (before && before.status === after.status)
        return;
    const status = typeof after.status === 'string' ? after.status : '';
    if (!status || after.whatsappStatusNotified === status)
        return;
    const restaurantId = typeof after.restaurantId === 'string' ? after.restaurantId : '';
    const customerPhone = typeof after.customerPhone === 'string' ? after.customerPhone : '';
    if (!restaurantId || !customerPhone)
        return;
    const conversationId = (0, phone_1.conversationDocId)(customerPhone, restaurantId);
    const conversation = await firebaseAdmin_1.admin.firestore().collection('whatsappConversations').doc(conversationId).get();
    if (!conversation.exists)
        return;
    const storedPhone = (0, phone_1.normalizePhone)(typeof ((_c = conversation.data()) === null || _c === void 0 ? void 0 : _c.customerPhone) === 'string' ? (_d = conversation.data()) === null || _d === void 0 ? void 0 : _d.customerPhone : '');
    if (!storedPhone || storedPhone !== (0, phone_1.normalizePhone)(customerPhone))
        return;
    const text = statusMessage(after);
    if (!text) {
        await afterSnap.ref.set({ whatsappStatusNotified: status }, { merge: true });
        return;
    }
    const to = (0, phone_1.toWhatsAppAddress)(customerPhone);
    const sent = await (0, twilioSend_1.sendWhatsAppTurn)(to, text);
    if (!sent)
        return;
    await afterSnap.ref.set({
        whatsappStatusNotified: status,
        updatedAt: firebaseAdmin_1.admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    await conversation.ref.set({ orderId: afterSnap.id }, { merge: true });
});
//# sourceMappingURL=orderNotifications.js.map