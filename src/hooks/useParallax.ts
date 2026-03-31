import { useEffect, useRef, useState } from 'react';

/**
 * useParallax — Efeito parallax baseado em scroll (sem GSAP).
 *
 * Como funciona:
 * - Lê a posição do scroll da janela e a posição do elemento no viewport.
 * - Aplica um fator de velocidade (speed) ao deslocamento: valores entre 0 e 1
 *   fazem o elemento mover-se mais devagar que o scroll (parallax clássico);
 *   valor 0.5 = metade da velocidade do scroll.
 * - Usa requestAnimationFrame e throttling para performance.
 * - Em viewports estreitas (mobile), o efeito é reduzido para evitar enjoo e
 *   manter usabilidade.
 *
 * @param speed Fator de movimento (0 = fixo, 0.5 = metade do scroll, 1 = igual ao scroll). Recomendado: 0.2–0.4 para fundos.
 * @param options { disableBelowWidth: number } — desativa parallax abaixo dessa largura (default 768).
 */
export function useParallax(
  speed: number = 0.25,
  options: { disableBelowWidth?: number } = {}
) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [transform, setTransform] = useState({ y: 0 });
  const rafId = useRef<number | null>(null);
  const disableBelowWidth = options.disableBelowWidth ?? 768;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let ticking = false;
    const update = () => {
      const w = window.innerWidth;
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (w < disableBelowWidth || prefersReducedMotion) {
        setTransform({ y: 0 });
        ticking = false;
        return;
      }

      const rect = el.getBoundingClientRect();
      const elCenterY = rect.top + rect.height / 2;
      const viewportCenter = window.innerHeight / 2;
      // Distância do centro do elemento ao centro da viewport (positivo = abaixo)
      const offset = elCenterY - viewportCenter;
      // Movimento suave: quanto mais o elemento "sai" do centro, mais desloca (com speed)
      const y = offset * speed * 0.15;
      setTransform({ y });
      ticking = false;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      rafId.current = requestAnimationFrame(update);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    update(); // valor inicial

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId.current != null) cancelAnimationFrame(rafId.current);
    };
  }, [speed, disableBelowWidth]);

  return { ref, transform };
}
