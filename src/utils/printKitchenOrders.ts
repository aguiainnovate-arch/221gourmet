import type { FirestoreOrder } from '../services/orderService';
import type { DeliveryOrder } from '../types/delivery';

const DELIVERY_STATUS_LABEL: Record<DeliveryOrder['status'], string> = {
  pending: 'Aguardando',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  delivering: 'Saindo',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

const MESA_STATUS_LABEL: Record<FirestoreOrder['status'], string> = {
  novo: 'Novo',
  preparando: 'Em preparo',
  pronto: 'Pronto',
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDeliveryTime(date: Date): string {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function printKitchenOrders(params: {
  restaurantName: string;
  mesaOrders: FirestoreOrder[];
  deliveryOrders: DeliveryOrder[];
}): void {
  const { restaurantName, mesaOrders, deliveryOrders } = params;
  const printedAt = new Date().toLocaleString('pt-BR');

  const mesaHtml =
    mesaOrders.length === 0
      ? '<p class="empty">Nenhum pedido de mesa no momento.</p>'
      : mesaOrders
          .map(
            (order) => `
        <article class="ticket">
          <header>
            <strong>Mesa ${escapeHtml(String(order.mesaNumero))}</strong>
            <span>${escapeHtml(MESA_STATUS_LABEL[order.status] ?? order.status)} · ${escapeHtml(order.timestamp)}</span>
          </header>
          <ul>
            ${order.itens.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
          </ul>
        </article>`
          )
          .join('');

  const deliveryHtml =
    deliveryOrders.length === 0
      ? '<p class="empty">Nenhum pedido de delivery no momento.</p>'
      : deliveryOrders
          .map((order) => {
            const items = order.items
              .map((item) => {
                const obs = item.observations ? ` (${item.observations})` : '';
                return `<li>${item.quantity}x ${escapeHtml(item.productName)}${escapeHtml(obs)}</li>`;
              })
              .join('');
            return `
        <article class="ticket">
          <header>
            <strong>Delivery · ${escapeHtml(order.customerName)}</strong>
            <span>${escapeHtml(DELIVERY_STATUS_LABEL[order.status] ?? order.status)} · ${escapeHtml(formatDeliveryTime(order.createdAt))}</span>
          </header>
          <p class="meta">${escapeHtml(order.customerPhone)} · ${escapeHtml(order.customerAddress)}</p>
          <ul>${items}</ul>
          ${order.observations ? `<p class="meta">Obs: ${escapeHtml(order.observations)}</p>` : ''}
        </article>`;
          })
          .join('');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Pedidos da cozinha — ${escapeHtml(restaurantName)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; color: #111; margin: 16px; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .subtitle { color: #555; font-size: 12px; margin-bottom: 16px; }
    h2 { font-size: 14px; margin: 18px 0 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
    .ticket { border: 1px solid #ccc; border-radius: 8px; padding: 10px 12px; margin-bottom: 10px; page-break-inside: avoid; }
    .ticket header { display: flex; justify-content: space-between; gap: 8px; font-size: 13px; margin-bottom: 6px; }
    .ticket ul { margin: 0; padding-left: 18px; font-size: 13px; }
    .meta { font-size: 12px; color: #444; margin: 4px 0; }
    .empty { font-size: 13px; color: #666; }
    @media print { body { margin: 8px; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(restaurantName)}</h1>
  <p class="subtitle">Pedidos da cozinha · impresso em ${escapeHtml(printedAt)}</p>
  <h2>Pedidos de mesa (${mesaOrders.length})</h2>
  ${mesaHtml}
  <h2>Pedidos de delivery (${deliveryOrders.length})</h2>
  ${deliveryHtml}
</body>
</html>`;

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const frameDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!frameDoc) {
    iframe.remove();
    alert('Não foi possível abrir a impressão. Tente novamente.');
    return;
  }

  frameDoc.open();
  frameDoc.write(html);
  frameDoc.close();

  const cleanup = () => {
    setTimeout(() => iframe.remove(), 500);
  };

  iframe.contentWindow?.focus();
  iframe.contentWindow?.print();
  iframe.contentWindow?.addEventListener('afterprint', cleanup);
  setTimeout(cleanup, 1500);
}
