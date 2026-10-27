import { useEffect, useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Crown,
  Headphones,
  Infinity as InfinityIcon,
  Loader2,
  Moon,
  Shield,
  Store,
  Sun,
  TrendingUp,
  Zap,
  Gem,
} from 'lucide-react';
import { isIosNative, isNativePlatform } from '../utils/capacitorUtils';
import { useRestaurantAuth } from '../contexts/RestaurantAuthContext';
import { getRestaurantById } from '../services/restaurantService';
import {
  activatePartnershipLocally,
  confirmPartnershipCheckout,
  startPartnershipCheckout,
} from '../services/partnershipSubscriptionService';
import { confirmDigitalMenuCheckout } from '../services/digitalMenuService';
import { CARDAPIO_DIGITAL_PATH } from './cardapio-digital/content';
import DigitalMenuUpsellModal from '../components/DigitalMenuUpsellModal';
import type { Restaurant } from '../types/restaurant';
import {
  PARTNERSHIP_TRIAL_DAYS,
  type PartnershipDeliveryMode,
} from '../types/partnership';
import { DIGITAL_MENU_OFFER, hasActiveDigitalMenu } from '../types/digitalMenuOffer';
import {
  getPartnershipAccessState,
  resolveEffectiveSubscriptionStatus,
} from '../utils/partnershipAccess';

const THEME_KEY = 'planos-theme';

type BillingCycle = 'monthly' | 'annual';
type PlanId = 'start' | 'pro' | 'max';

type PlanDef = {
  id: PlanId;
  name: string;
  tagline: string;
  monthly: number;
  annualMonthly: number;
  savePercent: number;
  featured?: boolean;
  deliveryMode: PartnershipDeliveryMode;
  cta: string;
  ctaStyle: 'solid' | 'ghost';
  icon: 'store' | 'zap' | 'gem';
  visual: 'phone' | 'boris' | 'dash';
  featuresIntro?: string;
  features: Array<{ text: string; badge?: 'stripe' | 'exclusive' }>;
};

const PLANS: PlanDef[] = [
  {
    id: 'start',
    name: 'Start',
    tagline: 'Sua loja no app com o essencial para vender.',
    monthly: 69.9,
    annualMonthly: 49.9,
    savePercent: 29,
    deliveryMode: 'store_delivery',
    cta: 'Começar agora',
    ctaStyle: 'ghost',
    icon: 'store',
    visual: 'phone',
    features: [
      { text: 'Cardápio e pedidos no painel' },
      { text: 'Entrega feita pela sua loja' },
      { text: 'Taxa a partir de 12% por pedido' },
      { text: 'Pagamentos online via Stripe', badge: 'stripe' },
      { text: `${PARTNERSHIP_TRIAL_DAYS} dias de trial` },
      { text: 'Isenção de mensalidade até R$ 1.500' },
      { text: 'QR Code de mesa (básico)' },
      { text: 'Suporte por chat' },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'Automação, Boris e crescimento sem fricção.',
    monthly: 149.9,
    annualMonthly: 129.9,
    savePercent: 13,
    featured: true,
    deliveryMode: 'store_delivery',
    cta: 'Quero o plano Pro',
    ctaStyle: 'solid',
    icon: 'zap',
    visual: 'boris',
    featuresIntro: 'Tudo do Start, mais:',
    features: [
      { text: 'Boris — IA para WhatsApp' },
      { text: 'Automação de pedidos no WhatsApp' },
      { text: 'Cashback inteligente por loja' },
      { text: 'Tradução do cardápio (PT/EN/FR)' },
      { text: 'CRM leve de clientes' },
      { text: 'Relatórios de desempenho' },
      { text: 'Prioridade no suporte' },
      { text: 'Upsell de cardápio digital' },
    ],
  },
  {
    id: 'max',
    name: 'Max',
    tagline: 'Operação completa: mesas, estoque e escala.',
    monthly: 269.9,
    annualMonthly: 229.9,
    savePercent: 15,
    deliveryMode: 'platform_delivery',
    cta: 'Quero o plano Max',
    ctaStyle: 'ghost',
    icon: 'gem',
    visual: 'dash',
    featuresIntro: 'Tudo do Pro, mais:',
    features: [
      { text: 'Gestão de mesas e QR avançado' },
      { text: 'Controle de estoque' },
      { text: 'Gestão Inteligente', badge: 'exclusive' },
      { text: 'Entrega com motoboys Bora Comer!' },
      { text: 'Dashboard analítico' },
      { text: 'Multi-lojas (em breve)' },
      { text: 'Onboarding dedicado' },
    ],
  },
];

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function PlanIcon({ kind }: { kind: PlanDef['icon'] }) {
  const Icon = kind === 'store' ? Store : kind === 'zap' ? Zap : Gem;
  return (
    <span className="pp-plan-icon" aria-hidden>
      <Icon size={18} />
    </span>
  );
}

function PlanVisual({ kind }: { kind: PlanDef['visual'] }) {
  if (kind === 'phone') {
    return (
      <div className="pp-visual pp-visual--phone" aria-hidden>
        <img src="/captar/sat-phone.png" alt="" className="pp-visual__phone" />
        <img src="/cardapio-digital/burger.jpg" alt="" className="pp-visual__food" />
        <span className="pp-visual__cart">1</span>
      </div>
    );
  }
  if (kind === 'boris') {
    return (
      <div className="pp-visual pp-visual--boris" aria-hidden>
        <img src="/boris-mascot.png" alt="" className="pp-visual__boris" />
        <span className="pp-visual__wa">WhatsApp</span>
        <span className="pp-visual__bubble">Olá! Seu pedido já foi recebido!</span>
      </div>
    );
  }
  return (
    <div className="pp-visual pp-visual--dash" aria-hidden>
      <img src="/Beneficios.png" alt="" className="pp-visual__dash" />
      <span className="pp-visual__chip">Mesas</span>
      <span className="pp-visual__chip pp-visual__chip--2">Estoque</span>
    </div>
  );
}

export default function PartnershipPlans() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated, currentRestaurantId, isLoading: authLoading } = useRestaurantAuth();

  const [billing, setBilling] = useState<BillingCycle>('annual');
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('pro');
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loadingRestaurant, setLoadingRestaurant] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err' | 'info'; text: string } | null>(
    null
  );
  const [showDigitalMenuUpsell, setShowDigitalMenuUpsell] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      return window.localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });
  const isDark = theme === 'dark';

  const access = restaurant ? getPartnershipAccessState(restaurant) : null;
  const effectiveStatus = restaurant
    ? resolveEffectiveSubscriptionStatus(restaurant.partnershipSubscription)
    : null;

  useEffect(() => {
    document.title = 'Planos de parceria — Bora Comer!';
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  useEffect(() => {
    if (!currentRestaurantId) {
      setRestaurant(null);
      return;
    }
    let cancelled = false;
    setLoadingRestaurant(true);
    getRestaurantById(currentRestaurantId)
      .then((r) => {
        if (!cancelled) setRestaurant(r);
      })
      .finally(() => {
        if (!cancelled) setLoadingRestaurant(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentRestaurantId]);

  useEffect(() => {
    const checkout = searchParams.get('checkout');
    const digitalMenu = searchParams.get('digital_menu');
    const sessionId = searchParams.get('session_id');

    if (digitalMenu === 'cancel') {
      setMessage({
        type: 'info',
        text: 'Pagamento do cardápio digital cancelado. Você pode adquirir depois quando quiser.',
      });
      setSearchParams({}, { replace: true });
      return;
    }

    if (digitalMenu === 'success' && sessionId) {
      let cancelled = false;
      (async () => {
        try {
          setSubmitting(true);
          setMessage({ type: 'info', text: 'Confirmando cardápio digital...' });
          await confirmDigitalMenuCheckout(sessionId);
          if (cancelled) return;
          setMessage({
            type: 'ok',
            text: 'Cardápio digital ativado! QR de mesas e IA para WhatsApp liberados.',
          });
          if (currentRestaurantId) {
            const refreshed = await getRestaurantById(currentRestaurantId);
            if (!cancelled) setRestaurant(refreshed);
          }
          setShowDigitalMenuUpsell(false);
          setSearchParams({}, { replace: true });
        } catch (err) {
          console.error(err);
          if (!cancelled) {
            setMessage({
              type: 'err',
              text: 'Não foi possível confirmar o cardápio digital. Se o valor foi cobrado, fale com o suporte.',
            });
          }
        } finally {
          if (!cancelled) setSubmitting(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }

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
        let refreshed: Restaurant | null = null;
        if (currentRestaurantId) {
          refreshed = await getRestaurantById(currentRestaurantId);
          if (!cancelled) setRestaurant(refreshed);
        }
        if (!cancelled && !hasActiveDigitalMenu(refreshed?.digitalMenu)) {
          setShowDigitalMenuUpsell(true);
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
        text: 'Sua parceria está ativa. Você pode atualizar o plano abaixo.',
      };
    }
    if (!access.access) {
      return {
        tone: 'expired' as const,
        text: 'O período gratuito acabou. Escolha um plano para voltar a aparecer para os clientes.',
      };
    }
    return null;
  }, [restaurant, access]);

  const appOrigin = (
    import.meta.env.VITE_APP_URL || 'https://boracoomer.netlify.app'
  ).replace(/\/$/, '');
  const partnershipWebUrl = `${appOrigin}/planos`;

  function toggleTheme(event: React.MouseEvent<HTMLButtonElement>) {
    const next = isDark ? 'light' : 'dark';
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion) {
      setTheme(next);
      return;
    }

    const doc = document as Document & {
      startViewTransition?: (callback: () => void) => {
        ready: Promise<void>;
        finished: Promise<void>;
      };
    };

    if (doc.startViewTransition) {
      const transition = doc.startViewTransition(() => {
        flushSync(() => setTheme(next));
      });
      transition.ready
        .then(() => {
          document.documentElement.animate(
            {
              clipPath: [
                `circle(0px at ${x}px ${y}px)`,
                `circle(${radius}px at ${x}px ${y}px)`,
              ],
            },
            {
              duration: 750,
              easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
              pseudoElement: '::view-transition-new(root)',
            }
          );
        })
        .catch(() => undefined);
      return;
    }

    const overlay = document.createElement('div');
    overlay.style.cssText = `position:fixed;inset:0;z-index:9999;pointer-events:none;background:${
      next === 'light' ? '#F4F1EC' : '#070708'
    };clip-path:circle(0px at ${x}px ${y}px);transition:clip-path 650ms cubic-bezier(0.22,1,0.36,1),opacity 220ms ease;`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => {
      overlay.style.clipPath = `circle(${radius}px at ${x}px ${y}px)`;
    });
    window.setTimeout(() => {
      setTheme(next);
      overlay.style.opacity = '0';
      window.setTimeout(() => overlay.remove(), 240);
    }, 320);
  }

  const openCheckoutUrl = (url: string) => {
    if (isNativePlatform()) {
      window.open(url, '_blank', 'noopener,noreferrer');
      setMessage({
        type: 'info',
        text: 'Pagamento aberto no navegador. Conclua lá e depois volte ao app — a assinatura sincroniza sozinha.',
      });
      return;
    }
    window.location.href = url;
  };

  const handleSubscribe = async (planId: PlanId) => {
    setMessage(null);
    setSelectedPlan(planId);
    const plan = PLANS.find((p) => p.id === planId)!;

    if (isIosNative()) {
      window.open(partnershipWebUrl, '_blank', 'noopener,noreferrer');
      setMessage({
        type: 'info',
        text: 'No iPhone, a assinatura é feita no site. Abra o link, faça login e conclua o pagamento.',
      });
      return;
    }

    if (!isAuthenticated || !currentRestaurantId) {
      navigate(`/captar/restaurante`);
      return;
    }

    try {
      setSubmitting(true);
      const { url } = await startPartnershipCheckout({
        restaurantId: currentRestaurantId,
        deliveryMode: plan.deliveryMode,
      });
      openCheckoutUrl(url);
    } catch (err) {
      console.error(err);
      if (import.meta.env.DEV) {
        try {
          await activatePartnershipLocally({
            restaurantId: currentRestaurantId,
            deliveryMode: plan.deliveryMode,
          });
          const refreshed = await getRestaurantById(currentRestaurantId);
          setRestaurant(refreshed);
          setMessage({
            type: 'ok',
            text: 'Assinatura ativada em modo local (dev). Em produção o pagamento vai pelo Stripe.',
          });
          if (!hasActiveDigitalMenu(refreshed?.digitalMenu)) {
            setShowDigitalMenuUpsell(true);
          }
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
    if (currentRestaurantId) navigate(`/${currentRestaurantId}/settings`);
  };

  const handleDigitalMenuAccept = () => {
    setShowDigitalMenuUpsell(false);
    navigate(CARDAPIO_DIGITAL_PATH);
  };

  if (isIosNative()) {
    return (
      <div className={`pp-page${isDark ? '' : ' is-light'}`}>
        <div className="pp-ios">
          <Link to="/delivery" className="pp-back">
            <ArrowLeft size={16} /> Voltar
          </Link>
          <h1>Assinatura da parceria</h1>
          <p>
            A mensalidade da plataforma é contratada no site, não neste aplicativo. Pedidos de
            comida continuam disponíveis no app.
          </p>
          <a href={partnershipWebUrl} target="_blank" rel="noopener noreferrer" className="pp-btn pp-btn--solid">
            Abrir planos no site
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={`pp-page${isDark ? '' : ' is-light'}`}>
      <style>{`
        .pp-page {
          --pp-bg: #070708;
          --pp-elev: #121214;
          --pp-card: #161618;
          --pp-ink: #F5F5F4;
          --pp-muted: #A1A1AA;
          --pp-line: rgba(255,255,255,0.1);
          --pp-orange: #FF5A1F;
          --pp-orange-deep: #E24812;
          --pp-green: #22C55E;
          --pp-glow: rgba(255, 90, 31, 0.45);
          min-height: 100dvh;
          background:
            radial-gradient(ellipse 70% 45% at 50% -10%, rgba(255,90,31,0.16), transparent 55%),
            radial-gradient(ellipse 50% 40% at 100% 30%, rgba(255,90,31,0.06), transparent 50%),
            var(--pp-bg);
          color: var(--pp-ink);
          font-family: "IBM Plex Sans", "Segoe UI", system-ui, sans-serif;
        }
        .pp-page.is-light {
          --pp-bg: #F4F1EC;
          --pp-elev: #FFFFFF;
          --pp-card: #FFFFFF;
          --pp-ink: #1C1410;
          --pp-muted: #6B5A54;
          --pp-line: rgba(28,20,16,0.12);
          --pp-glow: rgba(255, 90, 31, 0.28);
          background:
            radial-gradient(ellipse 70% 45% at 50% -10%, rgba(255,90,31,0.12), transparent 55%),
            linear-gradient(180deg, #FFF9F3 0%, var(--pp-bg) 40%, #EFE8DF 100%);
        }
        .pp-shell {
          width: min(1180px, calc(100% - 2rem));
          margin: 0 auto;
          padding: 1.1rem 0 3rem;
        }
        .pp-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 1.75rem;
        }
        .pp-back, .pp-theme {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          height: 2.5rem;
          border-radius: 999px;
          border: 1px solid var(--pp-line);
          background: rgba(255,255,255,0.03);
          color: var(--pp-ink);
          text-decoration: none;
          font-size: 0.88rem;
          font-weight: 600;
          cursor: pointer;
          padding: 0 0.95rem;
        }
        .pp-theme { width: 2.5rem; padding: 0; color: var(--pp-orange); }
        .pp-brand {
          display: inline-flex;
          align-items: center;
          gap: 0.55rem;
          font-weight: 800;
          letter-spacing: -0.02em;
        }
        .pp-brand img { width: 2rem; height: 2rem; border-radius: 0.65rem; object-fit: cover; }
        .pp-hero { text-align: center; margin-bottom: 1.5rem; }
        .pp-hero h1 {
          margin: 0;
          font-size: clamp(1.6rem, 3.5vw, 2.35rem);
          letter-spacing: -0.04em;
          line-height: 1.05;
        }
        .pp-hero p { margin: 0.55rem 0 0; color: var(--pp-muted); font-size: 0.95rem; }
        .pp-billing-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.65rem;
          margin-bottom: 1.75rem;
          position: relative;
        }
        .pp-billing {
          display: inline-grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.35rem;
          padding: 0.35rem;
          border-radius: 999px;
          background: var(--pp-elev);
          border: 1px solid var(--pp-line);
          box-shadow: 0 12px 40px rgba(0,0,0,0.25);
        }
        .pp-billing__btn {
          appearance: none;
          border: 0;
          background: transparent;
          color: var(--pp-muted);
          border-radius: 999px;
          padding: 0.7rem 1.25rem;
          cursor: pointer;
          text-align: center;
          min-width: 9.5rem;
          transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
        }
        .pp-billing__btn strong {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.35rem;
          font-size: 0.95rem;
        }
        .pp-billing__btn span { display: block; font-size: 0.72rem; margin-top: 0.15rem; opacity: 0.9; }
        .pp-billing__btn.is-active {
          background: var(--pp-orange);
          color: #fff;
          box-shadow: 0 8px 24px var(--pp-glow);
        }
        .pp-hint {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          color: var(--pp-orange);
          font-size: 0.78rem;
          font-weight: 600;
          font-style: italic;
        }
        .pp-hint svg { transform: rotate(-12deg); }
        .pp-banner {
          max-width: 720px;
          margin: 0 auto 1.25rem;
          border-radius: 1rem;
          padding: 0.85rem 1rem;
          border: 1px solid var(--pp-line);
          background: rgba(255,255,255,0.04);
          font-size: 0.88rem;
        }
        .pp-page.is-light .pp-banner { background: rgba(28,20,16,0.04); }
        .pp-grid {
          display: grid;
          gap: 1rem;
          align-items: stretch;
        }
        @media (min-width: 980px) {
          .pp-grid {
            grid-template-columns: 1fr 1.08fr 1fr;
            gap: 1.1rem;
            align-items: center;
          }
        }
        .pp-card {
          position: relative;
          background: linear-gradient(180deg, rgba(255,255,255,0.04), transparent 30%), var(--pp-card);
          border: 1px solid var(--pp-line);
          border-radius: 1.5rem;
          padding: 1.25rem 1.2rem 1.3rem;
          display: flex;
          flex-direction: column;
          min-height: 100%;
          box-shadow: 0 18px 50px rgba(0,0,0,0.28);
        }
        .pp-page.is-light .pp-card {
          box-shadow: 0 16px 40px rgba(42,30,26,0.08);
        }
        .pp-card--featured {
          border-color: rgba(255,90,31,0.75);
          box-shadow:
            0 0 0 1px rgba(255,90,31,0.35),
            0 0 40px var(--pp-glow),
            0 24px 60px rgba(0,0,0,0.35);
          transform: scale(1.02);
          z-index: 1;
        }
        @media (max-width: 979px) {
          .pp-card--featured { transform: none; }
        }
        .pp-badge {
          position: absolute;
          top: -0.7rem;
          left: 50%;
          transform: translateX(-50%);
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          background: var(--pp-orange);
          color: #111;
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 0.35rem 0.7rem;
          border-radius: 999px;
          white-space: nowrap;
          box-shadow: 0 8px 20px var(--pp-glow);
        }
        .pp-card__top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0.75rem;
          margin-bottom: 0.85rem;
        }
        .pp-plan-icon {
          width: 2.25rem;
          height: 2.25rem;
          border-radius: 0.7rem;
          display: grid;
          place-items: center;
          background: rgba(255,255,255,0.06);
          border: 1px solid var(--pp-line);
          color: var(--pp-ink);
        }
        .pp-card h2 {
          margin: 0.55rem 0 0.25rem;
          font-size: 1.55rem;
          letter-spacing: -0.03em;
        }
        .pp-card__tag {
          margin: 0;
          color: var(--pp-muted);
          font-size: 0.86rem;
          line-height: 1.4;
          min-height: 2.4em;
        }
        .pp-price {
          margin: 1rem 0 0.35rem;
          display: flex;
          align-items: baseline;
          gap: 0.25rem;
          flex-wrap: wrap;
        }
        .pp-price__value {
          font-size: clamp(1.8rem, 3vw, 2.2rem);
          font-weight: 800;
          letter-spacing: -0.04em;
          color: var(--pp-orange);
          line-height: 1;
        }
        .pp-price__period {
          color: var(--pp-muted);
          font-size: 0.9rem;
          font-weight: 600;
        }
        .pp-annual {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          flex-wrap: wrap;
          margin-bottom: 0.85rem;
          font-size: 0.82rem;
          color: var(--pp-muted);
        }
        .pp-save {
          display: inline-flex;
          align-items: center;
          background: rgba(34,197,94,0.16);
          color: var(--pp-green);
          border: 1px solid rgba(34,197,94,0.35);
          border-radius: 999px;
          padding: 0.15rem 0.5rem;
          font-size: 0.72rem;
          font-weight: 800;
        }
        .pp-visual {
          position: relative;
          height: 7.5rem;
          border-radius: 1rem;
          margin: 0.35rem 0 1rem;
          overflow: hidden;
          background: linear-gradient(135deg, rgba(255,90,31,0.12), rgba(255,255,255,0.03));
          border: 1px solid var(--pp-line);
        }
        .pp-visual__phone {
          position: absolute;
          right: 8%;
          bottom: -18%;
          height: 120%;
          object-fit: contain;
          filter: drop-shadow(0 12px 20px rgba(0,0,0,0.35));
        }
        .pp-visual__food {
          position: absolute;
          left: 10%;
          top: 18%;
          width: 4.2rem;
          height: 4.2rem;
          object-fit: cover;
          border-radius: 1rem;
          box-shadow: 0 10px 24px rgba(0,0,0,0.35);
          transform: rotate(-8deg);
        }
        .pp-visual__cart {
          position: absolute;
          right: 18%;
          top: 14%;
          width: 1.6rem;
          height: 1.6rem;
          border-radius: 999px;
          background: var(--pp-orange);
          color: #fff;
          font-size: 0.7rem;
          font-weight: 800;
          display: grid;
          place-items: center;
        }
        .pp-visual__boris {
          position: absolute;
          left: 8%;
          bottom: -8%;
          height: 110%;
          object-fit: contain;
          filter: drop-shadow(0 12px 20px rgba(0,0,0,0.35));
        }
        .pp-visual__wa {
          position: absolute;
          right: 10%;
          top: 18%;
          background: #25D366;
          color: #053b1d;
          font-size: 0.68rem;
          font-weight: 800;
          padding: 0.35rem 0.55rem;
          border-radius: 0.55rem;
        }
        .pp-visual__bubble {
          position: absolute;
          right: 6%;
          bottom: 14%;
          max-width: 9.5rem;
          background: #fff;
          color: #1c1410;
          font-size: 0.68rem;
          font-weight: 600;
          line-height: 1.25;
          padding: 0.45rem 0.55rem;
          border-radius: 0.75rem 0.75rem 0.75rem 0.2rem;
          box-shadow: 0 8px 20px rgba(0,0,0,0.25);
        }
        .pp-visual__dash {
          position: absolute;
          inset: 8% 8% auto 8%;
          width: 84%;
          height: 78%;
          object-fit: cover;
          border-radius: 0.75rem;
          opacity: 0.92;
        }
        .pp-visual__chip {
          position: absolute;
          left: 10%;
          bottom: 12%;
          background: var(--pp-orange);
          color: #111;
          font-size: 0.68rem;
          font-weight: 800;
          padding: 0.28rem 0.5rem;
          border-radius: 999px;
        }
        .pp-visual__chip--2 {
          left: auto;
          right: 10%;
          bottom: 28%;
          background: #fff;
          color: #1c1410;
        }
        .pp-features-intro {
          margin: 0 0 0.45rem;
          color: var(--pp-orange);
          font-size: 0.84rem;
          font-weight: 800;
        }
        .pp-features {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 0.45rem;
          flex: 1;
        }
        .pp-features li {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          font-size: 0.86rem;
          color: var(--pp-ink);
          line-height: 1.35;
        }
        .pp-features svg {
          color: var(--pp-orange);
          margin-top: 0.15rem;
          flex-shrink: 0;
        }
        .pp-chip {
          display: inline-flex;
          align-items: center;
          margin-left: 0.35rem;
          border-radius: 999px;
          padding: 0.05rem 0.4rem;
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          vertical-align: middle;
        }
        .pp-chip--stripe {
          background: #635BFF;
          color: #fff;
        }
        .pp-chip--exclusive {
          background: rgba(255,90,31,0.18);
          color: var(--pp-orange);
          border: 1px solid rgba(255,90,31,0.35);
        }
        .pp-btn {
          margin-top: 1.15rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          width: 100%;
          border-radius: 999px;
          padding: 0.9rem 1rem;
          font-weight: 800;
          font-size: 0.95rem;
          cursor: pointer;
          transition: transform 0.15s ease, filter 0.2s ease, background 0.2s ease;
          text-decoration: none;
          border: 1.5px solid transparent;
        }
        .pp-btn:hover { transform: translateY(-1px); }
        .pp-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .pp-btn--solid {
          background: var(--pp-orange);
          color: #111;
          box-shadow: 0 12px 28px var(--pp-glow);
        }
        .pp-btn--ghost {
          background: transparent;
          color: var(--pp-orange);
          border-color: rgba(255,90,31,0.55);
        }
        .pp-page.is-light .pp-btn--ghost {
          border-color: rgba(226,72,18,0.45);
        }
        .pp-trust {
          margin-top: 1.75rem;
          display: grid;
          gap: 0.85rem;
          grid-template-columns: 1fr;
          padding: 1rem 1.1rem;
          border-radius: 1.15rem;
          background: var(--pp-elev);
          border: 1px solid var(--pp-line);
        }
        @media (min-width: 800px) {
          .pp-trust { grid-template-columns: repeat(4, 1fr); }
        }
        .pp-trust__item {
          display: flex;
          gap: 0.65rem;
          align-items: flex-start;
        }
        .pp-trust__item svg {
          color: var(--pp-muted);
          margin-top: 0.1rem;
          flex-shrink: 0;
        }
        .pp-trust__item strong {
          display: block;
          font-size: 0.86rem;
          margin-bottom: 0.15rem;
        }
        .pp-trust__item span {
          display: block;
          font-size: 0.75rem;
          color: var(--pp-muted);
          line-height: 1.35;
        }
        .pp-msg {
          margin-top: 1rem;
          border-radius: 1rem;
          padding: 0.85rem 1rem;
          border: 1px solid var(--pp-line);
          background: rgba(255,255,255,0.04);
          font-size: 0.88rem;
          display: flex;
          gap: 0.5rem;
          align-items: flex-start;
        }
        .pp-ios {
          max-width: 28rem;
          margin: 3rem auto;
          padding: 1.5rem;
          border-radius: 1.25rem;
          background: var(--pp-card);
          border: 1px solid var(--pp-line);
        }
        .pp-ios h1 { margin: 1rem 0 0.5rem; font-size: 1.35rem; }
        .pp-ios p { color: var(--pp-muted); font-size: 0.92rem; line-height: 1.5; }
      `}</style>

      <div className="pp-shell">
        <header className="pp-top">
          <Link to="/captar/restaurante" className="pp-back">
            <ArrowLeft size={16} />
            Voltar
          </Link>
          <div className="pp-brand">
            <img src="/bora-comer-icon-192.png" alt="" />
            Bora Comer!
          </div>
          <button
            type="button"
            className="pp-theme"
            onClick={toggleTheme}
            aria-label={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
            title={isDark ? 'Modo claro' : 'Modo escuro'}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </header>

        <div className="pp-hero">
          <h1>Escolha o plano certo para a sua loja</h1>
          <p>
            {PARTNERSHIP_TRIAL_DAYS} dias grátis para testar. Depois, mensalidade + taxa por pedido.
          </p>
        </div>

        <div className="pp-billing-wrap">
          <div className="pp-billing" role="group" aria-label="Ciclo de cobrança">
            <button
              type="button"
              className={`pp-billing__btn${billing === 'monthly' ? ' is-active' : ''}`}
              onClick={() => setBilling('monthly')}
              aria-pressed={billing === 'monthly'}
            >
              <strong>Mensal</strong>
              <span>Sem compromisso</span>
            </button>
            <button
              type="button"
              className={`pp-billing__btn${billing === 'annual' ? ' is-active' : ''}`}
              onClick={() => setBilling('annual')}
              aria-pressed={billing === 'annual'}
            >
              <strong>
                <Crown size={14} aria-hidden />
                Anual
              </strong>
              <span>Economize até 15%</span>
            </button>
          </div>
          {billing === 'annual' && (
            <p className="pp-hint">
              <ArrowRight size={14} aria-hidden />
              Pague 12 meses e economize em todos os planos
            </p>
          )}
        </div>

        {authLoading || loadingRestaurant ? (
          <div style={{ display: 'grid', placeItems: 'center', padding: '3rem 0' }}>
            <Loader2 className="animate-spin" style={{ color: 'var(--pp-orange)' }} size={28} />
          </div>
        ) : (
          <>
            {statusBanner && (
              <div className="pp-banner">
                {statusBanner.text}
                {restaurant && (
                  <div style={{ marginTop: 4, opacity: 0.75, fontSize: 12 }}>
                    {restaurant.name}
                    {effectiveStatus ? ` · status: ${effectiveStatus}` : ''}
                  </div>
                )}
              </div>
            )}

            {access?.access &&
              access.reason === 'active' &&
              !hasActiveDigitalMenu(restaurant?.digitalMenu) && (
                <button
                  type="button"
                  className="pp-banner"
                  style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}
                  onClick={() => setShowDigitalMenuUpsell(true)}
                >
                  <strong style={{ color: 'var(--pp-orange)' }}>Oferta · </strong>
                  Cardápio digital + IA WhatsApp — {DIGITAL_MENU_OFFER.priceLabel}
                </button>
              )}

            <div className="pp-grid">
              {PLANS.map((plan) => {
                const price = billing === 'annual' ? plan.annualMonthly : plan.monthly;
                const busy = submitting && selectedPlan === plan.id;
                return (
                  <article
                    key={plan.id}
                    className={`pp-card${plan.featured ? ' pp-card--featured' : ''}`}
                  >
                    {plan.featured && (
                      <span className="pp-badge">
                        <Crown size={12} aria-hidden />
                        Mais escolhido
                      </span>
                    )}
                    <div className="pp-card__top">
                      <PlanIcon kind={plan.icon} />
                    </div>
                    <h2>{plan.name}</h2>
                    <p className="pp-card__tag">{plan.tagline}</p>
                    <div className="pp-price">
                      <span className="pp-price__value">{formatBRL(price)}</span>
                      <span className="pp-price__period">/mês</span>
                    </div>
                    <div className="pp-annual">
                      {billing === 'annual' ? (
                        <>
                          <span>no plano anual</span>
                          <span className="pp-save">Economize {plan.savePercent}%</span>
                        </>
                      ) : (
                        <>
                          <span>
                            {formatBRL(plan.annualMonthly)}/mês no plano anual
                          </span>
                          <span className="pp-save">Economize {plan.savePercent}%</span>
                        </>
                      )}
                    </div>
                    <PlanVisual kind={plan.visual} />
                    {plan.featuresIntro ? (
                      <p className="pp-features-intro">{plan.featuresIntro}</p>
                    ) : null}
                    <ul className="pp-features">
                      {plan.features.map((f) => (
                        <li key={f.text}>
                          <Check size={16} aria-hidden />
                          <span>
                            {f.text}
                            {f.badge === 'stripe' ? (
                              <span className="pp-chip pp-chip--stripe">stripe</span>
                            ) : null}
                            {f.badge === 'exclusive' ? (
                              <span className="pp-chip pp-chip--exclusive">Exclusivo</span>
                            ) : null}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      className={`pp-btn pp-btn--${plan.ctaStyle}`}
                      disabled={submitting}
                      onClick={() => handleSubscribe(plan.id)}
                    >
                      {busy ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          {plan.cta}
                          <ArrowRight size={16} aria-hidden />
                        </>
                      )}
                    </button>
                  </article>
                );
              })}
            </div>

            {message && (
              <div className="pp-msg">
                {message.type === 'ok' && <CheckCircle2 size={16} style={{ color: 'var(--pp-green)' }} />}
                <span>{message.text}</span>
              </div>
            )}

            {access?.access && access.reason === 'active' && currentRestaurantId && (
              <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <button type="button" className="pp-back" onClick={goToPanel}>
                  Ir para o painel
                </button>
              </div>
            )}

            <div className="pp-trust">
              <div className="pp-trust__item">
                <Shield size={18} aria-hidden />
                <div>
                  <strong>Pagamentos seguros</strong>
                  <span>Processamento via Stripe</span>
                </div>
              </div>
              <div className="pp-trust__item">
                <TrendingUp size={18} aria-hidden />
                <div>
                  <strong>Sem taxa de adesão</strong>
                  <span>Comece a usar hoje</span>
                </div>
              </div>
              <div className="pp-trust__item">
                <Headphones size={18} aria-hidden />
                <div>
                  <strong>Suporte especializado</strong>
                  <span>De verdade, com pessoas</span>
                </div>
              </div>
              <div className="pp-trust__item">
                <InfinityIcon size={18} aria-hidden />
                <div>
                  <strong>Planos flexíveis</strong>
                  <span>Cancele quando quiser</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <DigitalMenuUpsellModal
        open={showDigitalMenuUpsell}
        onAccept={handleDigitalMenuAccept}
        onDismiss={() => setShowDigitalMenuUpsell(false)}
      />
    </div>
  );
}
