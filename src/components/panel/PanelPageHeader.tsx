import type { ReactNode } from 'react';

interface PanelPageHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  tabs?: ReactNode;
}

export default function PanelPageHeader({
  title,
  description,
  icon,
  actions,
  tabs,
}: PanelPageHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          {icon && (
            <div className="shrink-0 p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-gray-900 tracking-tight">{title}</h2>
            {description && (
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">{description}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>
      {tabs && <div className="mt-4">{tabs}</div>}
    </div>
  );
}
