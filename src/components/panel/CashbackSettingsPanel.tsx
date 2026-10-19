import { useEffect, useMemo, useState } from 'react';
import { Gift, Loader2, Plus, Trash2 } from 'lucide-react';
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

  useEffect(() => {
    setSettings(normalizeCashbackSettings(initialSettings ?? DEFAULT_CASHBACK_SETTINGS));
  }, [initialSettings]);

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
          ? 'Cashback salvo. Clientes ganham ao receber o pedido nesta loja.'
          : 'Cashback desativado nesta loja.'
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

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 via-white to-white p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-[#e10600] p-2.5 text-white shadow-md shadow-rose-600/20">
            <Gift className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-gray-950">Cashback da loja</h3>
            <p className="mt-1 text-sm leading-6 text-gray-600">
              Defina % padrão, dias especiais, produtos com mais retorno e combos. O saldo do cliente
              só vale nesta loja. Se não quiser cashback, deixe desligado.
            </p>
          </div>
        </div>

        <label className="mt-5 flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-gray-900">Ativar cashback</div>
            <div className="text-xs text-gray-500">Desligado = nenhum crédito nem uso nesta loja</div>
          </div>
          <input
            type="checkbox"
            className="h-5 w-5 accent-[#e10600]"
            checked={settings.enabled}
            onChange={(e) => update({ enabled: e.target.checked })}
          />
        </label>
      </div>

      <div
        className={`space-y-6 ${settings.enabled ? '' : 'pointer-events-none opacity-50'}`}
        aria-disabled={!settings.enabled}
      >
        <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
          <h4 className="text-sm font-bold uppercase tracking-wide text-gray-500">Geral</h4>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-sm">
              <span className="font-medium text-gray-800">% padrão</span>
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                value={settings.defaultPercent}
                onChange={(e) => update({ defaultPercent: Number(e.target.value) })}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-gray-800">Teto por pedido (R$)</span>
              <input
                type="number"
                min={0}
                step={1}
                placeholder="Sem teto"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                value={settings.maxEarnPerOrder ?? ''}
                onChange={(e) =>
                  update({
                    maxEarnPerOrder: e.target.value === '' ? undefined : Number(e.target.value),
                  })
                }
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-gray-800">Máx. uso do saldo (% do total)</span>
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                value={settings.maxSpendPercentOfTotal ?? 50}
                onChange={(e) => update({ maxSpendPercentOfTotal: Number(e.target.value) })}
              />
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-bold uppercase tracking-wide text-gray-500">
              Dias da semana
            </h4>
            <button
              type="button"
              onClick={addDayRule}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white"
            >
              <Plus className="h-3.5 w-3.5" /> Dia especial
            </button>
          </div>
          {settings.dayOfWeekRules.length === 0 && (
            <p className="text-sm text-gray-500">Sem regras. Vale o % padrão todos os dias.</p>
          )}
          <div className="space-y-3">
            {settings.dayOfWeekRules.map((rule) => (
              <div
                key={rule.id}
                className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 sm:flex-row sm:items-center"
              >
                <div className="flex flex-wrap gap-1.5 flex-1">
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
                          on ? 'bg-[#e10600] text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200'
                        }`}
                      >
                        {WEEKDAY_LABELS[day]}
                      </button>
                    );
                  })}
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">%</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="w-20 rounded-lg border border-gray-300 px-2 py-1.5"
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
                  className="rounded-lg p-2 text-gray-400 hover:bg-white hover:text-red-600"
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
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-bold uppercase tracking-wide text-gray-500">
              Produtos com % diferente
            </h4>
            <button
              type="button"
              onClick={addProductOverride}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white"
            >
              <Plus className="h-3.5 w-3.5" /> Produto
            </button>
          </div>
          {settings.productOverrides.length === 0 && (
            <p className="text-sm text-gray-500">
              Opcional. Ex.: sobremesa com 10%, ou produto sem cashback (deixe vazio).
            </p>
          )}
          <div className="space-y-3">
            {settings.productOverrides.map((row, idx) => (
              <div
                key={`${row.productId}_${idx}`}
                className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-gray-50 p-3 sm:flex-row sm:items-center"
              >
                <select
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
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
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">% (vazio = 0)</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="0"
                    className="w-20 rounded-lg border border-gray-300 px-2 py-1.5"
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
                  className="rounded-lg p-2 text-gray-400 hover:bg-white hover:text-red-600"
                  onClick={() =>
                    update({
                      productOverrides: settings.productOverrides.filter((_, i) => i !== idx),
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-bold uppercase tracking-wide text-gray-500">Combos</h4>
            <button
              type="button"
              onClick={addCombo}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white"
            >
              <Plus className="h-3.5 w-3.5" /> Combo
            </button>
          </div>
          <p className="text-sm text-gray-500">
            Se o pedido tiver todos os produtos do combo, o cliente ganha bônus extra (R$ e/ou %).
          </p>
          <div className="space-y-4">
            {settings.comboRules.map((combo) => (
              <div key={combo.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
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
                    className="rounded-lg p-2 text-gray-400 hover:bg-white hover:text-red-600"
                    onClick={() =>
                      update({
                        comboRules: settings.comboRules.filter((c) => c.id !== combo.id),
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm">
                    <span className="font-medium text-gray-700">Bônus fixo (R$)</span>
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
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
                  </label>
                  <label className="text-sm">
                    <span className="font-medium text-gray-700">Bônus % (itens do combo)</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
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
                  </label>
                </div>
                <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2 space-y-1">
                  {productOptions.map((p) => {
                    const checked = combo.productIds.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-gray-50"
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
                    <p className="px-2 py-1 text-xs text-gray-500">Cadastre produtos no cardápio.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {(message || error) && (
        <div
          className={`rounded-xl px-4 py-3 text-sm font-medium ${
            error ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'
          }`}
        >
          {error || message}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-[#e10600] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-rose-600/25 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
          Salvar cashback
        </button>
      </div>
    </div>
  );
}
