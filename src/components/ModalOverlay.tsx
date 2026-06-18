import { createPortal } from 'react-dom';
import type { MouseEvent, ReactNode } from 'react';

interface ModalOverlayProps {
  children: ReactNode;
  zIndexClass?: string;
  onBackdropClick?: () => void;
}

export default function ModalOverlay({
  children,
  zIndexClass = 'z-[100]',
  onBackdropClick,
}: ModalOverlayProps) {
  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onBackdropClick?.();
    }
  };

  return createPortal(
    <div
      className={`fixed inset-0 ${zIndexClass} flex items-center justify-center p-4 bg-black/50 w-screen h-[100dvh] min-h-screen`}
      onClick={handleBackdropClick}
      role="presentation"
    >
      {children}
    </div>,
    document.body
  );
}
