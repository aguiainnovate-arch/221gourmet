import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  CalendarDays,
  ChevronDown,
  Coins,
  Eye,
  Gift,
  Loader2,
  Percent,
  Plus,
  RefreshCw,
  Save,
  Settings2,
  Trash2,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import {
  DEFAULT_CASHBACK_SETTINGS,
  normalizeCashbackSettings,
  type CashbackComboRule,
  type CashbackDayRule,
  type CashbackProductOverride,
  type RestaurantCashbackSettings,
} from '../../types/cashback';
import { WEEKDAY_ORDER, type Weekday } from '../../types/restaurant';
import { updateRestaurantCashbackSettings } from '../../services/restaurantService';
import {
  getCashbackRestaurantStats,
  type CashbackRestaurantStats,
} from '../../services/cashbackService';
import type { Product } from '../../types/product';

const WEEKDAY_LABELS: Record<Weekday, string> = {
  monday: 'Seg',
  tuesday: 'Ter',
  wednesday: 'Qua',
  thursday: 'Qui',
  friday: 'Sex',
  saturday: 'Sáb',
  sunday: 'Dom',
};

interface CashbackSettingsPanelProps {
  restaurantId: string;
  initialSettings?: RestaurantCashbackSettings | null;
  products: Product[];
  onSaved?: (settings: RestaurantCashbackSettings) => void;
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-[52px] shrink-0 rounded-full transition-colors ${
        checked ? 'bg-[#e10600]' : 'bg-white/15'
      }`}
    >
      <span
        className={`absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow transition-all ${
          checked ? 'left-[27px]' : 'left-[3px]'
        }`}
      />
    </button>
  );
}

const inputClass =
  'w-full rounded-xl border border-white/10 bg-[#1b1b22] px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#e10600]';

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[13px] font-medium text-white/85">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <span className="mt-1.5 block text-[11px] leading-snug text-white/40">{hint}</span>}
    </label>
  );
}

function KpiCard({
  icon,
  iconClass,
  label,
  value,
  sub,
}: {
  icon: ReactNode;
  iconClass: string;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#141419] px-4 py-3.5">
      <div className="flex items-center gap-2 text-white/55">
        <span className={`grid h-8 w-8 place-items-center rounded-lg ${iconClass}`}>{icon}</span>
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-2 text-[22px] font-extrabold leading-none text-white">{value}</p>
      <p className="mt-1.5 text-[11px] text-white/40">{sub}</p>
    </div>
  );
}

function AdvancedSection({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <details className="group rounded-2xl border border-white/[0.07] bg-[#101014]">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold text-white/85 [&::-webkit-details-marker]:hidden">
        <span className="flex-1">{title}</span>
        {typeof count === 'number' && count > 0 && (
          <span className="rounded-full bg-[#e10600] px-2 py-0.5 text-[11px] font-bold text-white">
            {count}
          </span>
        )}
        <ChevronDown className="h-4 w-4 text-white/40 transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-3 px-4 pb-4">{children}</div>
    </details>
  );
}

export default function CashbackSettingsPanel({
  restaurantId,
  initialSettings,
  products,
  onSaved,
}: CashbackSettingsPanelProps) {
  const [settings, setSettings] = useState<RestaurantCashbackSettings>(() =>
    normalizeCashbackSettings(initialSettings ?? DEFAULT_CASHBACK_SETTINGS)
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<CashbackRestaurantStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    setSettings(normalizeCashbackSettings(initialSettings ?? DEFAULT_CASHBACK_SETTINGS));
  }, [initialSettings]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      setStats(await getCashbackRestaurantStats(restaurantId));
    } catch (err) {
      console.error('[CashbackSettingsPanel] stats', err);
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const productOptions = useMemo(
    () =>
      [...products]
        .filter((p) => p.available !== false)
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [products]
  );

  const update = (patch: Partial<RestaurantCashbackSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
    setMessage(null);
    setError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const normalized = normalizeCashbackSettings(settings);
      await updateRestaurantCashbackSettings(restaurantId, normalized);
      setSettings(normalized);
      onSaved?.(normalized);
      setMessage(
        normalized.enabled
          ? 'Regras salvas. O cliente ganha o cashback quando o pedido é entregue.'
          : 'Cashback desligado nesta loja.'
      );
    } catch (err) {
      console.error('[CashbackSettingsPanel]', err);
      setError(err instanceof Error ? err.message : 'Falha ao salvar cashback');
    } finally {
      setSaving(false);
    }
  };

  const addDayRule = () => {
    const rule: CashbackDayRule = {
      id: newId('day'),
      days: ['monday'],
      percent: settings.defaultPercent,
    };
    update({ dayOfWeekRules: [...settings.dayOfWeekRules, rule] });
  };

  const addCombo = () => {
    const combo: CashbackComboRule = {
      id: newId('combo'),
      name: 'Combo especial',
      productIds: [],
      bonusFixed: 5,
    };
    update({ comboRules: [...settings.comboRules, combo] });
  };

  const addProductOverride = () => {
    const first = productOptions.find(
      (p) => !settings.productOverrides.some((o) => o.productId === p.id)
    );
    if (!first) {
      setError('Todos os produtos já têm regra específica, ou o cardápio está vazio.');
      return;
    }
    const row: CashbackProductOverride = { productId: first.id, percent: settings.defaultPercent };
    update({ productOverrides: [...settings.productOverrides, row] });
  };

  const exampleOrder = 120;
  const exampleEarn = Math.min(
    (exampleOrder * settings.defaultPercent) / 100,
    settings.maxEarnPerOrder ?? Number.POSITIVE_INFINITY
  );

  const addButtonClass =
    'inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] border border-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10';

  return (
    <div className="studio-dark rounded-[28px] bg-[#0b0b0e] px-3 py-5 text-white shadow-xl sm:px-5 sm:py-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-black leading-tight tracking-tight sm:text-[28px]">
            Cashback <span className="text-[#ff2e1f]">Inteligente</span>
          </h1>
          <p className="mt-1 text-sm text-white/55">
            Incentive novas compras com regras automáticas de cashback.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e10600]/15 text-[#ff5b4d]">
            <Gift className="h-5 w-5" />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-bold">
              {settings.enabled ? 'Cashback ativo' : 'Cashback desligado'}
            </span>
            <span className="block text-[11px] text-white/45">
              {settings.enabled
                ? 'Seus clientes já estão acumulando'
                : 'Ative para começar a acumular'}
            </span>
          </span>
          <Switch
            checked={settings.enabled}
            onChange={(value) => update({ enabled: value })}
            label="Ativar cashback"
          />
        </div>
      </div>

      {/* Indicadores reais da loja */}
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-end">
          <button
            type="button"
            onClick={() => void loadStats()}
            disabled={statsLoading}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-white/40 hover:text-white/70 disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${statsLoading ? 'animate-spin' : ''}`} />
            Atualizar números
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <KpiCard
            icon={<Users className="h-4 w-4" />}
            iconClass="bg-[#e10600]/15 text-[#ff5b4d]"
            label="Clientes com saldo"
            value={stats ? String(stats.clientsWithBalance) : '...'}
            sub="com saldo para usar nesta loja"
          />
          <KpiCard
            icon={<Coins className="h-4 w-4" />}
            iconClass="bg-amber-500/15 text-amber-400"
            label="Saldo em aberto"
            value={stats ? formatBRL(stats.openBalanceCents / 100) : '...'}
            sub="aguardando uso nos próximos pedidos"
          />
          <KpiCard
            icon={<TrendingUp className="h-4 w-4" />}
            iconClass="bg-emerald-500/15 text-emerald-400"
            label="Gerado no mês"
            value={stats ? formatBRL(stats.earnedThisMonthCents / 100) : '...'}
            sub="em pedidos entregues neste mês"
          />
        </div>
      </div>

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        {/* Configuração */}
        <section className="rounded-[24px] border border-white/[0.07] bg-[#141419] p-4 sm:p-5">
          <div className="flex items-center gap-2.5">
            <Settings2 className="h-5 w-5 text-[#ff5b4d]" />
            <div>
              <h2 className="font-extrabold">Configuração das regras</h2>
              <p className="text-[11px] text-white/40">
                O saldo do cliente só vale nesta loja.
              </p>
            </div>
          </div>

          <div
            className={`mt-5 space-y-5 ${settings.enabled ? '' : 'pointer-events-none opacity-50'}`}
            aria-disabled={!settings.enabled}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Percentual de cashback"
                hint={`O cliente recebe ${settings.defaultPercent}% do valor dos itens do pedido.`}
              >
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    className={`${inputClass} pl-9`}
                    value={settings.defaultPercent}
                    onChange={(e) => update({ defaultPercent: Number(e.target.value) })}
                  />
                </div>
              </Field>
              <Field label="Limite por pedido" hint="Valor máximo de cashback gerado em um pedido.">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-white/30">R$</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    placeholder="Sem limite"
                    className={`${inputClass} pl-9`}
                    value={settings.maxEarnPerOrder ?? ''}
                    onChange={(e) =>
                      update({
                        maxEarnPerOrder: e.target.value === '' ? undefined : Number(e.target.value),
                      })
                    }
                  />
                </div>
              </Field>
              <Field
                label="Uso máximo do saldo"
                hint="Quanto do total do pedido o cliente pode pagar com cashback."
              >
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    className={`${inputClass} pl-9`}
                    value={settings.maxSpendPercentOfTotal ?? 50}
                    onChange={(e) => update({ maxSpendPercentOfTotal: Number(e.target.value) })}
                  />
                </div>
              </Field>
            </div>

            <AdvancedSection title="Dias especiais" count={settings.dayOfWeekRules.length}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-white/40">Um % diferente em dias escolhidos da semana.</p>
                <button type="button" onClick={addDayRule} className={addButtonClass}>
                  <Plus className="h-3.5 w-3.5" /> Dia especial
                </button>
              </div>
              {settings.dayOfWeekRules.length === 0 && (
                <p className="text-sm text-white/40">Sem regras. Vale o % padrão todos os dias.</p>
              )}
              {settings.dayOfWeekRules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex flex-col gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3 sm:flex-row sm:items-center"
                >
                  <div className="flex flex-1 flex-wrap gap-1.5">
                    {WEEKDAY_ORDER.map((day) => {
                      const on = rule.days.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            const days = on
                              ? rule.days.filter((d) => d !== day)
                              : [...rule.days, day];
                            update({
                              dayOfWeekRules: settings.dayOfWeekRules.map((r) =>
                                r.id === rule.id ? { ...r, days } : r
                              ),
                            });
                          }}
                          className={`rounded-md px-2 py-1 text-xs font-semibold ${
                            on ? 'bg-[#e10600] text-white' : 'bg-white/[0.06] text-white/60 ring-1 ring-white/10'
                          }`}
                        >
                          {WEEKDAY_LABELS[day]}
                        </button>
                      );
                    })}
                  </div>
                  <label className="flex items-center gap-2 text-sm text-white/60">
                    <span>%</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className="w-20 rounded-lg border border-white/10 bg-[#1b1b22] px-2 py-1.5 text-white outline-none focus:border-[#e10600]"
                      value={rule.percent}
                      onChange={(e) =>
                        update({
                          dayOfWeekRules: settings.dayOfWeekRules.map((r) =>
                            r.id === rule.id ? { ...r, percent: Number(e.target.value) } : r
                          ),
                        })
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="rounded-lg p-2 text-white/35 hover:bg-white/[0.06] hover:text-red-400"
                    onClick={() =>
                      update({
                        dayOfWeekRules: settings.dayOfWeekRules.filter((r) => r.id !== rule.id),
                      })
                    }
                    aria-label="Remover regra"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </AdvancedSection>

            <AdvancedSection title="Produtos com % diferente" count={settings.productOverrides.length}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-white/40">Ex.: sobremesa com 10%, ou produto sem cashback.</p>
                <button type="button" onClick={addProductOverride} className={addButtonClass}>
                  <Plus className="h-3.5 w-3.5" /> Produto
                </button>
              </div>
              {settings.productOverrides.length === 0 && (
                <p className="text-sm text-white/40">Nenhum produto com regra própria.</p>
              )}
              {settings.productOverrides.map((row, idx) => (
                <div
                  key={`${row.productId}_${idx}`}
                  className="flex flex-col gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3 sm:flex-row sm:items-center"
                >
                  <select
                    className="flex-1 rounded-lg border border-white/10 bg-[#1b1b22] px-3 py-2 text-sm text-white outline-none focus:border-[#e10600]"
                    value={row.productId}
                    onChange={(e) =>
                      update({
                        productOverrides: settings.productOverrides.map((o, i) =>
                          i === idx ? { ...o, productId: e.target.value } : o
                        ),
                      })
                    }
                  >
                    {productOptions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 text-sm text-white/60">
                    <span>%</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="0"
                      className="w-20 rounded-lg border border-white/10 bg-[#1b1b22] px-2 py-1.5 text-white outline-none focus:border-[#e10600]"
                      value={row.percent ?? ''}
                      onChange={(e) =>
                        update({
                          productOverrides: settings.productOverrides.map((o, i) =>
                            i === idx
                              ? {
                                  ...o,
                                  percent: e.target.value === '' ? null : Number(e.target.value),
                                }
                              : o
                          ),
                        })
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="rounded-lg p-2 text-white/35 hover:bg-white/[0.06] hover:text-red-400"
                    onClick={() =>
                      update({
                        productOverrides: settings.productOverrides.filter((_, i) => i !== idx),
                      })
                    }
                    aria-label="Remover produto"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </AdvancedSection>

            <AdvancedSection title="Combos" count={settings.comboRules.length}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-white/40">
                  Pedido com todos os produtos do combo ganha um bônus extra.
                </p>
                <button type="button" onClick={addCombo} className={addButtonClass}>
                  <Plus className="h-3.5 w-3.5" /> Combo
                </button>
              </div>
              {settings.comboRules.length === 0 && (
                <p className="text-sm text-white/40">Nenhum combo criado.</p>
              )}
              {settings.comboRules.map((combo) => (
                <div key={combo.id} className="space-y-3 rounded-xl border border-white/[0.07] bg-white/[0.03] p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      className={`${inputClass} flex-1`}
                      value={combo.name}
                      onChange={(e) =>
                        update({
                          comboRules: settings.comboRules.map((c) =>
                            c.id === combo.id ? { ...c, name: e.target.value } : c
                          ),
                        })
                      }
                      placeholder="Nome do combo"
                    />
                    <button
                      type="button"
                      className="rounded-lg p-2 text-white/35 hover:bg-white/[0.06] hover:text-red-400"
                      onClick={() =>
                        update({
                          comboRules: settings.comboRules.filter((c) => c.id !== combo.id),
                        })
                      }
                      aria-label="Remover combo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Bônus fixo (R$)">
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        className={inputClass}
                        value={combo.bonusFixed ?? ''}
                        onChange={(e) =>
                          update({
                            comboRules: settings.comboRules.map((c) =>
                              c.id === combo.id
                                ? {
                                    ...c,
                                    bonusFixed:
                                      e.target.value === '' ? undefined : Number(e.target.value),
                                  }
                                : c
                            ),
                          })
                        }
                      />
                    </Field>
                    <Field label="Bônus % (itens do combo)">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        className={inputClass}
                        value={combo.bonusPercent ?? ''}
                        onChange={(e) =>
                          update({
                            comboRules: settings.comboRules.map((c) =>
                              c.id === combo.id
                                ? {
                                    ...c,
                                    bonusPercent:
                                      e.target.value === '' ? undefined : Number(e.target.value),
                                  }
                                : c
                            ),
                          })
                        }
                      />
                    </Field>
                  </div>
                  <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-white/[0.07] bg-[#141419] p-2">
                    {productOptions.map((p) => {
                      const checked = combo.productIds.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-white/75 hover:bg-white/[0.04]"
                        >
                          <input
                            type="checkbox"
                            className="accent-[#e10600]"
                            checked={checked}
                            onChange={() => {
                              const productIds = checked
                                ? combo.productIds.filter((id) => id !== p.id)
                                : [...combo.productIds, p.id];
                              update({
                                comboRules: settings.comboRules.map((c) =>
                                  c.id === combo.id ? { ...c, productIds } : c
                                ),
                              });
                            }}
                          />
                          <span className="truncate">{p.name}</span>
                        </label>
                      );
                    })}
                    {productOptions.length === 0 && (
                      <p className="px-2 py-1 text-xs text-white/40">Cadastre produtos no cardápio.</p>
                    )}
                  </div>
                </div>
              ))}
            </AdvancedSection>
          </div>

          {(message || error) && (
            <div
              className={`mt-5 rounded-xl px-4 py-3 text-sm font-medium ${
                error
                  ? 'bg-red-500/10 text-red-300 ring-1 ring-red-500/30'
                  : 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30'
              }`}
            >
              {error || message}
            </div>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#ff3b26] to-[#e10600] px-6 py-3.5 text-sm font-bold text-white shadow-[0_12px_28px_rgba(225,6,0,0.35)] disabled:opacity-60 sm:w-auto sm:min-w-[220px]"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar regras
          </button>
        </section>

        {/* Prévia e dica */}
        <div className="space-y-5">
          <section className="overflow-hidden rounded-[24px] border border-white/[0.07] bg-[#141419]">
            <div className="relative h-24">
              <img src="/cardapio-digital/burger.jpg" alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-[#141419]" />
              <p className="absolute bottom-2 left-4 flex items-center gap-1.5 text-sm font-bold">
                <Eye className="h-4 w-4 text-[#ff5b4d]" />
                Prévia do cliente
              </p>
            </div>
            <div className="p-4">
              <div className="rounded-2xl rounded-tl-md bg-white p-3.5 text-gray-900 shadow">
                <p className="flex items-center justify-between text-[11px] font-bold text-emerald-700">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-[10px] text-white">
                      ✓
                    </span>
                    Bora Comer
                  </span>
                  <span className="font-normal text-gray-400">agora</span>
                </p>
                {settings.enabled ? (
                  <>
                    <p className="mt-2 text-[13px] leading-snug">
                      Você recebeu <strong>{formatBRL(exampleEarn)}</strong> de cashback para usar
                      no seu próximo pedido! 🎉
                    </p>
                    <p className="mt-1 text-[11px] leading-snug text-gray-500">
                      Exemplo: pedido de {formatBRL(exampleOrder)} com {settings.defaultPercent}%
                      de volta. Saldo válido só nesta loja.
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-[13px] leading-snug text-gray-500">
                    Cashback desligado. Ative ao lado para o cliente receber mensagens como esta.
                  </p>
                )}
                <p className="mt-2 text-right text-[10px] text-gray-400">10:24</p>
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-[11px] text-white/40">
                <Wallet className="h-3.5 w-3.5 shrink-0" />
                O crédito entra quando o pedido é entregue.
              </p>
            </div>
          </section>

          <section className="rounded-[24px] border border-white/[0.07] bg-gradient-to-br from-[#1c1410] to-[#141419] p-4">
            <div className="flex items-start gap-3">
              <img
                src="/boris-painel.png"
                alt="Boris"
                className="h-14 w-14 shrink-0 rounded-2xl object-cover"
              />
              <div className="min-w-0">
                <p className="text-sm font-bold">
                  Dica do Boris <span className="text-amber-400">✦</span>
                </p>
                <p className="mt-1 text-xs leading-relaxed text-white/55">
                  Saldo que só vale aqui faz o cliente voltar para a sua loja, e não para o
                  concorrente. Comece com {settings.defaultPercent}% e ajuste pelos números acima.
                </p>
              </div>
            </div>
            <p className="mt-3 flex items-center gap-1.5 border-t border-white/[0.06] pt-3 text-[11px] text-white/40">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
              Dias especiais e combos ficam em “Configuração das regras”, recolhidos para a tela
              ficar leve.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
