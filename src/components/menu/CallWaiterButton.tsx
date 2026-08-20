import { Bell, Check, Loader2 } from 'lucide-react';

interface CallWaiterButtonProps {
  calling: boolean;
  pending: boolean;
  disabled?: boolean;
  callLabel: string;
  calledLabel: string;
  hintLabel: string;
  calledHintLabel: string;
  onCall: () => void;
}

export default function CallWaiterButton({
  calling,
  pending,
  disabled = false,
  callLabel,
  calledLabel,
  hintLabel,
  calledHintLabel,
  onCall,
}: CallWaiterButtonProps) {
  const busy = calling || pending || disabled;

  return (
    <div className="px-4 -mt-1 mb-5 max-w-lg mx-auto">
      <button
        type="button"
        onClick={onCall}
        disabled={busy}
        aria-live="polite"
        className={`relative w-full overflow-hidden rounded-2xl px-5 py-4 text-left shadow-[0_10px_28px_rgba(180,60,20,0.28)] transition-all duration-200 ${
          pending
            ? 'bg-emerald-600 text-white'
            : calling
              ? 'bg-amber-400 text-white cursor-wait'
              : disabled
                ? 'bg-gray-300 text-gray-600 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white hover:brightness-110 active:scale-[0.98]'
        }`}
      >
        {!pending && !calling && !disabled && (
          <span
            className="pointer-events-none absolute inset-0 animate-pulse bg-white/10"
            aria-hidden="true"
          />
        )}
        <span className="relative z-10 flex items-center gap-3">
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
              pending ? 'bg-white/20' : 'bg-white/25'
            }`}
          >
            {calling ? (
              <Loader2 className="h-7 w-7 animate-spin" strokeWidth={2.5} />
            ) : pending ? (
              <Check className="h-7 w-7" strokeWidth={2.5} />
            ) : (
              <Bell className="h-7 w-7" strokeWidth={2.5} />
            )}
          </span>
          <span className="min-w-0">
            <span className="block font-serif text-xl font-bold leading-tight">
              {pending ? calledLabel : callLabel}
            </span>
            <span className="mt-0.5 block text-sm font-medium text-white/90">
              {pending ? calledHintLabel : hintLabel}
            </span>
          </span>
        </span>
      </button>
    </div>
  );
}
