import type { ReactNode } from 'react';
import PanelCard from './PanelCard';

interface PanelEmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
}

export default function PanelEmptyState({ icon, title, description }: PanelEmptyStateProps) {
  return (
    <PanelCard padding="lg" className="text-center">
      <div className="text-gray-400 flex justify-center mb-4">{icon}</div>
      <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-500 max-w-md mx-auto">{description}</p>}
    </PanelCard>
  );
}
