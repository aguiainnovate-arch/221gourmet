import { useMemo, useState } from 'react';
import { ArrowRight, Calculator, CalendarClock, CircleDollarSign } from 'lucide-react';
import {
  PARTNERSHIP_FEE_WAIVER_THRESHOLD,
  PARTNERSHIP_MONTHLY_FEE,
  PARTNERSHIP_PLANS,
  PARTNERSHIP_TRIAL_DAYS,
  formatFeePercent,
  type PartnershipDeliveryMode,
} from '../../types/partnership';
import {
  computeProfit,
  formatBRL,
  formatDays,
  type ProfitCalculatorInput,
} from '../../utils/profitCalculator';

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
    <label className="captar-calc-field">
      <span className="captar-calc-field__row">
        <span className="captar-calc-field__label">{label}</span>
        <span className="captar-calc-field__value">
          {display}
          {suffix ? <span className="captar-calc-field__suffix">{suffix}</span> : null}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="captar-calc-range"
        aria-label={label}
      />
    </label>
  );
}

type Props = {
  onAssinar: () => void;
  featured?: boolean;
};

export default function CaptarProfitCalculator({ onAssinar, featured = false }: Props) {
  const [ordersPerDay, setOrdersPerDay] = useState(25);
  const [ticketAverage, setTicketAverage] = useState(45);
  const [foodCostPercent, setFoodCostPercent] = useState(35);
  const [deliveryMode, setDeliveryMode] = useState<PartnershipDeliveryMode>('store_delivery');

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
    <section
      className={`captar-section captar-calc${featured ? ' captar-calc--featured' : ''}`}
      id="calculadora"
    >
      <div className="captar-calc-head">
        <p className="captar-calc-kicker">
          <Calculator size={14} aria-hidden />
          Simulador de lucro
        </p>
        <h2>Quanto sua loja lucra na Bora Comer!</h2>
        <p className="captar-calc-lead">
          Ajuste pedidos, ticket e custo do prato. Veja o lucro do mês e em quantos dias a
          mensalidade se paga, com as mesmas taxas dos planos.
        </p>
      </div>

      <div className="captar-calc-grid">
        <div className="captar-calc-panel">
          <div className="captar-calc-panel__head">
            <span className="captar-calc-panel__icon" aria-hidden>
              <Calculator size={18} />
            </span>
            <h3>Seus números</h3>
          </div>

          <div className="captar-calc-modes" role="group" aria-label="Tipo de entrega">
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
                className={`captar-calc-mode${deliveryMode === id ? ' is-active' : ''}`}
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
          <p className="captar-calc-note">
            Mensalidade de referência: {formatBRL(PARTNERSHIP_MONTHLY_FEE)}. Isenta enquanto o
            faturamento do mês ficar abaixo de {formatBRL(PARTNERSHIP_FEE_WAIVER_THRESHOLD)}.
            Simulação com 30 dias.
          </p>
        </div>

        <div className="captar-calc-panel" aria-live="polite">
          <div className="captar-calc-panel__head">
            <span className="captar-calc-panel__icon" aria-hidden>
              <CircleDollarSign size={18} />
            </span>
            <h3>Resultado</h3>
          </div>

          <div
            key={`profit-${result.netProfit.toFixed(0)}-${deliveryMode}`}
            className={`captar-calc-hero${result.alreadyProfitable ? '' : ' is-loss'}`}
          >
            <div className="captar-calc-hero__label">
              <CircleDollarSign size={15} aria-hidden />
              Lucro estimado no mês
            </div>
            <div className="captar-calc-hero__value">{formatBRL(result.netProfit)}</div>
            <p className="captar-calc-hero__hint">
              {result.alreadyProfitable
                ? 'Depois da taxa da plataforma, do CMV e da mensalidade (se cobrada).'
                : 'Com esses números o mês ainda não fecha no azul. Ajuste pedidos, ticket ou CMV.'}
            </p>
          </div>

          <div className="captar-calc-pair">
            <div className="captar-calc-metric">
              <div className="captar-calc-metric__label">
                <CalendarClock size={14} aria-hidden />
                Mensalidade se paga em
              </div>
              <div className="captar-calc-metric__value">
                {result.breakEvenDays === null
                  ? 'Sem margem'
                  : result.breakEvenDays === 0
                    ? 'Já isenta'
                    : formatDays(result.breakEvenDays)}
              </div>
            </div>
            <div className="captar-calc-metric">
              <div className="captar-calc-metric__label">Faturamento bruto</div>
              <div className="captar-calc-metric__value">{formatBRL(result.grossRevenue)}</div>
            </div>
          </div>

          <ul className="captar-calc-breakdown">
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

          <p className="captar-calc-compare">
            No outro plano (
            {compareOther.deliveryMode === 'store_delivery'
              ? 'entrega pela loja'
              : 'entrega pela Bora Comer'}
            ), o lucro mensal seria <strong>{formatBRL(compareOther.netProfit)}</strong>
            {compareOther.breakEvenDays != null && compareOther.breakEvenDays > 0 ? (
              <>
                {' '}
                e a mensalidade se pagaria em{' '}
                <strong>{formatDays(compareOther.breakEvenDays)}</strong>.
              </>
            ) : null}
          </p>

          <div className="captar-calc-cta">
            <p className="captar-calc-cta__pitch">
              Gostou dos números? Teste grátis por{' '}
              <strong>{PARTNERSHIP_TRIAL_DAYS} dias</strong> e comece a vender no app.
            </p>
            <button type="button" className="captar-btn-solid captar-btn-lg captar-calc-cta__btn" onClick={onAssinar}>
              Quero assinar
              <ArrowRight size={18} aria-hidden />
            </button>
          </div>
        </div>
      </div>

      <p className="captar-calc-foot">
        Estimativa educativa com base nas taxas publicadas dos planos. Não inclui impostos, taxas
        de cartão do restaurante nem custo de motoboy próprio.
      </p>
    </section>
  );
}
