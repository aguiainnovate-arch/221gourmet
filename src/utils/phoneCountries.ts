/**
 * Países / DDI para o seletor de telefone (Phone Auth).
 */

export interface PhoneCountry {
  iso: string;
  name: string;
  dial: string; // sem +, ex.: "55"
  flag: string;
  /** Dígitos nacionais máximos (sem DDI). */
  maxNational: number;
  placeholder: string;
}

/** Lista curta focada no público do app (BR primeiro). */
export const PHONE_COUNTRIES: PhoneCountry[] = [
  { iso: 'BR', name: 'Brasil', dial: '55', flag: '🇧🇷', maxNational: 11, placeholder: '11 99999-9999' },
  { iso: 'US', name: 'Estados Unidos', dial: '1', flag: '🇺🇸', maxNational: 10, placeholder: '201 555 0123' },
  { iso: 'PT', name: 'Portugal', dial: '351', flag: '🇵🇹', maxNational: 9, placeholder: '912 345 678' },
  { iso: 'AR', name: 'Argentina', dial: '54', flag: '🇦🇷', maxNational: 10, placeholder: '11 2345-6789' },
  { iso: 'PY', name: 'Paraguai', dial: '595', flag: '🇵🇾', maxNational: 9, placeholder: '981 123456' },
  { iso: 'UY', name: 'Uruguai', dial: '598', flag: '🇺🇾', maxNational: 8, placeholder: '94 123 456' },
  { iso: 'CL', name: 'Chile', dial: '56', flag: '🇨🇱', maxNational: 9, placeholder: '9 1234 5678' },
  { iso: 'CO', name: 'Colômbia', dial: '57', flag: '🇨🇴', maxNational: 10, placeholder: '300 123 4567' },
  { iso: 'MX', name: 'México', dial: '52', flag: '🇲🇽', maxNational: 10, placeholder: '55 1234 5678' },
  { iso: 'ES', name: 'Espanha', dial: '34', flag: '🇪🇸', maxNational: 9, placeholder: '612 345 678' },
  { iso: 'FR', name: 'França', dial: '33', flag: '🇫🇷', maxNational: 9, placeholder: '6 12 34 56 78' },
  { iso: 'IT', name: 'Itália', dial: '39', flag: '🇮🇹', maxNational: 10, placeholder: '312 345 6789' },
  { iso: 'DE', name: 'Alemanha', dial: '49', flag: '🇩🇪', maxNational: 11, placeholder: '1512 3456789' },
  { iso: 'GB', name: 'Reino Unido', dial: '44', flag: '🇬🇧', maxNational: 10, placeholder: '7400 123456' },
];

export const DEFAULT_PHONE_COUNTRY = PHONE_COUNTRIES[0];

export function getCountryByIso(iso: string): PhoneCountry {
  return PHONE_COUNTRIES.find((c) => c.iso === iso) || DEFAULT_PHONE_COUNTRY;
}

export function getCountryByDial(dial: string): PhoneCountry | undefined {
  const d = dial.replace(/^\+/, '');
  // Prefer longer dial matches (351 before 3…)
  const sorted = [...PHONE_COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
  return sorted.find((c) => d === c.dial || d.startsWith(c.dial));
}

/** Monta E.164 a partir do DDI e dígitos nacionais. */
export function buildE164(dial: string, nationalDigits: string): string {
  const d = dial.replace(/\D/g, '');
  const n = nationalDigits.replace(/\D/g, '');
  if (!n) return '';
  return `+${d}${n}`;
}

/**
 * Separa um E.164 (ou valor parcial) em país + dígitos nacionais.
 * Se não reconhecer o DDI, assume Brasil.
 */
export function splitPhoneE164(value: string): { country: PhoneCountry; national: string } {
  const digits = value.replace(/\D/g, '');
  if (!digits) {
    return { country: DEFAULT_PHONE_COUNTRY, national: '' };
  }

  const sorted = [...PHONE_COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
  for (const country of sorted) {
    if (digits.startsWith(country.dial) && digits.length > country.dial.length) {
      return {
        country,
        national: digits.slice(country.dial.length).slice(0, country.maxNational),
      };
    }
  }

  // Valor só com dígitos nacionais (sem DDI) — Brasil
  if (digits.length <= 11) {
    return { country: DEFAULT_PHONE_COUNTRY, national: digits.slice(0, 11) };
  }

  return { country: DEFAULT_PHONE_COUNTRY, national: digits.slice(0, 11) };
}

/** Formata dígitos nacionais para exibição (BR: (11) 99999-9999). */
export function formatNationalDisplay(digits: string, iso: string): string {
  const d = digits.replace(/\D/g, '');
  if (iso === 'BR') {
    if (d.length <= 2) return d;
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) {
      return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    }
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`;
  }
  // Genérico: grupos de 3–4
  if (d.length <= 3) return d;
  const parts: string[] = [];
  let i = 0;
  while (i < d.length) {
    const size = d.length - i > 4 ? 3 : Math.min(4, d.length - i);
    parts.push(d.slice(i, i + size));
    i += size;
  }
  return parts.join(' ');
}
