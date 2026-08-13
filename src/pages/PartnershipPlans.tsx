import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bike,
  CheckCircle2,
  Loader2,
  Smartphone,
  Store,
} from 'lucide-react';
import { useRestaurantAuth } from '../contexts/RestaurantAuthContext';
import { getRestaurantById } from '../services/restaurantService';
import {
  activatePartnershipLocally,
  confirmPartnershipCheckout,
  startPartnershipCheckout,
} from '../services/partnershipSubscriptionService';
import type { Restaurant } from '../types/restaurant';
import {
  PARTNERSHIP_FEE_WAIVER_THRESHOLD,
  PARTNERSHIP_MONTHLY_FEE,
  PARTNERSHIP_PLANS,
  PARTNERSHIP_TRIAL_DAYS,
  type PartnershipDeliveryMode,
} from '../types/partnership';
import {
  getPartnershipAccessState,
  resolveEffectiveSubscriptionStatus,
} from '../utils/partnershipAccess';

const tokens = {
  base: '#F5EFE7',
  cream: '#FAF0DB',
  ink: '#2A1E1A',
  muted: '#6B5A54',
  accent: '#E91120',
  accentDeep: '#B40E18',
  card: '#FFFFFF',
  border: '#E9D7C4',
};

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatPercent(value: number): string {
  return `${value.toFixed(2).replace('.', ',')}%`;
}

export default function PartnershipPlans() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated, currentRestaurantId, isLoading: authLoading } = useRestaurantAuth();

  const [selectedMode, setSelectedMode] = useState<PartnershipDeliveryMode>('store_delivery');
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loadingRestaurant, setLoadingRestaurant] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err' | 'info'; text: string } | null>(
    null
  );

  const plan = PARTNERSHIP_PLANS[selectedMode];
  const access = restaurant ? getPartnershipAccessState(restaurant) : null;
  const effectiveStatus = restaurant
    ? resolveEffectiveSubscriptionStatus(restaurant.partnershipSubscription)
    : null;

  useEffect(() => {
    document.title = 'Planos de parceria — Bora Comer!';
  }, []);

  useEffect(() => {
    if (!currentRestaurantId) {
      setRestaurant(null);
      return;
    }
    let cancelled = false;
    setLoadingRestaurant(true);
    getRestaurantById(currentRestaurantId)
      .then((r) => {
        if (!cancelled) {
          setRestaurant(r);
          if (r?.partnershipSubscription?.deliveryMode) {
            setSelectedMode(r.partnershipSubscription.deliveryMode);
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingRestaurant(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentRestaurantId]);

  // Retorno do Stripe Checkout
  useEffect(() => {
    const checkout = searchParams.get('checkout');
    const sessionId = searchParams.get('session_id');
    if (checkout === 'cancel') {
      setMessage({ type: 'info', text: 'Pagamento cancelado. Você pode tentar novamente quando quiser.' });
      setSearchParams({}, { replace: true });
      return;
    }
    if (checkout !== 'success' || !sessionId) return;

    let cancelled = false;
    (async () => {
      try {
        setSubmitting(true);
        setMessage({ type: 'info', text: 'Confirmando pagamento...' });
        await confirmPartnershipCheckout(sessionId);
        if (cancelled) return;
        setMessage({
          type: 'ok',
          text: 'Assinatura ativada! Bem-vindo de volta à parceria Bora Comer!.',
        });
        if (currentRestaurantId) {
          const refreshed = await getRestaurantById(currentRestaurantId);
          if (!cancelled) setRestaurant(refreshed);
        }
        setSearchParams({}, { replace: true });
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setMessage({
            type: 'err',
            text: 'Não foi possível confirmar o pagamento. Se o valor foi cobrado, fale com o suporte.',
          });
        }
      } finally {
        if (!cancelled) setSubmitting(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, setSearchParams, currentRestaurantId]);

  const statusBanner = useMemo(() => {
    if (!restaurant || !access) return null;
    if (access.access && access.reason === 'trial') {
      return {
        tone: 'trial' as const,
        text: `Período de teste: ${access.daysLeft ?? PARTNERSHIP_TRIAL_DAYS} dia(s) restante(s). Assine para continuar após o trial.`,
      };
    }
    if (access.access && access.reason === 'active') {
      return {
        tone: 'ok' as const,
        text: 'Sua parceria está ativa. Você pode trocar o modo de entrega abaixo e atualizar a assinatura.',
      };
    }
    if (!access.access) {
      return {
        tone: 'expired' as const,
        text: 'O período gratuito acabou. Escolha um plano para voltar a aparecer para os clientes e usar o painel.',
      };
    }
    return null;
  }, [restaurant, access]);

  const handleSubscribe = async () => {
    setMessage(null);

    if (!isAuthenticated || !currentRestaurantId) {
      navigate(`/restaurant/auth?returnUrl=${encodeURIComponent('/planos')}`);
      return;
    }

    try {
      setSubmitting(true);
      const { url } = await startPartnershipCheckout({
        restaurantId: currentRestaurantId,
        deliveryMode: selectedMode,
      });
      window.location.href = url;
    } catch (err) {
      console.error(err);
      // Fallback local (dev / function ainda não deployada)
      if (import.meta.env.DEV) {
        try {
          await activatePartnershipLocally({
            restaurantId: currentRestaurantId,
            deliveryMode: selectedMode,
          });
          const refreshed = await getRestaurantById(currentRestaurantId);
          setRestaurant(refreshed);
          setMessage({
            type: 'ok',
            text: 'Assinatura ativada em modo local (dev). Em produção o pagamento vai pelo Stripe.',
          });
          return;
        } catch (localErr) {
          console.error(localErr);
        }
      }
      setMessage({
        type: 'err',
        text: 'Não foi possível iniciar o pagamento. Verifique a conexão ou se as Cloud Functions estão publicadas.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const goToPanel = () => {
    if (currentRestaurantId) {
      navigate(`/${currentRestaurantId}/settings`);
    }
  };

  return (
    <div
      className="min-h-[100dvh] flex flex-col"
      style={{
        background: `linear-gradient(165deg, ${tokens.cream} 0%, ${tokens.base} 45%, #F3E4D6 100%)`,
        color: tokens.ink,
      }}
    >
      <header className="px-4 sm:px-6 pt-5 pb-3 flex items-center justify-between gap-3">
        <Link
          to="/delivery"
          className="inline-flex items-center gap-2 text-sm font-medium opacity-80 hover:opacity-100"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>
        <div className="flex items-center gap-2">
          <img
            src="/bora-comer-icon-192.png"
            alt="Bora Comer!"
            className="w-9 h-9 rounded-xl shadow-sm object-cover"
          />
          <span className="font-extrabold tracking-tight text-lg" style={{ color: tokens.accent }}>
            Bora Comer!
          </span>
        </div>
        <div className="w-16" />
      </header>

      <main className="flex-1 px-4 sm:px-6 pb-10 max-w-xl mx-auto w-full">
        <div className="text-center mb-6 mt-2">
          <p className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: tokens.accent }}>
            Parceria comercial
          </p>
          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold leading-tight tracking-tight">
            Você escolhe como prefere gerenciar seu negócio
          </h1>
          <p className="mt-2 text-sm" style={{ color: tokens.muted }}>
            {PARTNERSHIP_TRIAL_DAYS} dias grátis para testar. Depois, mensalidade + taxa por pedido.
          </p>
        </div>

        {authLoading || loadingRestaurant ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-7 h-7 animate-spin" style={{ color: tokens.accent }} />
          </div>
        ) : (
          <>
            {statusBanner && (
              <div
                className="mb-4 rounded-2xl px-4 py-3 text-sm font-medium border"
                style={{
                  background:
                    statusBanner.tone === 'expired'
                      ? 'rgba(233,17,32,0.08)'
                      : statusBanner.tone === 'ok'
                        ? 'rgba(22,163,74,0.1)'
                        : 'rgba(255,255,255,0.7)',
                  borderColor:
                    statusBanner.tone === 'expired'
                      ? 'rgba(233,17,32,0.25)'
                      : statusBanner.tone === 'ok'
                        ? 'rgba(22,163,74,0.25)'
                        : tokens.border,
                  color: tokens.ink,
                }}
              >
                {statusBanner.text}
                {restaurant && (
                  <p className="mt-1 text-xs font-normal opacity-70">
                    {restaurant.name}
                    {effectiveStatus ? ` · status: ${effectiveStatus}` : ''}
                  </p>
                )}
              </div>
            )}

            {!isAuthenticated && (
              <div
                className="mb-4 rounded-2xl px-4 py-3 text-sm border"
                style={{ background: tokens.card, borderColor: tokens.border }}
              >
                Prévia dos planos. Para assinar,{' '}
                <Link
                  to={`/restaurant/auth?returnUrl=${encodeURIComponent('/planos')}`}
                  className="font-semibold underline underline-offset-2"
                  style={{ color: tokens.accent }}
                >
                  entre na conta do restaurante
                </Link>
                .
              </div>
            )}

            <section
              className="rounded-3xl overflow-hidden shadow-[0_18px_50px_rgba(42,30,26,0.12)] border"
              style={{ background: tokens.accent, borderColor: tokens.accentDeep }}
            >
              <div className="grid grid-cols-2 gap-1 p-1.5">
                {(
                  [
                    {
                      id: 'store_delivery' as const,
                      icon: Smartphone,
                      label: 'Entrega pela loja',
                    },
                    {
                      id: 'platform_delivery' as const,
                      icon: Bike,
                      label: 'Entrega Bora Comer!',
                    },
                  ] as const
                ).map((tab) => {
                  const active = selectedMode === tab.id;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSelectedMode(tab.id)}
                      className="rounded-2xl px-2.5 py-3.5 text-left transition-all"
                      style={{
                        background: active ? tokens.accentDeep : 'rgba(255,255,255,0.14)',
                        color: '#fff',
                        boxShadow: active ? 'inset 0 0 0 1px rgba(255,255,255,0.15)' : undefined,
                      }}
                    >
                      <Icon className="w-5 h-5 mb-2 opacity-95" />
                      <span className="block text-[11px] sm:text-xs font-bold leading-snug uppercase tracking-wide">
                        {tab.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="px-5 pt-5 pb-2 text-white">
                <h2 className="text-base font-bold leading-snug">{plan.title}</h2>
                <p className="mt-1.5 text-sm text-white/85 leading-relaxed">{plan.subtitle}</p>
              </div>

              <div className="px-5 py-4">
                <div
                  className="rounded-2xl px-4 py-4"
                  style={{ background: 'rgba(255,255,255,0.12)' }}
                >
                  <p className="text-sm text-white/90">
                    Nesta opção, sua taxa de plataforma seria:
                  </p>
                  <div className="mt-3 flex items-end gap-2">
                    <span
                      className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-2xl font-black tabular-nums"
                      style={{ background: '#fff', color: tokens.accentDeep }}
                    >
                      {formatPercent(plan.platformFeePercent)}
                    </span>
                    <span className="text-sm text-white/90 pb-1">taxa única*</span>
                  </div>
                </div>

                <div className="mt-5 text-center">
                  <p className="text-xs font-bold tracking-[0.16em] text-white/90 uppercase">
                    Mensalidade**
                  </p>
                  <div
                    className="mt-2 inline-flex items-center justify-center rounded-2xl px-8 py-3 text-2xl font-black text-white tabular-nums border-2 border-white/80"
                  >
                    {formatBRL(PARTNERSHIP_MONTHLY_FEE)}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSubscribe}
                  disabled={submitting}
                  className="mt-6 w-full rounded-2xl py-3.5 text-base font-bold transition active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: '#fff', color: tokens.accentDeep }}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processando...
                    </>
                  ) : access?.access && access.reason === 'active' ? (
                    'Atualizar plano / pagar'
                  ) : (
                    'Assinar e continuar'
                  )}
                </button>

                {access?.access && access.reason === 'active' && currentRestaurantId && (
                  <button
                    type="button"
                    onClick={goToPanel}
                    className="mt-3 w-full rounded-2xl py-3 text-sm font-semibold text-white/95 border border-white/40"
                  >
                    Ir para o painel
                  </button>
                )}
              </div>

              <div className="px-5 pb-5 space-y-2 text-[11px] leading-relaxed text-white/80">
                <p>
                  *Taxa de referência para o modo selecionado. Pode variar conforme negociação
                  comercial local.
                </p>
                <p>
                  **A mensalidade de {formatBRL(PARTNERSHIP_MONTHLY_FEE)} é isenta enquanto o
                  faturamento mensal na Bora Comer! for de até{' '}
                  {formatBRL(PARTNERSHIP_FEE_WAIVER_THRESHOLD)}.
                </p>
              </div>
            </section>

            {message && (
              <div
                className="mt-4 rounded-2xl px-4 py-3 text-sm border flex items-start gap-2"
                style={{
                  background: tokens.card,
                  borderColor: tokens.border,
                  color: tokens.ink,
                }}
              >
                {message.type === 'ok' && (
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-green-600" />
                )}
                <span>{message.text}</span>
              </div>
            )}

            <div className="mt-8 text-center">
              <div className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: tokens.muted }}>
                <Store className="w-4 h-4" />
                Vamos crescer juntos?
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
