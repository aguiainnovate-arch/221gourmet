import {
  LayoutGrid,
  CupSoda,
  Salad,
  CakeSlice,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';

const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  todos: LayoutGrid,
  bebidas: CupSoda,
  entradas: Salad,
  sobremesas: CakeSlice,
};

function normalizeCategoryKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function getCategoryIcon(name: string): LucideIcon {
  const key = normalizeCategoryKey(name);
  return CATEGORY_ICON_MAP[key] ?? UtensilsCrossed;
}
