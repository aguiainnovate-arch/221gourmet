import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calculator, CalendarClock, CircleDollarSign } from 'lucide-react';
import {
  PARTNERSHIP_FEE_WAIVER_THRESHOLD,
  PARTNERSHIP_MONTHLY_FEE,
  PARTNERSHIP_PLANS,
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
    <div className={`calc-page${reveal ? ' is-ready' : ''}`}>
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
          min-height: 100vh;
          background:
            radial-gradient(ellipse 90% 55% at 12% -10%, rgba(233, 17, 32, 0.22), transparent 55%),
            radial-gradient(ellipse 70% 45% at 100% 0%, rgba(245, 185, 66, 0.08), transparent 50%),
            linear-gradient(180deg, #120e0c 0%, var(--calc-bg) 40%, #070605 100%);
          color: var(--calc-ink);
          font-family: var(--calc-body);
          opacity: 0;
          transform: translateY(8px);
          transition: opacity 0.55s ease, transform 0.55s ease;
        }
        .calc-page.is-ready {
          opacity: 1;
          transform: none;
        }
        .calc-page * { box-sizing: border-box; }
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
          background:
            linear-gradient(135deg, rgba(233, 17, 32, 0.28), rgba(233, 17, 32, 0.05) 55%),
            #1a1010;
          border: 1px solid rgba(233, 17, 32, 0.35);
          animation: calcPulse 0.45s ease;
        }
        .calc-hero-metric.is-loss {
          background:
            linear-gradient(135deg, rgba(245, 185, 66, 0.2), rgba(245, 185, 66, 0.04) 55%),
            #1a1510;
          border-color: rgba(245, 185, 66, 0.35);
        }
        @keyframes calcPulse {
          from { transform: scale(0.985); opacity: 0.7; }
          to { transform: scale(1); opacity: 1; }
        }
        .calc-hero-metric__label {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          color: rgba(247, 241, 234, 0.78);
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
        }
        .calc-hero-metric__hint {
          margin: 0.55rem 0 0;
          color: rgba(247, 241, 234, 0.7);
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
          flex-wrap: wrap;
          gap: 0.65rem;
          margin-top: 1rem;
        }
        .calc-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          text-decoration: none;
          border-radius: 999px;
          padding: 0.8rem 1.15rem;
          font-weight: 600;
          font-size: 0.92rem;
          transition: transform 0.15s ease, background 0.2s ease, border-color 0.2s ease;
        }
        .calc-btn:hover { transform: translateY(-1px); }
        .calc-btn--primary {
          background: var(--calc-red);
          color: white;
        }
        .calc-btn--ghost {
          color: var(--calc-ink);
          border: 1px solid var(--calc-line);
          background: transparent;
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
          <Link to="/planos" className="calc-nav__link">
            Ver planos
          </Link>
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
                  ['store_delivery', 'Entrega pela loja', `${PARTNERSHIP_PLANS.store_delivery.platformFeePercent}%`],
                  [
                    'platform_delivery',
                    'Entrega pela Bora Comer',
                    `${PARTNERSHIP_PLANS.platform_delivery.platformFeePercent}%`,
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
                  <span>Taxa da plataforma ({result.feePercent}%)</span>
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
                <Link to="/planos" className="calc-btn calc-btn--primary">
                  Quero assinar
                  <ArrowRight size={16} aria-hidden />
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
