import type { ReactNode } from 'react';

interface PanelTabGroupProps {
  children: ReactNode;
  className?: string;
}

export function PanelTabGroup({ children, className = '' }: PanelTabGroupProps) {
  return (
    <div
      className={`inline-flex flex-wrap gap-1 p-1 bg-gray-100 rounded-lg border border-gray-200 ${className}`}
      role="tablist"
    >
      {children}
    </div>
  );
}

interface PanelTabProps {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  badge?: number;
}

export function PanelTab({ active, onClick, children, badge }: PanelTabProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`px-4 py-2 rounded-md text-sm font-medium transition-all inline-flex items-center gap-2 whitespace-nowrap ${
        active
          ? 'bg-white text-blue-700 shadow-sm'
          : 'text-gray-600 hover:text-gray-900'
      }`}
    >
      {children}
      {badge !== undefined && badge > 0 && (
        <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-amber-500 text-white text-xs font-semibold">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
}
