import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Loader2, Lock, QrCode } from 'lucide-react';
import { DIGITAL_MENU_OFFER } from '../types/digitalMenuOffer';
import { activateDigitalMenuLocally, startDigitalMenuCheckout } from '../services/digitalMenuService';
import { isNativePlatform } from '../utils/capacitorUtils';

export function trialDaysMessage(daysLeft: number): string {
  if (daysLeft === 1) return 'Você ainda tem 1 dia de teste grátis.';
  return `Você ainda tem ${daysLeft} dias de teste grátis.`;
}

export function TrialDaysBanner({ daysLeft }: { daysLeft: number }) {
  return (
    <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-[#f3e4c4] bg-[#fff8e8] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-amber-950">{trialDaysMessage(daysLeft)}</p>
        <p className="mt-1 text-xs text-amber-900/75">
          Seu teste é o plano Start: cardápio, pedidos e delivery liberados. Cashback, WhatsApp, relatórios e garçons pedem Pro ou Max.
        </p>
      </div>
      <Link
        to="/planos"
        className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[#E91120] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c70e1b]"
      >
        Assinar agora
      </Link>
    </div>
  );
}

export function ExpiredSubscriptionBanner({ reason }: { reason: 'expired' | 'past_due' }) {
  const text =
    reason === 'past_due'
      ? 'Pagamento pendente. Sua loja saiu do delivery e algumas funções ficaram bloqueadas.'
      : 'Assinatura encerrada. Sua loja saiu do delivery e algumas funções ficaram bloqueadas.';

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-zinc-300 bg-zinc-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-zinc-200 text-zinc-500">
          <Lock className="h-4 w-4" strokeWidth={2} />
        </span>
        <p className="text-sm font-medium text-zinc-800">{text}</p>
      </div>
      <Link
        to="/planos"
        className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[#E91120] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c70e1b]"
      >
        Reativar assinatura
      </Link>
    </div>
  );
}

const LOCKED_TAB_COPY: Record<string, { title: string; hint: string }> = {
  cozinha: {
    title: 'Pedidos bloqueados',
    hint: 'Reative a assinatura para receber e gerenciar pedidos no marketplace.',
  },
  delivery: {
    title: 'Delivery bloqueado',
    hint: 'Reative para configurar áreas, taxas e aparecer no app de delivery.',
  },
  cashback: {
    title: 'Cashback bloqueado',
    hint: 'Cashback entra no plano Pro (e Max). No Start / teste Start fica com cadeado.',
  },
  whatsapp: {
    title: 'WhatsApp bloqueado',
    hint: 'Boris e automação no WhatsApp entram no plano Pro (e Max).',
  },
  mesas: {
    title: 'Mesas bloqueadas',
    hint: 'Reative a assinatura para usar o salão e o QR de mesa.',
  },
  horarios: {
    title: 'Horários bloqueados',
    hint: 'Reative a assinatura para definir quando a loja atende.',
  },
  relatorios: {
    title: 'Relatórios bloqueados',
    hint: 'Relatórios de desempenho entram no plano Pro (e Max).',
  },
  garcons: {
    title: 'Garçons bloqueados',
    hint: 'Gestão de garçons entra em planos acima do Start.',
  },
};

export function PartnershipFeatureLock({
  tabId,
  mode = 'expired',
}: {
  tabId: string;
  mode?: 'trial' | 'expired';
}) {
  const copy = LOCKED_TAB_COPY[tabId] ?? {
    title: 'Função bloqueada',
    hint:
      mode === 'trial'
        ? 'Seu teste é o plano Start. Esta função libera no Pro ou no Max.'
        : 'Reative a assinatura para liberar esta área do painel.',
  };

  return (
    <div className="mx-auto flex min-h-[42vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-zinc-200 text-zinc-500">
        <Lock className="h-7 w-7" strokeWidth={1.75} />
      </span>
      <h1 className="mt-5 text-2xl font-black tracking-tight text-zinc-900">{copy.title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600">{copy.hint}</p>
      <Link
        to="/planos"
        className="mt-6 inline-flex items-center justify-center rounded-xl bg-[#E91120] px-5 py-3 text-sm font-semibold text-white hover:bg-[#c70e1b]"
      >
        {mode === 'trial' ? 'Ver planos Pro e Max' : 'Ver planos e assinar'}
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
          setNote('Bora Comer Automatic ativado neste computador. Atualize a página.');
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
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-[#E91120]">Bora Comer Automatic</p>
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
          'Adquirir Bora Comer Automatic'
        )}
      </button>
      {note && <p className="mt-3 text-sm text-gray-600">{note}</p>}
    </div>
  );
}
