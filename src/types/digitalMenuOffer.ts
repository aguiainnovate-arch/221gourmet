/** Oferta de upsell: Cardápio digital (QR de mesas + IA WhatsApp). */

export const DIGITAL_MENU_PRICE = 297;
export const DIGITAL_MENU_PRICE_CENTS = 29700;

export const DIGITAL_MENU_OFFER = {
  title: 'Cardápio digital para o salão',
  headline: 'Quer turbinar o salão com cardápio digital?',
  priceLabel: 'R$ 297',
  bullets: [
    'QR Code por mesa que abre o cardápio digital na hora',
    'Pedidos e visualização no celular do cliente, sem papel',
    'IA para WhatsApp inclusa no pacote',
  ],
  pitch:
    'Você não está apenas investindo em mais tecnologia — está investindo em mais tempo para você e para o seu negócio. Menos reimpressão de cardápio, menos espera no atendimento e mais foco no que importa: a cozinha e o cliente.',
} as const;

export type DigitalMenuStatus = 'none' | 'active';

export interface DigitalMenuPurchase {
  status: DigitalMenuStatus;
  purchasedAt?: Date;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  updatedAt?: Date;
}

export function normalizeDigitalMenu(raw: unknown): DigitalMenuPurchase | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const data = raw as Record<string, unknown>;
  const status: DigitalMenuStatus = data.status === 'active' ? 'active' : 'none';
  const toDate = (v: unknown): Date | undefined => {
    if (!v) return undefined;
    if (v instanceof Date) return v;
    if (typeof (v as { toDate?: () => Date }).toDate === 'function') {
      return (v as { toDate: () => Date }).toDate();
    }
    if (typeof v === 'string' || typeof v === 'number') {
      const d = new Date(v);
      return Number.isNaN(d.getTime()) ? undefined : d;
    }
    return undefined;
  };
  return {
    status,
    purchasedAt: toDate(data.purchasedAt),
    stripeCheckoutSessionId:
      typeof data.stripeCheckoutSessionId === 'string' ? data.stripeCheckoutSessionId : undefined,
    stripePaymentIntentId:
      typeof data.stripePaymentIntentId === 'string' ? data.stripePaymentIntentId : undefined,
    updatedAt: toDate(data.updatedAt),
  };
}

export function hasActiveDigitalMenu(purchase?: DigitalMenuPurchase | null): boolean {
  return purchase?.status === 'active';
}
