import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Loader2, QrCode } from 'lucide-react';
import { DIGITAL_MENU_OFFER } from '../types/digitalMenuOffer';
import { activateDigitalMenuLocally, startDigitalMenuCheckout } from '../services/digitalMenuService';
import { isNativePlatform } from '../utils/capacitorUtils';

export function trialDaysMessage(daysLeft: number): string {
  if (daysLeft === 1) return 'Você ainda tem 1 dia de teste grátis.';
  return `Você ainda tem ${daysLeft} dias de teste grátis.`;
}

export function TrialDaysBanner({ daysLeft }: { daysLeft: number }) {
  return (
    <div className="mb-4 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-medium text-amber-950">{trialDaysMessage(daysLeft)}</p>
      <Link
        to="/planos"
        className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[#E91120] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c70e1b]"
      >
        Assinar agora
      </Link>
    </div>
  );
}

export function DigitalMenuLockCard({ restaurantId }: { restaurantId: string }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const buy = async () => {
    if (busy) return;
    try {
      setBusy(true);
      setNote(null);
      const { url } = await startDigitalMenuCheckout(restaurantId);
      if (isNativePlatform()) {
        window.open(url, '_blank', 'noopener,noreferrer');
        setNote('Continue o pagamento no navegador.');
        return;
      }
      window.location.href = url;
    } catch (error) {
      console.error(error);
      if (import.meta.env.DEV) {
        try {
          await activateDigitalMenuLocally(restaurantId);
          setNote('Cardápio digital ativado neste computador. Atualize a página.');
          return;
        } catch (localError) {
          console.error(localError);
        }
      }
      setNote('Não foi possível abrir o pagamento. Tente de novo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E91120] text-white">
        <QrCode className="h-5 w-5" />
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-[#E91120]">Cardápio digital</p>
      <h2 className="mt-1 text-xl font-semibold text-gray-900">{DIGITAL_MENU_OFFER.title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">{DIGITAL_MENU_OFFER.headline}</p>
      <ul className="mt-4 space-y-2">
        {DIGITAL_MENU_OFFER.bullets.map((bullet) => (
          <li key={bullet} className="flex gap-2 text-sm text-gray-800">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#E91120]" />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex items-end justify-between gap-3">
        <span className="text-sm text-gray-500">Pagamento único</span>
        <span className="text-2xl font-bold text-gray-900">{DIGITAL_MENU_OFFER.priceLabel}</span>
      </div>
      <button
        type="button"
        onClick={() => void buy()}
        disabled={busy}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#E91120] py-3 text-sm font-semibold text-white hover:bg-[#c70e1b] disabled:opacity-60"
      >
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Abrindo pagamento…
          </>
        ) : (
          'Adquirir cardápio digital'
        )}
      </button>
      {note && <p className="mt-3 text-sm text-gray-600">{note}</p>}
    </div>
  );
}
