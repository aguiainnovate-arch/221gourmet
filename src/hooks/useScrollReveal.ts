import { useEffect, useRef, useState } from 'react';

/**
 * useScrollReveal — Revela o elemento quando entra na viewport (scroll reveal).
 *
 * Inspirado no ScrollReveal do projeto descopacte: ao rolar a página, elementos
 * ganham a classe "revealed" quando cruzam um threshold da viewport, permitindo
 * animações CSS (opacity, transform) para aumentar o engajamento sem prejudicar
 * a usabilidade.
 *
 * Como funciona:
 * - Intersection Observer observa o elemento; quando a fração visível passa do
 *   threshold (ex.: 15%), o estado isRevealed vira true.
 * - Uma vez revelado, permanece revelado (não some ao rolar para cima), para
 *   evitar animações repetidas que distraem.
 *
 * @param threshold Fração do elemento que precisa estar visível (0–1). Default 0.15.
 * @param rootMargin Margem em torno do viewport (ex.: "0px 0px -80px 0px" para ativar um pouco antes).
 */
export function useScrollReveal(
  threshold: number = 0.15,
  rootMargin: string = '0px 0px -60px 0px'
) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  const revealedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !revealedRef.current) {
          revealedRef.current = true;
          setIsRevealed(true);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return { ref, isRevealed };
}
