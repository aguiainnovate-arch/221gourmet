import type { ReactNode } from 'react';
import { panelCardClass } from './panelStyles';

interface PanelCardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingClass = {
  none: '',
  sm: 'p-4',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-8',
};

export default function PanelCard({
  children,
  className = '',
  padding = 'md',
}: PanelCardProps) {
  return (
    <div className={`${panelCardClass} ${paddingClass[padding]} ${className}`}>
      {children}
    </div>
  );
}

interface PanelCardHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  bordered?: boolean;
}

export function PanelCardHeader({
  title,
  description,
  actions,
  bordered = true,
}: PanelCardHeaderProps) {
  return (
    <div
      className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${
        bordered ? 'pb-4 mb-4 border-b border-gray-100' : 'mb-4'
      }`}
    >
      <div>
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
