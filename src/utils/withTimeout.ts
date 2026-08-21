/** Rejeita se a promise não resolver dentro do prazo (evita spinner infinito no app nativo). */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label = 'operação'
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout (${ms}ms): ${label}`));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}
