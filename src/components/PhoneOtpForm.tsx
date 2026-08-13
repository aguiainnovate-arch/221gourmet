import type { FormEvent } from 'react';
import { ShieldCheck } from 'lucide-react';
import { formatPhoneDisplay, normalizePhone } from '../utils/authInputUtils';

interface PhoneOtpFormProps {
  phone: string;
  code: string;
  onCodeChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  onResend: () => void;
  onBack: () => void;
  isSubmitting: boolean;
  submitLabel?: string;
}

/** Passo de digitação do código SMS (6 dígitos). */
export default function PhoneOtpForm({
  phone,
  code,
  onCodeChange,
  onSubmit,
  onResend,
  onBack,
  isSubmitting,
  submitLabel = 'Confirmar e entrar',
}: PhoneOtpFormProps) {
  const displayPhone = formatPhoneDisplay(normalizePhone(phone));

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div
        className="rounded-lg border px-3 py-2.5 text-xs"
        style={{ borderColor: '#E9D7C4', backgroundColor: '#FAF0DB', color: '#6B5A54' }}
      >
        Enviamos um código SMS para <span className="font-semibold" style={{ color: '#2A1E1A' }}>{displayPhone}</span>.
        Digite o código de 6 dígitos para continuar.
      </div>

      <div>
        <label className="block text-xs font-semibold mb-1" style={{ color: '#2A1E1A' }}>
          Código de verificação
        </label>
        <div className="relative">
          <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#6B5A54' }} />
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(e) => onCodeChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm tracking-[0.35em] font-semibold focus:outline-none focus:ring-2 focus:ring-[#E91120]/30 focus:border-[#E91120]"
            style={{ borderColor: '#E9D7C4', backgroundColor: '#FAF0DB', color: '#2A1E1A' }}
            placeholder="000000"
            required
            autoFocus
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 pt-1">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 px-4 py-2.5 border-2 rounded-lg font-semibold text-sm transition-colors hover:bg-[#FAF0DB]"
          style={{ borderColor: '#E9D7C4', color: '#2A1E1A' }}
        >
          Voltar
        </button>
        <button
          type="submit"
          disabled={isSubmitting || code.length !== 6}
          className="flex-1 px-4 py-2.5 rounded-lg font-bold text-sm text-white disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-md hover:opacity-90"
          style={{ backgroundColor: isSubmitting || code.length !== 6 ? undefined : '#E91120' }}
        >
          {isSubmitting ? 'Verificando...' : submitLabel}
        </button>
      </div>

      <button
        type="button"
        onClick={onResend}
        disabled={isSubmitting}
        className="w-full text-xs font-medium underline-offset-2 hover:underline disabled:opacity-50"
        style={{ color: '#E91120' }}
      >
        Reenviar código SMS
      </button>
    </form>
  );
}
