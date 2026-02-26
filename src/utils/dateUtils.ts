/**
 * Utilitários de data para resumo do dia e filtros.
 */

/** Retorna data no formato YYYY-MM-DD (timezone local). */
export function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Hoje em YYYY-MM-DD */
export function todayString(): string {
  return toDateString(new Date());
}

/**
 * Retorna o início (00:00:00) e fim (23:59:59.999) do dia em ms para a string YYYY-MM-DD.
 */
export function dayBounds(dateStr: string): { startMs: number; endMs: number } {
  const [y, m, d] = dateStr.split('-').map(Number);
  const start = new Date(y, m - 1, d, 0, 0, 0, 0);
  const end = new Date(y, m - 1, d, 23, 59, 59, 999);
  return { startMs: start.getTime(), endMs: end.getTime() };
}

/** Data está no mesmo dia (YYYY-MM-DD)? */
export function isSameDay(date: Date, dateStr: string): boolean {
  return toDateString(date) === dateStr;
}

/** Últimos N dias a partir de hoje (array de YYYY-MM-DD). */
export function lastNDays(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < n; i++) {
    const x = new Date(d);
    x.setDate(x.getDate() - i);
    out.push(toDateString(x));
  }
  return out;
}

/** Retorna [startDate, endDate] para período 7d / 30d (endDate = hoje). */
export function periodToRange(period: '7d' | '30d'): { start: string; end: string } {
  const end = todayString();
  const endDate = new Date(end);
  const days = period === '7d' ? 7 : 30;
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - (days - 1));
  return { start: toDateString(startDate), end };
}
