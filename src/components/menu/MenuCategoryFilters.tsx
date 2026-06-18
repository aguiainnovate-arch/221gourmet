import { getCategoryIcon } from './categoryIcons';
import { useStickyTop } from '../../hooks/useStickyTop';

interface CategoryOption {
  id: string;
  name: string;
  displayName: string;
}

interface MenuCategoryFiltersProps {
  selectedCategory: string;
  categories: CategoryOption[];
  allLabel: string;
  onSelect: (category: string) => void;
  sticky?: boolean;
}

export default function MenuCategoryFilters({
  selectedCategory,
  categories,
  allLabel,
  onSelect,
  sticky = true,
}: MenuCategoryFiltersProps) {
  const { sentinelRef, isStuck } = useStickyTop();

  const options: CategoryOption[] = [
    { id: 'todos', name: 'todos', displayName: allLabel },
    ...categories,
  ];

  return (
    <div className="mb-7">
      {sticky && <div ref={sentinelRef} className="h-px w-full" aria-hidden="true" />}

      <div
        className={
          sticky
            ? `menu-category-filters-sticky sticky top-0 z-30 -mx-4 px-4 transition-shadow duration-200 ${
                isStuck ? 'menu-category-filters-stuck py-2.5' : 'py-1'
              }`
            : '-mx-4 px-4'
        }
        data-stuck={sticky && isStuck ? 'true' : 'false'}
      >
        <div
          className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {options.map((option) => {
            const isActive =
              option.name === 'todos'
                ? selectedCategory === 'todos'
                : selectedCategory === option.name;
            const Icon = getCategoryIcon(option.name === 'todos' ? 'todos' : option.displayName);

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onSelect(option.name === 'todos' ? 'todos' : option.name)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-primary-800 text-white shadow-[0_4px_14px_rgba(75,0,130,0.25)]'
                    : 'bg-white text-primary-800 shadow-[0_2px_8px_rgba(75,0,130,0.08)] border border-primary-100'
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={2.25} />
                {option.displayName}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
