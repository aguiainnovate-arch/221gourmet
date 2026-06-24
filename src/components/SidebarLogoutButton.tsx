import { useEffect, useRef, useState } from 'react';
import { LogOut } from 'lucide-react';

const INTERACTIVE_SELECTOR =
  'button, a, input, select, textarea, label, [role="button"], [role="link"]';

interface SidebarLogoutButtonProps {
  onConfirm: () => void;
  collapsed?: boolean;
}

export default function SidebarLogoutButton({ onConfirm, collapsed = false }: SidebarLogoutButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const confirmRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showConfirm) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (confirmRef.current?.contains(target)) return;
      if (target.closest(INTERACTIVE_SELECTOR)) return;
      setShowConfirm(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [showConfirm]);

  return (
    <div className={collapsed ? 'relative' : undefined}>
      {showConfirm && (
        <div
          ref={confirmRef}
          className={`p-3 bg-white border border-gray-200 rounded-lg shadow-md z-50 ${
            collapsed
              ? 'absolute left-full top-1/2 -translate-y-1/2 ml-2 w-48'
              : 'mb-3'
          }`}
        >
          <p className="text-sm font-medium text-black mb-3">Deseja mesmo sair?</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setShowConfirm(false);
                onConfirm();
              }}
              className="flex-1 px-3 py-1.5 rounded-lg bg-[#8B0000] hover:bg-[#6B0000] text-white text-sm font-medium"
            >
              Sim
            </button>
            <button
              type="button"
              onClick={() => setShowConfirm(false)}
              className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 text-black text-sm font-medium hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setShowConfirm((prev) => !prev)}
        className={`w-full flex items-center rounded-lg bg-[#8B0000] hover:bg-[#6B0000] text-white font-medium transition-colors ${
          collapsed ? 'justify-center p-3' : 'justify-center gap-2 px-4 py-3'
        }`}
        title="Sair"
      >
        <LogOut className="w-5 h-5 shrink-0" />
        <span
          className={`overflow-hidden whitespace-nowrap transition-all duration-200 ${
            collapsed ? 'max-w-0 opacity-0 delay-0' : 'max-w-[4rem] opacity-100 delay-150'
          }`}
        >
          Sair
        </span>
      </button>
    </div>
  );
}
