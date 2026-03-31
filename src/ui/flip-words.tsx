import { useEffect, useState } from 'react';

export interface FlipWordsProps {
  words: string[];
  duration?: number;
  className?: string;
}

export function FlipWords({ words, duration = 3000, className = '' }: FlipWordsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlippingOut, setIsFlippingOut] = useState(false);
  const [isEntering, setIsEntering] = useState(false);

  const flipDuration = 500;

  useEffect(() => {
    if (words.length <= 1) return;
    const interval = setInterval(() => {
      setIsFlippingOut(true);
      setTimeout(() => {
        setCurrentIndex((i) => (i + 1) % words.length);
        setIsFlippingOut(false);
        setIsEntering(true);
      }, flipDuration);
    }, duration);
    return () => clearInterval(interval);
  }, [words.length, duration]);

  useEffect(() => {
    if (!isEntering) return;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setIsEntering(false));
    });
    return () => cancelAnimationFrame(id);
  }, [isEntering]);

  const currentWord = words[currentIndex] ?? words[0];

  const getTransform = () => {
    // Mantém baseline estável: sem offset vertical no wrapper.
    if (isEntering) return 'rotateX(60deg)';
    if (isFlippingOut) return 'rotateX(-60deg)';
    return 'rotateX(0deg)';
  };

  return (
    <span
      className={`inline-block ${className}`}
      style={{
        perspective: '1200px',
        transformStyle: 'preserve-3d',
        lineHeight: 'inherit',
        verticalAlign: 'baseline'
      }}
    >
      <span
        className="inline-block transition-transform ease-out"
        style={{
          transform: getTransform(),
          transformOrigin: '50% 58% -8px',
          backfaceVisibility: 'hidden',
          transitionDuration: `${flipDuration}ms`,
          transitionTimingFunction: 'cubic-bezier(0.25, 0.1, 0.25, 1)'
        }}
      >
        {currentWord}
      </span>
    </span>
  );
}
