import { useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  leftIcon?: ReactNode;
  wrapperClassName?: string;
}

export default function PasswordInput({
  className = '',
  leftIcon,
  wrapperClassName = 'relative',
  disabled,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={wrapperClassName}>
      {leftIcon}
      <input
        type={visible ? 'text' : 'password'}
        disabled={disabled}
        className={`${leftIcon ? 'pl-9' : ''} pr-10 ${className}`.trim()}
        {...props}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        onClick={() => setVisible((v) => !v)}
        disabled={disabled}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}
