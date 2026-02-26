/**
 * Busca endereço por CEP usando a API ViaCEP (gratuita).
 * https://viacep.com.br/
 */

export interface ViaCepResult {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
}

/** Remove não-dígitos do CEP */
export function normalizeCep(cep: string): string {
  return cep.replace(/\D/g, '').slice(0, 8);
}

/** Formata CEP como 12345-678 */
export function formatCep(cep: string): string {
  const n = normalizeCep(cep);
  if (n.length <= 5) return n;
  return `${n.slice(0, 5)}-${n.slice(5)}`;
}

/**
 * Busca endereço por CEP. Retorna null se CEP inválido ou não encontrado.
 */
export async function fetchAddressByCep(cep: string): Promise<ViaCepResult | null> {
  const digits = normalizeCep(cep);
  if (digits.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.erro === true) return null;
    return {
      cep: data.cep || '',
      logradouro: data.logradouro || '',
      complemento: data.complemento || '',
      bairro: data.bairro || '',
      localidade: data.localidade || '',
      uf: data.uf || '',
      ibge: data.ibge || ''
    };
  } catch {
    return null;
  }
}

/**
 * Monta uma linha de endereço para exibição/geocode: "Rua X, 123, Bairro, Cidade - UF, CEP"
 */
export function buildAddressLine(parts: {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
}): string {
  const { street, number, neighborhood, city, state, cep } = parts;
  const num = number.trim();
  const comp = (parts.complement || '').trim();
  const line1 = [street.trim(), num ? (comp ? `${num}, ${comp}` : num) : comp].filter(Boolean).join(', ');
  const line2 = [neighborhood.trim(), city.trim(), state.trim()].filter(Boolean).join(', ');
  const cepFormatted = normalizeCep(cep).length === 8 ? formatCep(cep) : cep.trim();
  const partsArr = [line1, line2].filter(Boolean);
  if (cepFormatted) partsArr.push(`CEP ${cepFormatted}`);
  return partsArr.join(' - ');
}

/**
 * Monta uma string de endereço otimizada para geocoding (Nominatim):
 * sem CEP na query, com "Brazil" no final, formato que geocoders entendem melhor.
 */
export function buildAddressForGeocode(parts: {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
}): string {
  const { street, number, neighborhood, city, state } = parts;
  const num = number.trim();
  const comp = (parts.complement || '').trim();
  const line1 = [street.trim(), num ? (comp ? `${num} ${comp}` : num) : comp].filter(Boolean).join(', ');
  const partsArr = [line1, neighborhood.trim(), city.trim(), state.trim(), 'Brazil'].filter(Boolean);
  return partsArr.join(', ');
}

/**
 * Tenta extrair CEP de uma string de endereço (ex.: "Rua X, 123, Bairro, Cidade - UF, CEP 12345-678").
 */
export function extractCepFromAddress(address: string): string {
  const match = address.match(/\b(\d{5}-?\d{3})\b/);
  return match ? normalizeCep(match[1]) : '';
}

/**
 * Tenta extrair número do endereço (ex.: "Rua X, 123" ou "Rua X, nº 123").
 */
export function extractNumberFromAddress(address: string): string {
  const match = address.match(/,?\s*n[º°]?\s*(\d{1,6})\b/i) || address.match(/,?\s*(\d{1,6})(?=\s|,|$)/);
  if (!match) return '';
  const n = match[1].trim();
  return n.length === 8 ? '' : n; // 8 dígitos é CEP, não número
}
