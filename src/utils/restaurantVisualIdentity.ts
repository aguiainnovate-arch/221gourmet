import type { LucideIcon } from 'lucide-react';
import {
  Pizza,
  Beef,
  Wheat,
  Fish,
  Zap,
  Coffee,
  Clock,
  Flame,
  Salad,
  Sandwich,
  UtensilsCrossed,
} from 'lucide-react';
import type { Restaurant } from '../types/restaurant';

export type RestaurantCuisineKind =
  | 'italian'
  | 'steakhouse'
  | 'bakery'
  | 'japanese'
  | 'nordeste'
  | 'healthy'
  | 'fastfood'
  | 'generic';

export interface RestaurantLogoStyle {
  background: string;
  accent: string;
  icon: LucideIcon;
  monogram: string;
  subtitle?: string;
}

export interface RestaurantContentChip {
  id: string;
  label: string;
  tone: 'promo' | 'trending' | 'benefit' | 'category';
}

export type CoverBadgeKind = 'fast' | 'open' | 'popular' | 'closed';

export interface RestaurantVisualIdentity {
  kind: RestaurantCuisineKind;
  categoryLabel: string;
  categoryFlag?: string;
  logo: RestaurantLogoStyle;
  logoBrand: { line1: string; line2?: string };
  coverBadge: CoverBadgeKind;
  contentChips: RestaurantContentChip[];
}

/** Texto de marca para o bloco de logo (ex.: BELLA / ITALIA). */
export function getBrandLogoLines(name: string): { line1: string; line2?: string } {
  const stopWords = new Set(['cantina', 'restaurante', 'bar', 'e', 'de', 'da', 'do', 'the', '&']);
  const words = name
    .replace(/&/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter((w) => w.length > 0 && !stopWords.has(w.toLowerCase()));

  const brand = words.length > 0 ? words : name.split(/\s+/).filter(Boolean);
  if (brand.length >= 2) {
    const mid = Math.ceil(brand.length / 2);
    return {
      line1: brand.slice(0, mid).join(' ').toUpperCase(),
      line2: brand.slice(mid).join(' ').toUpperCase(),
    };
  }
  const single = (brand[0] ?? name).toUpperCase();
  if (single.length <= 8) return { line1: single };
  const cut = Math.ceil(single.length / 2);
  return { line1: single.slice(0, cut), line2: single.slice(cut) };
}

const CUISINE_RULES: {
  kind: RestaurantCuisineKind;
  label: string;
  flag?: string;
  keywords: string[];
  logo: RestaurantLogoStyle;
  chips?: string[];
}[] = [
  {
    kind: 'italian',
    label: 'Culinária Italiana',
    flag: '🇮🇹',
    keywords: ['italia', 'italian', 'cantina', 'pizza', 'pasta', 'risoto', 'massa'],
    logo: {
      background: 'linear-gradient(145deg, #E91120 0%, #B80E1A 100%)',
      accent: '#FFD4A8',
      icon: Pizza,
      monogram: 'IT',
      subtitle: 'Cantina',
    },
    chips: ['Massas artesanais'],
  },
  {
    kind: 'steakhouse',
    label: 'Churrascaria',
    flag: '🇧🇷',
    keywords: ['churrasc', 'gaucha', 'gaucho', 'grill', 'steak', 'carne'],
    logo: {
      background: 'linear-gradient(145deg, #7A1C12 0%, #4A0F0A 100%)',
      accent: '#F5D0A8',
      icon: Beef,
      monogram: 'CH',
      subtitle: 'Grill',
    },
    chips: ['Rodízio premium'],
  },
  {
    kind: 'bakery',
    label: 'Padaria e Café',
    flag: '☕',
    keywords: ['padaria', 'cafe', 'café', 'bakery', 'pao', 'pão', 'confeitaria'],
    logo: {
      background: 'linear-gradient(145deg, #C8922A 0%, #9A6B18 100%)',
      accent: '#FFF4DC',
      icon: Wheat,
      monogram: 'PC',
      subtitle: 'Café',
    },
    chips: ['Café especial'],
  },
  {
    kind: 'japanese',
    label: 'Culinária Japonesa',
    flag: '🇯🇵',
    keywords: ['sushi', 'japa', 'japon', 'temaki', 'zen'],
    logo: {
      background: 'linear-gradient(145deg, #1F2937 0%, #111827 100%)',
      accent: '#FCA5A5',
      icon: Fish,
      monogram: 'JP',
      subtitle: 'Sushi',
    },
    chips: ['Peixe fresco'],
  },
  {
    kind: 'nordeste',
    label: 'Culinária Nordestina',
    flag: '🌵',
    keywords: ['nordeste', 'baião', 'moqueca', 'carne-de-sol'],
    logo: {
      background: 'linear-gradient(145deg, #D97706 0%, #B45309 100%)',
      accent: '#FEF3C7',
      icon: Flame,
      monogram: 'NE',
      subtitle: 'Regional',
    },
    chips: ['Sabores regionais'],
  },
  {
    kind: 'healthy',
    label: 'Comida Saudável',
    flag: '🥗',
    keywords: ['saudavel', 'saudável', 'salada', 'fit', 'natural', 'vegan'],
    logo: {
      background: 'linear-gradient(145deg, #059669 0%, #047857 100%)',
      accent: '#D1FAE5',
      icon: Salad,
      monogram: 'SF',
      subtitle: 'Fresh',
    },
    chips: ['Opções leves'],
  },
  {
    kind: 'fastfood',
    label: 'Lanches e Burgers',
    flag: '🍔',
    keywords: ['burger', 'lanche', 'fast', 'smash', 'hot dog'],
    logo: {
      background: 'linear-gradient(145deg, #EA580C 0%, #C2410C 100%)',
      accent: '#FFEDD5',
      icon: Sandwich,
      monogram: 'BK',
      subtitle: 'Burger',
    },
    chips: ['Entrega rápida'],
  },
];

function haystack(restaurant: Restaurant): string {
  const parts = [
    restaurant.name,
    restaurant.deliverySettings?.aiDescription ?? '',
    restaurant.domain,
  ];
  return parts.join(' ').toLowerCase();
}

function detectKind(restaurant: Restaurant): (typeof CUISINE_RULES)[number] {
  const text = haystack(restaurant);
  for (const rule of CUISINE_RULES) {
    if (rule.keywords.some((kw) => text.includes(kw))) return rule;
  }
  return {
    kind: 'generic',
    label: 'Restaurante',
    keywords: [],
    logo: {
      background: `linear-gradient(145deg, ${restaurant.theme?.primaryColor || '#E91120'} 0%, #2A1E1A 100%)`,
      accent: '#FAF0DB',
      icon: UtensilsCrossed,
      monogram: restaurant.name.slice(0, 2).toUpperCase(),
      subtitle: 'Delivery',
    },
    chips: ['Cardápio variado'],
  };
}

function pickCoverBadge(restaurantId: string): CoverBadgeKind {
  return restaurantId.charCodeAt(0) % 2 === 0 ? 'fast' : 'popular';
}

function buildContentChips(
  restaurantId: string,
  rule: (typeof CUISINE_RULES)[number]
): RestaurantContentChip[] {
  const chips: RestaurantContentChip[] = [];
  const showPromo = restaurantId.charCodeAt(1) % 2 === 0;
  const showTrending = restaurantId.charCodeAt(2) % 3 === 0;

  if (showPromo) {
    chips.push({ id: 'promo', label: '10% OFF', tone: 'promo' });
  }
  if (showTrending) {
    chips.push({ id: 'trending', label: 'Em alta', tone: 'trending' });
  }
  const categoryChip = rule.chips?.[0];
  if (categoryChip) {
    chips.push({ id: 'category', label: categoryChip, tone: 'category' });
  }
  if (chips.length < 2) {
    chips.push({ id: 'fast-benefit', label: 'Entrega rápida', tone: 'benefit' });
  }
  return chips.slice(0, 2);
}

/** Identidade visual derivada do nome/descrição do estabelecimento. */
export function getRestaurantVisualIdentity(restaurant: Restaurant): RestaurantVisualIdentity {
  const rule = detectKind(restaurant);
  const aiDesc = restaurant.deliverySettings?.aiDescription?.trim();
  let categoryLabel = rule.label;
  if (aiDesc) {
    const snippet = aiDesc.split(/[.!?\n]/)[0]?.trim();
    if (snippet && snippet.length <= 42 && !snippet.toLowerCase().includes('restaurante')) {
      categoryLabel = snippet;
    }
  }

  return {
    kind: rule.kind,
    categoryLabel,
    categoryFlag: rule.flag,
    logo: rule.logo,
    logoBrand: getBrandLogoLines(restaurant.name),
    coverBadge: pickCoverBadge(restaurant.id),
    contentChips: buildContentChips(restaurant.id, rule),
  };
}

export const CHIP_TONE_STYLES: Record<RestaurantContentChip['tone'], { bg: string; color: string; border: string }> = {
  promo: { bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' },
  trending: { bg: 'rgba(233,17,32,0.1)', color: '#E91120', border: 'rgba(233,17,32,0.18)' },
  benefit: { bg: 'rgba(16,185,129,0.12)', color: '#047857', border: 'rgba(16,185,129,0.2)' },
  category: { bg: '#FAF0DB', color: '#6B5A54', border: '#E9D7C4' },
};

export const COVER_BADGE_STYLES: Record<
  CoverBadgeKind,
  { bg: string; icon: LucideIcon; labelKey: 'fastDelivery' | 'openNow' | 'mostOrdered' | 'closed' }
> = {
  fast: { bg: 'rgba(5, 150, 105, 0.92)', icon: Zap, labelKey: 'fastDelivery' },
  open: { bg: 'rgba(5, 150, 105, 0.92)', icon: Coffee, labelKey: 'openNow' },
  popular: { bg: 'rgba(217, 119, 6, 0.92)', icon: UtensilsCrossed, labelKey: 'mostOrdered' },
  closed: { bg: 'rgba(55, 48, 46, 0.88)', icon: Clock, labelKey: 'closed' },
};
