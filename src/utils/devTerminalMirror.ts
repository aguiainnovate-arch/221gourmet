/**
 * Em desenvolvimento, espelha mensagens para o terminal do Vite (POST /__dev-client-log).
 * Em produção ou build preview sem o plugin, só executa console.* no browser.
 */

function serializeParts(parts: unknown[]): string {
  return parts
    .map((p) => {
      if (p === undefined) return '';
      if (typeof p === 'string') return p;
      if (p instanceof Error) return `${p.name}: ${p.message}`;
      try {
        return JSON.stringify(p);
      } catch {
        return String(p);
      }
    })
    .filter(Boolean)
    .join(' ');
}

function mirror(level: 'log' | 'warn' | 'error', parts: unknown[]): void {
  if (!import.meta.env.DEV) return;
  const message = serializeParts(parts);
  void fetch('/__dev-client-log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ level, message })
  }).catch(() => {
    /* silencioso: preview/build sem middleware */
  });
}

export function devLog(...args: unknown[]): void {
  // eslint-disable-next-line no-console
  console.log(...args);
  mirror('log', args);
}

export function devWarn(...args: unknown[]): void {
  // eslint-disable-next-line no-console
  console.warn(...args);
  mirror('warn', args);
}

export function devError(...args: unknown[]): void {
  // eslint-disable-next-line no-console
  console.error(...args);
  mirror('error', args);
}
