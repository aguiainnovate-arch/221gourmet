import { useState } from 'react';
import { LogOut } from 'lucide-react';

interface SidebarLogoutButtonProps {
  onConfirm: () => void;
}

export default function SidebarLogoutButton({ onConfirm }: SidebarLogoutButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div>
      {showConfirm && (
        <div className="mb-3 p-3 bg-white border border-gray-200 rounded-lg shadow-md">
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
        onClick={() => setShowConfirm(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#8B0000] hover:bg-[#6B0000] text-white font-medium transition-colors"
        title="Sair"
      >
        <LogOut className="w-5 h-5" />
        Sair
      </button>
    </div>
  );
}
