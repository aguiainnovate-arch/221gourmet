import { ChevronRight } from 'lucide-react';
import { getCategoryIcon } from './categoryIcons';

interface MenuCategorySectionHeaderProps {
  title: string;
  onViewAll?: () => void;
}

export default function MenuCategorySectionHeader({
  title,
  onViewAll,
}: MenuCategorySectionHeaderProps) {
  const Icon = getCategoryIcon(title);

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-100/80">
            <Icon className="h-4 w-4 text-primary-800" strokeWidth={2.25} />
          </div>
          <h2 className="font-serif text-xl font-bold text-primary-900 truncate">{title}</h2>
        </div>
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="inline-flex shrink-0 items-center gap-0.5 text-sm font-semibold text-primary-700 hover:text-primary-900 transition-colors"
          >
            Ver todos
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="mt-2 h-px bg-gradient-to-r from-primary-300/60 via-primary-200/40 to-transparent" />
    </div>
  );
}
