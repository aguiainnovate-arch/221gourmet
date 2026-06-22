import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface FilterOption {
  value: string;
  label: string;
  dotClass?: string;
}

interface FilterDropdownProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  minWidth?: string;
}

export default function FilterDropdown({
  label,
  value,
  onChange,
  options,
  minWidth = '9.5rem',
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <span className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
        {label}
      </span>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center justify-between gap-2 w-full rounded-lg border bg-white px-3 py-2 text-sm text-black shadow-sm transition-colors hover:border-amber-300 hover:bg-amber-50/40 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 ${
          open ? 'border-amber-400 ring-2 ring-amber-100' : 'border-gray-200'
        }`}
        style={{ minWidth }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 min-w-0 truncate">
          {selected.dotClass && (
            <span className={`h-2 w-2 shrink-0 rounded-full ${selected.dotClass}`} />
          )}
          <span className="truncate font-medium">{selected.label}</span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className="absolute left-0 top-[calc(100%+6px)] z-50 w-full min-w-[12rem] overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
          role="listbox"
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                  isSelected
                    ? 'bg-amber-50 text-amber-900 font-medium'
                    : 'text-black hover:bg-gray-50'
                }`}
              >
                {option.dotClass ? (
                  <span className={`h-2 w-2 shrink-0 rounded-full ${option.dotClass}`} />
                ) : (
                  <span className="h-2 w-2 shrink-0" />
                )}
                <span className="flex-1 truncate">{option.label}</span>
                {isSelected && <Check className="h-4 w-4 shrink-0 text-amber-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
