/**
 * Utilitários de formatação e parsing de moeda (BRL).
 */

/** Formata número como R$ X.XXX,XX */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

/**
 * Converte string de input (ex: "12,50" ou "12.50") para número >= 0.
 * Aceita apenas dígitos, uma vírgula ou um ponto como decimal.
 */
export function parseCurrencyInput(input: string): number {
  const normalized = input
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const parsed = parseFloat(normalized);
  if (Number.isNaN(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100) / 100;
}

/**
 * Máscara de input: aceita apenas números e uma vírgula decimal.
 * Retorna string no formato "0,00" para exibição no campo.
 */
export function formatCurrencyInput(value: number): string {
  if (value === 0) return '';
  return value.toFixed(2).replace('.', ',');
}

/**
 * Valor a partir de string do input (pode conter R$, pontos, vírgula).
 */
export function fromCurrencyField(raw: string): number {
  const cleaned = raw.replace(/[^\d,]/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isNaN(n) || n < 0 ? 0 : Math.round(n * 100) / 100;
}

/**
 * Para exibir no campo: "R$ 12,50" ou vazio se 0.
 */
export function toCurrencyField(value: number): string {
  if (value === 0) return '';
  return formatCurrency(value);
}
