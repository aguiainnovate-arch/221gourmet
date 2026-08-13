import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  PHONE_COUNTRIES,
  buildE164,
  splitPhoneE164,
  formatNationalDisplay,
  getCountryByIso,
  type PhoneCountry,
} from '../utils/phoneCountries';

type Variant = 'delivery' | 'modal';

interface PhoneWithCountryInputProps {
  /** Valor completo em E.164 (ex.: +5511999999999) ou vazio. */
  value: string;
  onChange: (e164: string) => void;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  variant?: Variant;
  className?: string;
}

const stylesByVariant: Record<
  Variant,
  { shell: CSSProperties; select: CSSProperties; input: CSSProperties }
> = {
  delivery: {
    shell: { borderColor: '#E9D7C4', backgroundColor: '#FAF0DB', color: '#2A1E1A' },
    select: { backgroundColor: '#FAF0DB', color: '#2A1E1A' },
    input: { backgroundColor: 'transparent', color: '#2A1E1A' },
  },
  modal: {
    shell: { borderColor: '#D1D5DB', backgroundColor: '#fff', color: '#000' },
    select: { backgroundColor: '#fff', color: '#000' },
    input: { backgroundColor: 'transparent', color: '#000' },
  },
};

/**
 * Telefone com seletor de país (DDI) + número nacional (DDD + celular).
 * Emite sempre E.164 via onChange.
 */
export default function PhoneWithCountryInput({
  value,
  onChange,
  required,
  disabled,
  id,
  variant = 'delivery',
  className = '',
}: PhoneWithCountryInputProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const parsed = useMemo(() => splitPhoneE164(value), [value]);
  const [country, setCountry] = useState<PhoneCountry>(parsed.country);
  const [national, setNational] = useState(parsed.national);

  useEffect(() => {
    const next = splitPhoneE164(value);
    setCountry(next.country);
    setNational(next.national);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const emit = (nextCountry: PhoneCountry, nextNational: string) => {
    const digits = nextNational.replace(/\D/g, '').slice(0, nextCountry.maxNational);
    setNational(digits);
    onChange(buildE164(nextCountry.dial, digits));
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PHONE_COUNTRIES;
    return PHONE_COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dial.includes(q) ||
        c.iso.toLowerCase().includes(q)
    );
  }, [query]);

  const visual = stylesByVariant[variant];
  const displayNational = formatNationalDisplay(national, country.iso);
  const inputId = id || `phone-${listId}`;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <div
        className="flex items-stretch border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#E91120]/30 focus-within:border-[#E91120]"
        style={visual.shell}
      >
        <button
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 shrink-0 px-2.5 text-sm font-medium border-r disabled:opacity-50"
          style={{
            ...visual.select,
            borderColor: variant === 'delivery' ? '#E9D7C4' : '#D1D5DB',
          }}
        >
          <span className="text-base leading-none" aria-hidden>
            {country.flag}
          </span>
          <span className="tabular-nums">+{country.dial}</span>
          <ChevronDown className={`w-3.5 h-3.5 opacity-70 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        <input
          id={inputId}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          required={required}
          disabled={disabled}
          value={displayNational}
          placeholder={country.placeholder}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '').slice(0, country.maxNational);
            emit(country, digits);
          }}
          className="flex-1 min-w-0 px-3 py-2 text-sm focus:outline-none"
          style={visual.input}
        />
      </div>

      {open && (
        <div
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 w-full max-h-56 overflow-hidden rounded-lg border shadow-lg"
          style={{
            borderColor: variant === 'delivery' ? '#E9D7C4' : '#D1D5DB',
            backgroundColor: '#fff',
          }}
        >
          <div className="p-2 border-b" style={{ borderColor: '#F3E8DE' }}>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar país…"
              className="w-full px-2.5 py-1.5 text-sm rounded-md border focus:outline-none focus:ring-1 focus:ring-[#E91120]"
              style={{ borderColor: '#E9D7C4', color: '#2A1E1A' }}
              autoFocus
            />
          </div>
          <ul className="max-h-44 overflow-y-auto py-1">
            {filtered.map((c) => {
              const selected = c.iso === country.iso;
              return (
                <li key={c.iso}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-[#FFF8F2]"
                    style={{
                      backgroundColor: selected ? 'rgba(233,17,32,0.06)' : undefined,
                      color: '#2A1E1A',
                    }}
                    onClick={() => {
                      const next = getCountryByIso(c.iso);
                      setCountry(next);
                      setOpen(false);
                      setQuery('');
                      emit(next, national);
                    }}
                  >
                    <span className="text-base">{c.flag}</span>
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="tabular-nums text-xs opacity-70">+{c.dial}</span>
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-xs" style={{ color: '#6B5A54' }}>
                Nenhum país encontrado.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
