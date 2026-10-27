import { useEffect, useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Calculator,
  CalendarClock,
  CircleDollarSign,
  Moon,
  Sun,
} from 'lucide-react';
import {
  PARTNERSHIP_FEE_WAIVER_THRESHOLD,
  PARTNERSHIP_MONTHLY_FEE,
  PARTNERSHIP_PLANS,
  formatFeePercent,
  type PartnershipDeliveryMode,
} from '../types/partnership';
import {
  computeProfit,
  formatBRL,
  formatDays,
  type ProfitCalculatorInput,
} from '../utils/profitCalculator';

const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;600;700;800&family=IBM+Plex+Sans:wght@400;500;600&display=swap';

const THEME_KEY = 'calc-theme';

const tokens = {
  bg: '#0C0A09',
  bgElevated: '#161210',
  ink: '#F7F1EA',
  muted: '#A89A8E',
  line: 'rgba(247, 241, 234, 0.12)',
  red: '#E91120',
  redSoft: 'rgba(233, 17, 32, 0.16)',
  green: '#3DDC97',
  amber: '#F5B942',
};

function SliderField({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
  display,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (n: number) => void;
  display: string;
}) {
  return (
    <label className="calc-field">
      <span className="calc-field__row">
        <span className="calc-field__label">{label}</span>
        <span className="calc-field__value">
          {display}
          {suffix ? <span className="calc-field__suffix">{suffix}</span> : null}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="calc-range"
        aria-label={label}
      />
    </label>
  );
}

export default function ProfitCalculatorLanding() {
  const [ordersPerDay, setOrdersPerDay] = useState(25);
  const [ticketAverage, setTicketAverage] = useState(45);
  const [foodCostPercent, setFoodCostPercent] = useState(35);
  const [deliveryMode, setDeliveryMode] = useState<PartnershipDeliveryMode>('store_delivery');
  const [reveal, setReveal] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      return window.localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });
  const isDark = theme === 'dark';

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FONT_HREF;
    document.head.appendChild(link);
    const id = requestAnimationFrame(() => setReveal(true));
    return () => {
      cancelAnimationFrame(id);
      link.remove();
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* armazenamento indisponível */
    }
  }, [theme]);

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
      next === 'light' ? '#F7F1EA' : '#0C0A09'
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

  const input: ProfitCalculatorInput = useMemo(
    () => ({ ordersPerDay, ticketAverage, foodCostPercent, deliveryMode }),
    [ordersPerDay, ticketAverage, foodCostPercent, deliveryMode]
  );

  const result = useMemo(() => computeProfit(input), [input]);
  const compareOther = useMemo(
    () =>
      computeProfit({
        ...input,
        deliveryMode:
          deliveryMode === 'store_delivery' ? 'platform_delivery' : 'store_delivery',
      }),
    [input, deliveryMode]
  );

  return (
    <div className={`calc-page${reveal ? ' is-ready' : ''}${isDark ? '' : ' is-light'}`}>
      <style>{`
        .calc-page {
          --calc-bg: ${tokens.bg};
          --calc-elev: ${tokens.bgElevated};
          --calc-ink: ${tokens.ink};
          --calc-muted: ${tokens.muted};
          --calc-line: ${tokens.line};
          --calc-red: ${tokens.red};
          --calc-red-soft: ${tokens.redSoft};
          --calc-green: ${tokens.green};
          --calc-amber: ${tokens.amber};
          --calc-display: "Bricolage Grotesque", "Arial Black", sans-serif;
          --calc-body: "IBM Plex Sans", "Segoe UI", sans-serif;
          --calc-hero-metric-bg: linear-gradient(135deg, rgba(233, 17, 32, 0.28), rgba(233, 17, 32, 0.05) 55%), #1a1010;
          --calc-hero-metric-border: rgba(233, 17, 32, 0.35);
          --calc-hero-metric-label: rgba(247, 241, 234, 0.78);
          --calc-hero-metric-hint: rgba(247, 241, 234, 0.7);
          --calc-hero-loss-bg: linear-gradient(135deg, rgba(245, 185, 66, 0.2), rgba(245, 185, 66, 0.04) 55%), #1a1510;
          --calc-hero-loss-border: rgba(245, 185, 66, 0.35);
          --calc-page-bg:
            radial-gradient(ellipse 90% 55% at 12% -10%, rgba(233, 17, 32, 0.22), transparent 55%),
            radial-gradient(ellipse 70% 45% at 100% 0%, rgba(245, 185, 66, 0.08), transparent 50%),
            linear-gradient(180deg, #120e0c 0%, var(--calc-bg) 40%, #070605 100%);
          min-height: 100vh;
          background: var(--calc-page-bg);
          color: var(--calc-ink);
          font-family: var(--calc-body);
          opacity: 0;
          transform: translateY(8px);
          transition: opacity 0.55s ease, transform 0.55s ease;
        }
        .calc-page.is-light {
          --calc-bg: #F7F1EA;
          --calc-elev: #FFFFFF;
          --calc-ink: #1C1410;
          --calc-muted: #6B5A54;
          --calc-line: rgba(28, 20, 16, 0.12);
          --calc-red-soft: rgba(233, 17, 32, 0.1);
          --calc-hero-metric-bg: linear-gradient(135deg, rgba(233, 17, 32, 0.14), rgba(233, 17, 32, 0.04) 55%), #fff5f5;
          --calc-hero-metric-border: rgba(233, 17, 32, 0.28);
          --calc-hero-metric-label: rgba(28, 20, 16, 0.72);
          --calc-hero-metric-hint: rgba(28, 20, 16, 0.62);
          --calc-hero-loss-bg: linear-gradient(135deg, rgba(245, 185, 66, 0.22), rgba(245, 185, 66, 0.06) 55%), #fff8eb;
          --calc-hero-loss-border: rgba(180, 120, 20, 0.35);
          --calc-page-bg:
            radial-gradient(ellipse 90% 55% at 12% -10%, rgba(233, 17, 32, 0.1), transparent 55%),
            radial-gradient(ellipse 70% 45% at 100% 0%, rgba(245, 185, 66, 0.12), transparent 50%),
            linear-gradient(180deg, #FFF9F3 0%, var(--calc-bg) 42%, #F0E6DA 100%);
        }
        .calc-page.is-ready {
          opacity: 1;
          transform: none;
        }
        .calc-page * { box-sizing: border-box; }
        /* Vence o label { color: #1f2937 } global do app */
        .calc-page label,
        .calc-page label.calc-field {
          color: inherit;
        }
        .calc-shell {
          width: min(1120px, calc(100% - 2rem));
          margin: 0 auto;
          padding: 1.25rem 0 4rem;
        }
        .calc-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 2.5rem;
        }
        .calc-brand {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          text-decoration: none;
          color: inherit;
        }
        .calc-brand img {
          height: 42px;
          width: auto;
          display: block;
        }
        .calc-brand__name {
          font-family: var(--calc-display);
          font-weight: 800;
          font-size: 1.15rem;
          letter-spacing: -0.02em;
          line-height: 1;
        }
        .calc-brand__tag {
          display: block;
          margin-top: 0.2rem;
          font-size: 0.68rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--calc-muted);
        }
        .calc-nav__actions {
          display: flex;
          align-items: center;
          gap: 0.55rem;
        }
        .calc-nav__link {
          color: var(--calc-ink);
          text-decoration: none;
          font-size: 0.9rem;
          font-weight: 500;
          border: 1px solid var(--calc-line);
          padding: 0.55rem 0.95rem;
          border-radius: 999px;
          transition: background 0.2s ease, border-color 0.2s ease;
        }
        .calc-nav__link:hover {
          background: rgba(255,255,255,0.04);
          border-color: rgba(247, 241, 234, 0.28);
        }
        .calc-page.is-light .calc-nav__link:hover {
          background: rgba(28, 20, 16, 0.04);
          border-color: rgba(28, 20, 16, 0.22);
        }
        .calc-theme-btn {
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 999px;
          border: 1px solid var(--calc-line);
          background: transparent;
          color: var(--calc-amber);
          display: grid;
          place-items: center;
          cursor: pointer;
          transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
        }
        .calc-page.is-light .calc-theme-btn {
          color: #5C4A42;
        }
        .calc-theme-btn:hover {
          background: rgba(255,255,255,0.06);
          border-color: rgba(247, 241, 234, 0.28);
        }
        .calc-page.is-light .calc-theme-btn:hover {
          background: rgba(28, 20, 16, 0.05);
          border-color: rgba(28, 20, 16, 0.2);
        }
        .calc-hero {
          display: grid;
          gap: 1.25rem;
          margin-bottom: 2rem;
          max-width: 42rem;
        }
        .calc-kicker {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          color: var(--calc-amber);
          font-size: 0.78rem;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .calc-title {
          font-family: var(--calc-display);
          font-weight: 800;
          font-size: clamp(2.35rem, 6vw, 4.1rem);
          line-height: 0.95;
          letter-spacing: -0.035em;
          margin: 0;
        }
        .calc-title em {
          font-style: normal;
          color: var(--calc-red);
        }
        .calc-lead {
          margin: 0;
          color: var(--calc-muted);
          font-size: 1.05rem;
          line-height: 1.55;
          max-width: 34rem;
        }
        .calc-grid {
          display: grid;
          grid-template-columns: 1.05fr 0.95fr;
          gap: 1.25rem;
          align-items: start;
        }
        @media (max-width: 900px) {
          .calc-grid { grid-template-columns: 1fr; }
        }
        .calc-panel {
          background: linear-gradient(160deg, rgba(255,255,255,0.04), transparent 40%), var(--calc-elev);
          border: 1px solid var(--calc-line);
          border-radius: 1.35rem;
          padding: 1.35rem;
          box-shadow: 0 24px 60px rgba(0,0,0,0.35);
        }
        .calc-page.is-light .calc-panel {
          box-shadow: 0 16px 40px rgba(42, 30, 26, 0.08);
          background: var(--calc-elev);
        }
        .calc-panel__head {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          margin-bottom: 1.15rem;
        }
        .calc-panel__head h2 {
          margin: 0;
          font-family: var(--calc-display);
          font-size: 1.35rem;
          letter-spacing: -0.02em;
        }
        .calc-panel__icon {
          width: 2.25rem;
          height: 2.25rem;
          border-radius: 0.7rem;
          display: grid;
          place-items: center;
          background: var(--calc-red-soft);
          color: var(--calc-red);
        }
        .calc-modes {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.55rem;
          margin-bottom: 1.15rem;
        }
        .calc-mode {
          appearance: none;
          border: 1px solid var(--calc-line);
          background: transparent;
          color: var(--calc-muted);
          border-radius: 0.9rem;
          padding: 0.85rem 0.75rem;
          text-align: left;
          cursor: pointer;
          transition: border-color 0.2s ease, background 0.2s ease, color 0.2s ease;
        }
        .calc-mode.is-active {
          border-color: rgba(233, 17, 32, 0.65);
          background: var(--calc-red-soft);
          color: var(--calc-ink);
        }
        .calc-mode strong {
          display: block;
          font-size: 0.92rem;
          margin-bottom: 0.2rem;
          color: inherit;
        }
        .calc-mode span {
          font-size: 0.75rem;
          opacity: 0.85;
        }
        .calc-field { display: block; margin-bottom: 1.1rem; }
        .calc-field__row {
          display: flex;
          justify-content: space-between;
          gap: 0.75rem;
          margin-bottom: 0.45rem;
        }
        .calc-field__label {
          color: var(--calc-muted);
          font-size: 0.88rem;
        }
        .calc-field__value {
          font-family: var(--calc-display);
          font-weight: 700;
          font-size: 1.05rem;
          letter-spacing: -0.02em;
          color: var(--calc-ink);
        }
        .calc-field__suffix {
          margin-left: 0.2rem;
          color: var(--calc-muted);
          font-weight: 500;
          font-size: 0.85rem;
        }
        .calc-range {
          width: 100%;
          accent-color: var(--calc-red);
          height: 0.35rem;
          cursor: pointer;
          color: var(--calc-ink);
        }
        .calc-note {
          margin: 0.35rem 0 0;
          color: var(--calc-muted);
          font-size: 0.78rem;
          line-height: 1.45;
        }
        .calc-results {
          display: grid;
          gap: 0.85rem;
        }
        .calc-hero-metric {
          position: relative;
          overflow: hidden;
          border-radius: 1.2rem;
          padding: 1.25rem 1.2rem 1.15rem;
          background: var(--calc-hero-metric-bg);
          border: 1px solid var(--calc-hero-metric-border);
          animation: calcPulse 0.45s ease;
          color: var(--calc-ink);
        }
        .calc-hero-metric.is-loss {
          background: var(--calc-hero-loss-bg);
          border-color: var(--calc-hero-loss-border);
        }
        @keyframes calcPulse {
          from { transform: scale(0.985); opacity: 0.7; }
          to { transform: scale(1); opacity: 1; }
        }
        .calc-hero-metric__label {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          color: var(--calc-hero-metric-label);
          font-size: 0.82rem;
          font-weight: 500;
          margin-bottom: 0.35rem;
        }
        .calc-hero-metric__value {
          font-family: var(--calc-display);
          font-weight: 800;
          font-size: clamp(2rem, 5vw, 2.75rem);
          letter-spacing: -0.04em;
          line-height: 1;
          color: var(--calc-ink);
        }
        .calc-hero-metric__hint {
          margin: 0.55rem 0 0;
          color: var(--calc-hero-metric-hint);
          font-size: 0.82rem;
          line-height: 1.4;
        }
        .calc-pair {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
        }
        @media (max-width: 520px) {
          .calc-pair, .calc-modes { grid-template-columns: 1fr; }
        }
        .calc-metric {
          border: 1px solid var(--calc-line);
          border-radius: 1rem;
          padding: 0.95rem 0.9rem;
          background: rgba(255,255,255,0.02);
        }
        .calc-page.is-light .calc-metric {
          background: rgba(28, 20, 16, 0.03);
        }
        .calc-metric__label {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          color: var(--calc-muted);
          font-size: 0.78rem;
          margin-bottom: 0.35rem;
        }
        .calc-metric__value {
          font-family: var(--calc-display);
          font-weight: 700;
          font-size: 1.35rem;
          letter-spacing: -0.03em;
          color: var(--calc-ink);
        }
        .calc-page.is-light .calc-compare {
          background: rgba(28, 20, 16, 0.03);
        }
        .calc-breakdown {
          list-style: none;
          margin: 0;
          padding: 0;
          border-top: 1px solid var(--calc-line);
          padding-top: 0.85rem;
        }
        .calc-breakdown li {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          font-size: 0.88rem;
          padding: 0.35rem 0;
          color: var(--calc-muted);
        }
        .calc-breakdown strong {
          color: var(--calc-ink);
          font-weight: 600;
        }
        .calc-compare {
          margin-top: 0.35rem;
          padding: 0.85rem 0.95rem;
          border-radius: 0.95rem;
          background: rgba(255,255,255,0.03);
          border: 1px dashed var(--calc-line);
          font-size: 0.84rem;
          color: var(--calc-muted);
          line-height: 1.45;
        }
        .calc-compare strong { color: var(--calc-ink); }
        .calc-cta {
          display: flex;
          flex-direction: column;
          gap: 0.7rem;
          margin-top: 1.15rem;
          padding-top: 1.15rem;
          border-top: 1px solid var(--calc-line);
        }
        .calc-cta__pitch {
          margin: 0;
          font-size: 0.82rem;
          color: var(--calc-muted);
          line-height: 1.4;
        }
        .calc-cta__pitch strong {
          color: var(--calc-ink);
          font-weight: 600;
        }
        .calc-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.55rem;
          text-decoration: none;
          border-radius: 999px;
          padding: 0.95rem 1.25rem;
          font-weight: 700;
          font-size: 1rem;
          letter-spacing: -0.01em;
          transition: transform 0.18s ease, background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
        }
        .calc-btn:hover { transform: translateY(-2px); }
        .calc-btn:active { transform: translateY(0); }
        .calc-btn--primary {
          width: 100%;
          background: linear-gradient(180deg, #ff2a38 0%, var(--calc-red) 55%, #c40e1a 100%);
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.14);
          box-shadow:
            0 0 0 1px rgba(233, 17, 32, 0.35),
            0 10px 28px rgba(233, 17, 32, 0.45),
            0 2px 0 rgba(255, 255, 255, 0.18) inset;
          animation: calcCtaPulse 2.4s ease-in-out infinite;
        }
        .calc-btn--primary:hover {
          filter: brightness(1.06);
          box-shadow:
            0 0 0 1px rgba(233, 17, 32, 0.5),
            0 14px 36px rgba(233, 17, 32, 0.55),
            0 2px 0 rgba(255, 255, 255, 0.22) inset;
        }
        .calc-btn--primary svg {
          transition: transform 0.18s ease;
        }
        .calc-btn--primary:hover svg {
          transform: translateX(3px);
        }
        @keyframes calcCtaPulse {
          0%, 100% {
            box-shadow:
              0 0 0 1px rgba(233, 17, 32, 0.35),
              0 10px 28px rgba(233, 17, 32, 0.45),
              0 2px 0 rgba(255, 255, 255, 0.18) inset;
          }
          50% {
            box-shadow:
              0 0 0 1px rgba(233, 17, 32, 0.55),
              0 12px 34px rgba(233, 17, 32, 0.62),
              0 2px 0 rgba(255, 255, 255, 0.18) inset;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .calc-btn--primary { animation: none; }
        }
        .calc-btn--ghost {
          width: 100%;
          color: var(--calc-ink);
          border: 1.5px solid rgba(247, 241, 234, 0.28);
          background: rgba(255, 255, 255, 0.06);
          font-weight: 600;
        }
        .calc-page.is-light .calc-btn--ghost {
          border-color: rgba(28, 20, 16, 0.18);
          background: rgba(28, 20, 16, 0.04);
        }
        .calc-btn--ghost:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(247, 241, 234, 0.45);
        }
        .calc-page.is-light .calc-btn--ghost:hover {
          background: rgba(28, 20, 16, 0.07);
          border-color: rgba(28, 20, 16, 0.28);
        }
        .calc-foot {
          margin-top: 2rem;
          color: var(--calc-muted);
          font-size: 0.78rem;
          line-height: 1.5;
          max-width: 46rem;
        }
      `}</style>

      <div className="calc-shell">
        <header className="calc-nav">
          <Link to="/parceiros" className="calc-brand" aria-label="Bora Comer">
            <img src="/BoraComerlogo.png" alt="Bora Comer" />
            <span>
              <span className="calc-brand__name">Bora Comer!</span>
              <span className="calc-brand__tag">Calculadora</span>
            </span>
          </Link>
          <div className="calc-nav__actions">
            <Link to="/planos" className="calc-nav__link">
              Ver planos
            </Link>
            <button
              type="button"
              className="calc-theme-btn"
              onClick={toggleTheme}
              aria-label={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
              title={isDark ? 'Modo claro' : 'Modo escuro'}
            >
              {isDark ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
            </button>
          </div>
        </header>

        <section className="calc-hero">
          <p className="calc-kicker">
            <Calculator size={14} aria-hidden />
            Simulador de lucro
          </p>
          <h1 className="calc-title">
            Quanto sua loja <em>lucra</em> com a Bora Comer
          </h1>
          <p className="calc-lead">
            Ajuste pedidos, ticket e custo do prato. Veja o lucro do mês e em quantos dias a
            mensalidade se paga.
          </p>
        </section>

        <div className="calc-grid">
          <section className="calc-panel" aria-labelledby="calc-inputs-title">
            <div className="calc-panel__head">
              <span className="calc-panel__icon" aria-hidden>
                <Calculator size={18} />
              </span>
              <h2 id="calc-inputs-title">Seus números</h2>
            </div>

            <div className="calc-modes" role="group" aria-label="Tipo de entrega">
              {(
                [
                  [
                    'store_delivery',
                    'Entrega pela loja',
                    formatFeePercent(PARTNERSHIP_PLANS.store_delivery.platformFeePercent),
                  ],
                  [
                    'platform_delivery',
                    'Entrega pela Bora Comer',
                    formatFeePercent(PARTNERSHIP_PLANS.platform_delivery.platformFeePercent),
                  ],
                ] as const
              ).map(([id, title, fee]) => (
                <button
                  key={id}
                  type="button"
                  className={`calc-mode${deliveryMode === id ? ' is-active' : ''}`}
                  onClick={() => setDeliveryMode(id)}
                  aria-pressed={deliveryMode === id}
                >
                  <strong>{title}</strong>
                  <span>Taxa {fee}</span>
                </button>
              ))}
            </div>

            <SliderField
              label="Pedidos por dia"
              value={ordersPerDay}
              min={1}
              max={120}
              step={1}
              onChange={setOrdersPerDay}
              display={String(ordersPerDay)}
            />
            <SliderField
              label="Ticket médio"
              value={ticketAverage}
              min={15}
              max={120}
              step={1}
              onChange={setTicketAverage}
              display={formatBRL(ticketAverage)}
            />
            <SliderField
              label="Custo do prato (CMV)"
              value={foodCostPercent}
              min={10}
              max={70}
              step={1}
              suffix="%"
              onChange={setFoodCostPercent}
              display={String(foodCostPercent)}
            />
            <p className="calc-note">
              Mensalidade de referência: {formatBRL(PARTNERSHIP_MONTHLY_FEE)}. Isenta enquanto o
              faturamento do mês ficar abaixo de {formatBRL(PARTNERSHIP_FEE_WAIVER_THRESHOLD)}.
              Simulação com 30 dias.
            </p>
          </section>

          <section className="calc-panel" aria-live="polite" aria-labelledby="calc-results-title">
            <div className="calc-panel__head">
              <span className="calc-panel__icon" aria-hidden>
                <CircleDollarSign size={18} />
              </span>
              <h2 id="calc-results-title">Resultado</h2>
            </div>

            <div className="calc-results">
              <div
                key={`profit-${result.netProfit.toFixed(0)}-${deliveryMode}`}
                className={`calc-hero-metric${result.alreadyProfitable ? '' : ' is-loss'}`}
              >
                <div className="calc-hero-metric__label">
                  <CircleDollarSign size={15} aria-hidden />
                  Lucro estimado no mês
                </div>
                <div className="calc-hero-metric__value">{formatBRL(result.netProfit)}</div>
                <p className="calc-hero-metric__hint">
                  {result.alreadyProfitable
                    ? 'Depois da taxa da plataforma, do CMV e da mensalidade (se cobrada).'
                    : 'Com esses números o mês ainda não fecha no azul. Ajuste pedidos, ticket ou CMV.'}
                </p>
              </div>

              <div className="calc-pair">
                <div className="calc-metric">
                  <div className="calc-metric__label">
                    <CalendarClock size={14} aria-hidden />
                    Mensalidade se paga em
                  </div>
                  <div className="calc-metric__value">
                    {result.breakEvenDays === null
                      ? 'Sem margem'
                      : result.breakEvenDays === 0
                        ? 'Já isenta'
                        : formatDays(result.breakEvenDays)}
                  </div>
                </div>
                <div className="calc-metric">
                  <div className="calc-metric__label">Faturamento bruto</div>
                  <div className="calc-metric__value">{formatBRL(result.grossRevenue)}</div>
                </div>
              </div>

              <ul className="calc-breakdown">
                <li>
                  <span>Taxa da plataforma ({formatFeePercent(result.feePercent)})</span>
                  <strong>{formatBRL(result.platformFee)}</strong>
                </li>
                <li>
                  <span>Custo dos pratos (CMV)</span>
                  <strong>{formatBRL(result.foodCost)}</strong>
                </li>
                <li>
                  <span>
                    Mensalidade
                    {result.monthlyFeeWaived ? ' (isenta)' : ''}
                  </span>
                  <strong>{formatBRL(result.monthlyFeeCharged)}</strong>
                </li>
                <li>
                  <span>Pedidos no mês</span>
                  <strong>{result.ordersPerMonth.toLocaleString('pt-BR')}</strong>
                </li>
              </ul>

              <p className="calc-compare">
                No outro plano (
                {compareOther.deliveryMode === 'store_delivery'
                  ? 'entrega pela loja'
                  : 'entrega pela Bora Comer'}
                ), o lucro mensal seria{' '}
                <strong>{formatBRL(compareOther.netProfit)}</strong>
                {compareOther.breakEvenDays != null && compareOther.breakEvenDays > 0 ? (
                  <>
                    {' '}
                    e a mensalidade se pagaria em{' '}
                    <strong>{formatDays(compareOther.breakEvenDays)}</strong>.
                  </>
                ) : null}
              </p>

              <div className="calc-cta">
                <p className="calc-cta__pitch">
                  Pronto para colocar esses números pra rodar?{' '}
                  <strong>7 dias grátis</strong> para testar.
                </p>
                <Link to="/captar/restaurante" className="calc-btn calc-btn--primary">
                  Quero assinar
                  <ArrowRight size={18} aria-hidden />
                </Link>
                <Link to="/parceiros" className="calc-btn calc-btn--ghost">
                  Conhecer a Bora Comer
                </Link>
              </div>
            </div>
          </section>
        </div>

        <p className="calc-foot">
          Estimativa educativa com base nas taxas publicadas dos planos Bora Comer!. Não inclui
          impostos, taxas de cartão do restaurante nem custo de motoboy próprio. O valor exato no
          checkout pode variar conforme a assinatura ativa.
        </p>
      </div>
    </div>
  );
}
