import type { ReactNode } from 'react';

interface PanelPageHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  /** CTA principal (fica na linha do título) */
  actions?: ReactNode;
  /** Ferramentas secundárias (barra abaixo, largura total) */
  toolbar?: ReactNode;
  tabs?: ReactNode;
}

export default function PanelPageHeader({
  title,
  description,
  icon,
  actions,
  toolbar,
  tabs,
}: PanelPageHeaderProps) {
  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {icon && (
            <div className="shrink-0 p-2.5 rounded-xl bg-[#e10600]/10 text-[#e10600] border border-[#e10600]/15">
              {icon}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold text-gray-900 tracking-tight">{title}</h2>
            {description && (
              <p className="text-sm text-gray-500 mt-1.5 leading-relaxed max-w-2xl">
                {description}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 shrink-0 sm:justify-end">
            {actions}
          </div>
        )}
      </div>

      {toolbar && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm">
          {toolbar}
        </div>
      )}

      {tabs && <div>{tabs}</div>}
    </div>
  );
}
