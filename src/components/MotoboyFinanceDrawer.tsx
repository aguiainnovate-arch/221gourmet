import { useState, useEffect, useCallback } from 'react';
import {
  X,
  DollarSign,
  Fuel,
  FileText,
  Save,
  Trash2,
  Edit2,
  TrendingUp,
  Calendar,
  Loader2
} from 'lucide-react';
import {
  getDailyFinance,
  saveDailyFinance,
  getTotalsForPeriod,
  type PeriodTotals
} from '../services/dailyFinanceService';
import { formatCurrency, fromCurrencyField, toCurrencyField } from '../utils/currencyUtils';
import { todayString, periodToRange } from '../utils/dateUtils';

type TotalsPeriod = '7d' | '30d' | '365d';

interface DaySummaryData {
  date: string;
  deliveriesCount: number;
  grossProfit: number;
  totalExpense: number;
  netProfit: number;
}

interface MotoboyFinanceDrawerProps {
  open: boolean;
  onClose: () => void;
  motoboyUserId: string;
  daySummary: DaySummaryData | null;
  onSaved: () => void;
}

function formatDateDisplay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

export default function MotoboyFinanceDrawer({
  open,
  onClose,
  motoboyUserId,
  daySummary,
  onSaved
}: MotoboyFinanceDrawerProps) {
  const today = todayString();

  const [fuelRaw, setFuelRaw] = useState('');
  const [otherRaw, setOtherRaw] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [hasRecordToday, setHasRecordToday] = useState(false);
  const [totalsPeriod, setTotalsPeriod] = useState<TotalsPeriod>('30d');
  const [totals7d, setTotals7d] = useState<PeriodTotals | null>(null);
  const [totals30d, setTotals30d] = useState<PeriodTotals | null>(null);
  const [totals365d, setTotals365d] = useState<PeriodTotals | null>(null);
  const [loadingTotals, setLoadingTotals] = useState(false);

  const loadRecord = useCallback(async () => {
    if (!motoboyUserId || !open) return;
    setLoadingRecord(true);
    try {
      const record = await getDailyFinance(motoboyUserId, today);
      setHasRecordToday(!!record);
      if (record) {
        setFuelRaw(toCurrencyField(record.fuelExpense));
        setOtherRaw(toCurrencyField(record.otherExpense));
        setNote(record.note ?? '');
      } else {
        setFuelRaw('');
        setOtherRaw('');
        setNote('');
      }
    } finally {
      setLoadingRecord(false);
    }
  }, [motoboyUserId, today, open]);

  const loadTotals = useCallback(async () => {
    if (!motoboyUserId || !open) return;
    setLoadingTotals(true);
    try {
      const [r7, r30, r365] = await Promise.all([
        (async () => {
          const { start, end } = periodToRange('7d');
          return getTotalsForPeriod(motoboyUserId, start, end);
        })(),
        (async () => {
          const { start, end } = periodToRange('30d');
          return getTotalsForPeriod(motoboyUserId, start, end);
        })(),
        (async () => {
          const end = todayString();
          const d = new Date(end);
          d.setFullYear(d.getFullYear() - 1);
          d.setDate(d.getDate() + 1);
          const start = d.toISOString().slice(0, 10);
          return getTotalsForPeriod(motoboyUserId, start, end);
        })()
      ]);
      setTotals7d(r7);
      setTotals30d(r30);
      setTotals365d(r365);
    } finally {
      setLoadingTotals(false);
    }
  }, [motoboyUserId, open, today]);

  useEffect(() => {
    if (open) {
      loadRecord();
      loadTotals();
    }
  }, [open, loadRecord, loadTotals]);

  const handleSave = async () => {
    const fuel = fromCurrencyField(fuelRaw);
    if (fuel < 0) return;
    if (!motoboyUserId) return;
    setSaving(true);
    try {
      await saveDailyFinance(motoboyUserId, {
        date: today,
        fuelExpense: fuel,
        otherExpense: fromCurrencyField(otherRaw),
        note: note.trim() || undefined
      });
      await loadRecord();
      await loadTotals();
      onSaved();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    setFuelRaw('');
    setOtherRaw('');
    setNote('');
  };

  const currentTotals =
    totalsPeriod === '7d' ? totals7d : totalsPeriod === '30d' ? totals30d : totals365d;
  const summary = daySummary ?? {
    date: today,
    deliveriesCount: 0,
    grossProfit: 0,
    totalExpense: 0,
    netProfit: 0
  };
  const netNegative = summary.netProfit < 0;

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-xl z-50 flex flex-col overflow-hidden"
        role="dialog"
        aria-label="Despesas do dia e totais"
      >
        <header className="flex items-center justify-between p-4 border-b border-violet-100 bg-violet-50">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-violet-600" />
            Despesas e totais
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-violet-100 text-slate-600"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* 1) Detalhes do dia */}
          <section>
            <h3 className="text-sm font-semibold text-black mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Detalhes do dia — {formatDateDisplay(today)}
            </h3>
            {loadingRecord ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Gasolina (R$) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Fuel className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={fuelRaw}
                      onChange={(e) => setFuelRaw(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-black"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Outras despesas (R$)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={otherRaw}
                      onChange={(e) => setOtherRaw(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-black"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Observação
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                    <textarea
                      placeholder="Ex: posto X, pedágio"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={2}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none text-black"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white font-medium hover:bg-violet-700 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {hasRecordToday ? 'Atualizar' : 'Salvar'}
                  </button>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-black hover:bg-gray-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Limpar
                  </button>
                  {hasRecordToday && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-violet-100 text-violet-800 text-sm">
                      <Edit2 className="w-3 h-3" />
                      Já existe lançamento hoje
                    </span>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* 2) Resumo do dia */}
          <section>
            <h3 className="text-sm font-semibold text-black mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Resumo do dia
            </h3>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-black">Lucro bruto</span>
                <span className="font-medium text-black">{formatCurrency(summary.grossProfit)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-black">Total de despesas</span>
                <span className="font-medium text-black">{formatCurrency(summary.totalExpense)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <span className="font-semibold text-black">Lucro líquido</span>
                <span
                  className={`text-lg font-bold ${netNegative ? 'text-red-600' : 'text-green-600'}`}
                >
                  {formatCurrency(summary.netProfit)}
                </span>
              </div>
              {netNegative && (
                <p className="text-xs text-red-600 mt-1">Despesas maiores que o lucro do dia.</p>
              )}
            </div>
          </section>

          {/* 3) Totais acumulados */}
          <section>
            <h3 className="text-sm font-semibold text-black mb-3">Totais</h3>
            <div className="flex gap-2 mb-3">
              {(['7d', '30d', '365d'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setTotalsPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                    totalsPeriod === p
                      ? 'bg-violet-600 text-white'
                      : 'bg-gray-100 text-black hover:bg-gray-200'
                  }`}
                >
                  {p === '7d' ? '7 dias' : p === '30d' ? '30 dias' : '1 ano'}
                </button>
              ))}
            </div>
            {loadingTotals ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
              </div>
            ) : currentTotals ? (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Lucro bruto</span>
                  <span className="font-medium">{formatCurrency(currentTotals.grossProfit)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Despesas</span>
                  <span className="font-medium">{formatCurrency(currentTotals.totalExpense)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="font-semibold text-gray-700">Lucro líquido</span>
                  <span
                    className={`font-bold ${currentTotals.netProfit < 0 ? 'text-red-600' : 'text-green-600'}`}
                  >
                    {formatCurrency(currentTotals.netProfit)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 py-4">Nenhum dado no período.</p>
            )}
          </section>
        </div>
      </aside>
    </>
  );
}
