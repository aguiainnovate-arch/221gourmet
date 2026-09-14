import { Check, Loader2, QrCode, Sparkles, X } from 'lucide-react';
import ModalOverlay from './ModalOverlay';
import { DIGITAL_MENU_OFFER } from '../types/digitalMenuOffer';

interface DigitalMenuUpsellModalProps {
  open: boolean;
  submitting?: boolean;
  onAccept: () => void;
  onDismiss: () => void;
}

const tokens = {
  cream: '#FAF0DB',
  base: '#F5EFE7',
  ink: '#2A1E1A',
  muted: '#6B5A54',
  accent: '#E91120',
  accentDeep: '#B40E18',
  card: '#FFFFFF',
  border: '#E9D7C4',
};

export default function DigitalMenuUpsellModal({
  open,
  submitting = false,
  onAccept,
  onDismiss,
}: DigitalMenuUpsellModalProps) {
  if (!open) return null;

  return (
    <ModalOverlay onBackdropClick={submitting ? undefined : onDismiss} zIndexClass="z-[130]">
      <div
        className="relative w-full max-w-md rounded-3xl border shadow-xl overflow-hidden max-h-[90dvh] overflow-y-auto"
        style={{ background: tokens.card, borderColor: tokens.border, color: tokens.ink }}
        role="dialog"
        aria-labelledby="digital-menu-upsell-title"
      >
        <div
          className="px-6 pt-6 pb-4"
          style={{
            background: `linear-gradient(165deg, ${tokens.cream} 0%, ${tokens.base} 100%)`,
          }}
        >
          <button
            type="button"
            onClick={onDismiss}
            disabled={submitting}
            className="absolute top-4 right-4 p-1.5 rounded-full opacity-70 hover:opacity-100 disabled:opacity-40"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>

          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-3"
            style={{ background: tokens.accent, color: '#fff' }}
          >
            <QrCode className="w-6 h-6" />
          </div>

          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: tokens.accent }}>
            Nova oferta
          </p>
          <h2 id="digital-menu-upsell-title" className="mt-1 text-xl font-extrabold leading-snug">
            {DIGITAL_MENU_OFFER.headline}
          </h2>
          <p className="mt-2 text-sm" style={{ color: tokens.muted }}>
            {DIGITAL_MENU_OFFER.title} — QR Code de mesas, cardápio no celular do cliente e mais.
          </p>
        </div>

        <div className="px-6 py-5 space-y-4">
          <ul className="space-y-2.5">
            {DIGITAL_MENU_OFFER.bullets.map((bullet) => (
              <li key={bullet} className="flex gap-2.5 text-sm leading-snug">
                <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: tokens.accent }} />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>

          <div
            className="rounded-2xl border px-4 py-3 flex items-start gap-3"
            style={{ borderColor: tokens.border, background: tokens.cream }}
          >
            <Sparkles className="w-5 h-5 shrink-0 mt-0.5" style={{ color: tokens.accent }} />
            <p className="text-sm leading-relaxed" style={{ color: tokens.ink }}>
              {DIGITAL_MENU_OFFER.pitch}
            </p>
          </div>

          <div className="flex items-baseline justify-between gap-3 pt-1">
            <span className="text-sm" style={{ color: tokens.muted }}>
              Pagamento único
            </span>
            <span className="text-2xl font-extrabold" style={{ color: tokens.accent }}>
              {DIGITAL_MENU_OFFER.priceLabel}
            </span>
          </div>

          <button
            type="button"
            onClick={onAccept}
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white disabled:opacity-60"
            style={{ background: tokens.accent }}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Abrindo pagamento…
              </>
            ) : (
              'Quero o cardápio digital'
            )}
          </button>

          <button
            type="button"
            onClick={onDismiss}
            disabled={submitting}
            className="w-full py-2.5 text-sm font-medium disabled:opacity-40"
            style={{ color: tokens.muted }}
          >
            Agora não
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
