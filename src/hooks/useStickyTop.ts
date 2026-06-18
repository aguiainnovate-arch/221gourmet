import { useEffect, useRef, useState } from 'react';

/**
 * Detecta quando um elemento sticky está "preso" no topo da viewport.
 * Coloque o sentinel imediatamente acima do container sticky.
 */
export function useStickyTop() {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isStuck, setIsStuck] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsStuck(!entry.isIntersecting),
      { threshold: 0, rootMargin: '0px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return { sentinelRef, isStuck };
}
