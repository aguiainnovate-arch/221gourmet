"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BORIS_TOOLS = void 0;
exports.executeBorisTool = executeBorisTool;
exports.loadRealFacts = loadRealFacts;
const firebaseAdmin_1 = require("../firebaseAdmin");
const phone_1 = require("./phone");
const ACTIVE_STATUSES = ['pending', 'confirmed', 'preparing', 'delivering'];
const PAYMENT_METHODS = ['Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Pix na entrega'];
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
exports.BORIS_TOOLS = [
    { type: 'function', function: { name: 'get_restaurant', description: 'Dados públicos do restaurante desta conversa.', parameters: { type: 'object', properties: {}, additionalProperties: false } } },
    { type: 'function', function: { name: 'get_public_menu_url', description: 'URL pública do cardápio deste restaurante.', parameters: { type: 'object', properties: {}, additionalProperties: false } } },
    { type: 'function', function: { name: 'search_menu', description: 'Busca produtos disponíveis pelo nome.', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'], additionalProperties: false } } },
    { type: 'function', function: { name: 'get_product', description: 'Um produto deste restaurante pelo id.', parameters: { type: 'object', properties: { productId: { type: 'string' } }, required: ['productId'], additionalProperties: false } } },
    { type: 'function', function: { name: 'get_delivery_quote', description: 'Taxa de entrega. Não inventa valor quando depende de endereço.', parameters: { type: 'object', properties: {}, additionalProperties: false } } },
    { type: 'function', function: { name: 'get_payment_methods', description: 'Formas de pagamento oferecidas na entrega.', parameters: { type: 'object', properties: {}, additionalProperties: false } } },
    { type: 'function', function: { name: 'get_customer_active_order', description: 'Pedido ativo deste telefone neste restaurante.', parameters: { type: 'object', properties: {}, additionalProperties: false } } },
    { type: 'function', function: { name: 'get_order_status', description: 'Status do pedido ativo deste telefone.', parameters: { type: 'object', properties: {}, additionalProperties: false } } },
    { type: 'function', function: { name: 'get_order_details', description: 'Itens e totais do pedido ativo deste telefone.', parameters: { type: 'object', properties: {}, additionalProperties: false } } },
    { type: 'function', function: { name: 'request_order_cancellation', description: 'Cancela só pedido pending deste telefone. Caso contrário pede humano.', parameters: { type: 'object', properties: { reason: { type: 'string' } }, additionalProperties: false } } },
    { type: 'function', function: { name: 'handoff_to_human', description: 'Pausa a IA e registra atendimento humano.', parameters: { type: 'object', properties: { reason: { type: 'string' } }, additionalProperties: false } } },
];
function menuUrl(restaurantId) {
    const base = (process.env.PUBLIC_APP_URL || 'https://boracoomer.netlify.app').replace(/\/$/, '');
    return `${base}/delivery/${restaurantId}`;
}
function asRecord(value) {
    return value && typeof value === 'object' ? value : {};
}
function minutesNowInSaoPaulo() {
    var _a, _b, _c;
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Sao_Paulo',
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(new Date());
    const weekday = (((_a = parts.find((p) => p.type === 'weekday')) === null || _a === void 0 ? void 0 : _a.value) || 'sunday').toLowerCase();
    const hour = Number(((_b = parts.find((p) => p.type === 'hour')) === null || _b === void 0 ? void 0 : _b.value) || '0');
    const minute = Number(((_c = parts.find((p) => p.type === 'minute')) === null || _c === void 0 ? void 0 : _c.value) || '0');
    return { weekday, minutes: hour * 60 + minute };
}
function parseClock(value) {
    if (typeof value !== 'string')
        return null;
    const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
    if (!match)
        return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59)
        return null;
    return hours * 60 + minutes;
}
function openNow(hours) {
    if (!hours || typeof hours !== 'object' || Array.isArray(hours))
        return null;
    const { weekday, minutes } = minutesNowInSaoPaulo();
    const key = WEEKDAYS.find((day) => weekday.startsWith(day.slice(0, 3))) || weekday;
    const day = asRecord(hours[key]);
    if (!Object.keys(day).length)
        return null;
    if (day.closed === true)
        return false;
    const intervals = Array.isArray(day.intervals) ? day.intervals : [];
    const slots = intervals.length
        ? intervals.map((item) => asRecord(item))
        : day.open && day.close
            ? [{ open: day.open, close: day.close }]
            : [];
    if (!slots.length)
        return null;
    return slots.some((slot) => {
        const open = parseClock(slot.open);
        const close = parseClock(slot.close);
        if (open === null || close === null)
            return false;
        if (close <= open)
            return minutes >= open || minutes < close;
        return minutes >= open && minutes < close;
    });
}
async function restaurantDoc(restaurantId) {
    const snap = await firebaseAdmin_1.admin.firestore().collection('restaurants').doc(restaurantId).get();
    if (!snap.exists)
        return null;
    return snap.data() || {};
}
function productView(id, data) {
    return {
        id,
        name: typeof data.name === 'string' ? data.name : '',
        description: typeof data.description === 'string' ? data.description : '',
        price: typeof data.price === 'number' ? data.price : null,
        deliveryPrice: typeof data.deliveryPrice === 'number' ? data.deliveryPrice : null,
    };
}
async function findActiveOrder(ctx) {
    const phone = (0, phone_1.normalizePhone)(ctx.customerPhone);
    const snap = await firebaseAdmin_1.admin.firestore().collection('deliveries').where('restaurantId', '==', ctx.restaurantId).limit(100).get();
    const matches = snap.docs
        .map((docSnap) => ({ id: docSnap.id, data: docSnap.data() }))
        .filter((row) => {
        const status = row.data.status;
        const orderPhone = (0, phone_1.normalizePhone)(typeof row.data.customerPhone === 'string' ? row.data.customerPhone : '');
        return orderPhone === phone && typeof status === 'string' && ACTIVE_STATUSES.includes(status);
    })
        .sort((a, b) => createdMs(b.data.createdAt) - createdMs(a.data.createdAt));
    return matches[0] || null;
}
function createdMs(value) {
    if (value && typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') {
        return value.toMillis();
    }
    if (value instanceof Date)
        return value.getTime();
    return 0;
}
function orderPayload(id, data) {
    const items = Array.isArray(data.items)
        ? data.items.map((item) => {
            const row = asRecord(item);
            return {
                productName: typeof row.productName === 'string' ? row.productName : '',
                quantity: typeof row.quantity === 'number' ? row.quantity : null,
                price: typeof row.price === 'number' ? row.price : null,
            };
        })
        : [];
    return {
        found: true,
        orderId: id,
        status: data.status,
        fulfillmentType: data.fulfillmentType === 'pickup' ? 'pickup' : 'delivery',
        items,
        total: typeof data.total === 'number' ? data.total : null,
        deliveryFee: typeof data.deliveryFee === 'number' ? data.deliveryFee : null,
        customerName: typeof data.customerName === 'string' ? data.customerName : '',
        cancellationReason: typeof data.cancellationReason === 'string' ? data.cancellationReason : '',
    };
}
async function markHandoff(ctx, reason) {
    await firebaseAdmin_1.admin.firestore().collection('whatsappConversations').doc(ctx.conversationId).set({
        mode: 'human',
        handoffReason: reason.slice(0, 300),
        handoffAt: firebaseAdmin_1.admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
}
async function executeBorisTool(name, rawArgs, ctx) {
    let args = {};
    try {
        args = rawArgs ? JSON.parse(rawArgs) : {};
    }
    catch (_a) {
        args = {};
    }
    if (name === 'get_public_menu_url') {
        return { menu_url: menuUrl(ctx.restaurantId) };
    }
    if (name === 'get_payment_methods') {
        return { methods: PAYMENT_METHODS };
    }
    if (name === 'handoff_to_human') {
        const reason = typeof args.reason === 'string' ? args.reason : 'cliente ou sistema pediu humano';
        await markHandoff(ctx, reason);
        return { handoff: true };
    }
    if (name === 'get_restaurant') {
        const data = await restaurantDoc(ctx.restaurantId);
        if (!data)
            return { found: false };
        const hours = data.openingHours;
        return {
            found: true,
            name: typeof data.name === 'string' ? data.name : '',
            address: typeof data.address === 'string' ? data.address : '',
            openingHours: hours !== null && hours !== void 0 ? hours : null,
            openNow: openNow(hours),
        };
    }
    if (name === 'search_menu') {
        const query = typeof args.query === 'string' ? args.query.trim().toLowerCase() : '';
        const snap = await firebaseAdmin_1.admin.firestore().collection('products').where('restaurantId', '==', ctx.restaurantId).limit(200).get();
        const products = snap.docs
            .map((docSnap) => ({ id: docSnap.id, data: docSnap.data() }))
            .filter((row) => row.data.available !== false)
            .filter((row) => !query || String(row.data.name || '').toLowerCase().includes(query))
            .slice(0, 8)
            .map((row) => productView(row.id, row.data));
        if (!products.length)
            return { found: false, products: [] };
        return { found: true, products };
    }
    if (name === 'get_product') {
        const productId = typeof args.productId === 'string' ? args.productId : '';
        if (!productId)
            return { found: false };
        const snap = await firebaseAdmin_1.admin.firestore().collection('products').doc(productId).get();
        if (!snap.exists)
            return { found: false };
        const data = snap.data() || {};
        if (data.restaurantId !== ctx.restaurantId)
            return { found: false };
        return { found: true, product: productView(snap.id, data) };
    }
    if (name === 'get_delivery_quote') {
        const data = await restaurantDoc(ctx.restaurantId);
        const fee = asRecord(asRecord(data === null || data === void 0 ? void 0 : data.deliverySettings).fee);
        const mode = typeof fee.mode === 'string' ? fee.mode : '';
        if (mode === 'flat' && typeof fee.flatFee === 'number') {
            return { found: true, mode: 'flat', flatFee: fee.flatFee };
        }
        if (mode === 'distance' || mode === 'neighborhood') {
            return { found: true, needsAddress: true, mode };
        }
        return { found: false };
    }
    if (name === 'get_customer_active_order' || name === 'get_order_status' || name === 'get_order_details') {
        const order = await findActiveOrder(ctx);
        if (!order)
            return { found: false };
        return orderPayload(order.id, order.data);
    }
    if (name === 'request_order_cancellation') {
        const order = await findActiveOrder(ctx);
        if (!order)
            return { cancelled: false, found: false, handoff: true };
        if (order.data.status !== 'pending') {
            await markHandoff(ctx, 'cancelamento fora de pending');
            return { cancelled: false, handoff: true, status: order.data.status };
        }
        const phone = (0, phone_1.normalizePhone)(ctx.customerPhone);
        const orderPhone = (0, phone_1.normalizePhone)(typeof order.data.customerPhone === 'string' ? order.data.customerPhone : '');
        if (!phone || phone !== orderPhone) {
            await markHandoff(ctx, 'telefone do pedido não confere');
            return { cancelled: false, handoff: true };
        }
        const reason = typeof args.reason === 'string' && args.reason.trim()
            ? args.reason.trim().slice(0, 300)
            : 'Cancelado pelo cliente — restaurante não confirmou o pedido';
        await firebaseAdmin_1.admin.firestore().collection('deliveries').doc(order.id).update({
            status: 'cancelled',
            cancellationReason: reason,
            updatedAt: firebaseAdmin_1.admin.firestore.FieldValue.serverTimestamp(),
        });
        return { cancelled: true, orderId: order.id };
    }
    return { found: false };
}
async function loadRealFacts(ctx) {
    const [restaurant, menu, order] = await Promise.all([
        executeBorisTool('get_restaurant', '{}', ctx),
        executeBorisTool('get_public_menu_url', '{}', ctx),
        executeBorisTool('get_customer_active_order', '{}', ctx),
    ]);
    const hour = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    }).format(new Date());
    return { nowSaoPaulo: hour, restaurant, menu, activeOrder: order };
}
//# sourceMappingURL=tools.js.map