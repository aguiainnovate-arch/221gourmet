import type { ReactNode } from 'react';
import PanelCard from './PanelCard';

interface PanelStatCardProps {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  iconClassName?: string;
}

export default function PanelStatCard({
  label,
  value,
  icon,
  iconClassName = 'bg-blue-50 text-blue-600',
}: PanelStatCardProps) {
  return (
    <PanelCard padding="md">
      <div className="flex items-center gap-4">
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconClassName}`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="text-2xl font-semibold text-gray-900 tracking-tight">{value}</p>
        </div>
      </div>
    </PanelCard>
  );
}
