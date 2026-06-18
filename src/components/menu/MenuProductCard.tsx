import { Plus, Minus, X } from 'lucide-react';
import ProductImage from '../ProductImage';
import { getProductImageSrc } from './productImageFallback';
import type { Product } from '../../types/product';

interface ExpandedItemState {
  quantity: number;
  observations: string;
}

interface MenuProductCardProps {
  product: Product;
  isExpanded: boolean;
  expandedItem?: ExpandedItemState;
  isSelected: boolean;
  quantityLabel: string;
  observationsLabel: string;
  observationsPlaceholder: string;
  addToOrderLabel: string;
  removeLabel: string;
  minLabel: string;
  onCardClick: () => void;
  onAddClick: (e: React.MouseEvent) => void;
  onImageClick: (e: React.MouseEvent, src: string, alt: string) => void;
  onQuantityChange: (quantity: number) => void;
  onObservationsChange: (observations: string) => void;
  onConfirmAdd: (e: React.MouseEvent) => void;
  onRemove: (e: React.MouseEvent) => void;
}

export default function MenuProductCard({
  product,
  isExpanded,
  expandedItem,
  isSelected,
  quantityLabel,
  observationsLabel,
  observationsPlaceholder,
  addToOrderLabel,
  removeLabel,
  minLabel,
  onCardClick,
  onAddClick,
  onImageClick,
  onQuantityChange,
  onObservationsChange,
  onConfirmAdd,
  onRemove,
}: MenuProductCardProps) {
  const imageSrc = getProductImageSrc(product.image, product.name, product.category);

  return (
    <article className="menu-product-card overflow-hidden rounded-2xl bg-white shadow-[0_4px_20px_rgba(75,0,130,0.08)] transition-shadow duration-200 hover:shadow-[0_6px_24px_rgba(75,0,130,0.12)]">
      <div
        className="relative flex gap-3.5 p-4 cursor-pointer active:bg-primary-50/30 transition-colors"
        onClick={onCardClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onCardClick();
          }
        }}
      >
        <div
          className="shrink-0 w-[5.5rem] h-[5.5rem] rounded-xl overflow-hidden bg-primary-50"
          onClick={(e) => onImageClick(e, imageSrc, product.name)}
        >
          <ProductImage
            src={imageSrc}
            alt={product.name}
            className="w-full h-full object-cover"
            containerClassName="w-[5.5rem] h-[5.5rem]"
          />
        </div>

        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 pr-10">
          <div>
            <h3 className="font-serif text-base font-bold text-primary-900 leading-snug line-clamp-2">
              {product.name}
            </h3>
            {product.description && (
              <p className="mt-1 text-xs text-primary-700/70 leading-relaxed line-clamp-2">
                {product.description}
              </p>
            )}
          </div>
          <p className="mt-2 text-base font-bold text-primary-800">
            R$ {product.price.toFixed(2).replace('.', ',')}
          </p>
        </div>

        <button
          type="button"
          onClick={onAddClick}
          className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-800 shadow-sm hover:bg-primary-200 active:scale-95 transition-all"
          aria-label={addToOrderLabel}
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} />
        </button>
      </div>

      {isExpanded && expandedItem && (
        <div className="border-t border-primary-100 bg-primary-50/40 px-4 py-4 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-primary-800 mb-2">
              {quantityLabel}
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (expandedItem.quantity > 1) {
                    onQuantityChange(expandedItem.quantity - 1);
                  }
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-primary-800 shadow-sm hover:bg-primary-100 transition-colors"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="min-w-[2rem] text-center text-lg font-bold text-primary-900">
                {expandedItem.quantity}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onQuantityChange(expandedItem.quantity + 1);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-primary-800 shadow-sm hover:bg-primary-100 transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-primary-800 mb-2">
              {observationsLabel}
            </label>
            <textarea
              placeholder={observationsPlaceholder}
              value={expandedItem.observations}
              onChange={(e) => onObservationsChange(e.target.value)}
              className="w-full rounded-xl border border-primary-200 bg-white p-3 text-sm text-primary-900 placeholder:text-primary-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 resize-none"
              rows={2}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {product.preparationTime !== undefined && product.preparationTime !== null && product.preparationTime > 0 && (
            <p className="text-xs text-primary-600">
              {product.preparationTime} {minLabel}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onConfirmAdd}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary-800 py-3 text-sm font-semibold text-white shadow-md hover:bg-primary-900 transition-colors"
            >
              <Plus className="h-4 w-4" />
              {addToOrderLabel}
            </button>
            {isSelected && (
              <button
                type="button"
                onClick={onRemove}
                className="flex items-center gap-2 rounded-xl bg-red-500 px-4 py-3 text-sm font-semibold text-white hover:bg-red-600 transition-colors"
              >
                <X className="h-4 w-4" />
                {removeLabel}
              </button>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
