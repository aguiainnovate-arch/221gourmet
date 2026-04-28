import { ShoppingBag } from 'lucide-react';

interface Props {
  itemCount: number;
  subtotalLabel: string;
  itemsLabel: string;
  ctaLabel: string;
  onClick: () => void;
  accentColor?: string;
}

/**
 * Barra fixa no rodapé (estilo iFood): total sem a entrega + botão "Ver sacola".
 * Aparece só quando há itens selecionados.
 */
export default function FloatingCartBar({
  itemCount,
  subtotalLabel,
  itemsLabel,
  ctaLabel,
  onClick,
  accentColor = '#E91120',
}: Props) {
  if (itemCount <= 0) return null;

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-40 border-t border-gray-200 bg-white shadow-[0_-6px_20px_-4px_rgba(0,0,0,0.12)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="max-w-5xl mx-auto px-3 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-gray-500 font-medium">
            {subtotalLabel}
          </p>
          <p className="text-lg font-bold text-gray-900 truncate">
            {itemsLabel}
          </p>
        </div>
        <button
          type="button"
          onClick={onClick}
          className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-white active:scale-[0.98] transition-transform shadow-md"
          style={{ backgroundColor: accentColor }}
        >
          <ShoppingBag className="w-5 h-5" />
          <span>{ctaLabel}</span>
          <span className="ml-1 inline-flex items-center justify-center min-w-[22px] h-[22px] rounded-full bg-white/25 text-xs font-bold px-1.5">
            {itemCount}
          </span>
        </button>
      </div>
    </div>
  );
}
