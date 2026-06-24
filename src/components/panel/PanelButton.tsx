import type { ButtonHTMLAttributes, ReactNode } from 'react';

type PanelButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface PanelButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: PanelButtonVariant;
  icon?: ReactNode;
  children?: ReactNode;
}

const variantClass: Record<PanelButtonVariant, string> = {
  primary: 'bg-blue-600 text-white border border-blue-600 hover:bg-blue-700',
  secondary:
    'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400',
  ghost: 'bg-transparent text-gray-600 border border-transparent hover:bg-gray-100',
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
