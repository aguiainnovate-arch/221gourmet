import type { ButtonHTMLAttributes, ReactNode } from 'react';

type PanelButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface PanelButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: PanelButtonVariant;
  icon?: ReactNode;
  children?: ReactNode;
}

const variantClass: Record<PanelButtonVariant, string> = {
  primary:
    'bg-[#e10600] text-white border border-[#e10600] hover:bg-[#c40500] shadow-sm shadow-rose-600/20',
  secondary:
    'bg-white/[0.04] text-white/80 border border-white/10 hover:bg-white/[0.08] hover:border-white/20',
  ghost: 'bg-transparent text-white/60 border border-transparent hover:bg-white/[0.06] hover:text-white',
  danger: 'bg-red-600 text-white border border-red-600 hover:bg-red-700',
};

export default function PanelButton({
  variant = 'primary',
  icon,
  children,
  className = '',
  type = 'button',
  ...props
}: PanelButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantClass[variant]} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
