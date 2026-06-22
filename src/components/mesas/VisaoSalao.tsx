import { useMemo, useState, useEffect, useCallback } from 'react';
import { Eye, User, DoorOpen, Table2, Clock, UtensilsCrossed, StickyNote, Users } from 'lucide-react';
import type { Table } from '../../services/tableService';
import { canOpenTable } from '../../services/tableService';
import type { Area } from '../../services/areaService';
import { getSessionsByRestaurant } from '../../services/tableSessionService';
import { getOrdersByRestaurant } from '../../services/orderService';
import ModalOverlay from '../ModalOverlay';
import FilterDropdown, { type FilterOption } from './FilterDropdown';

const STATUS_LABEL: Record<string, string> = {
  livre: 'Livre',
  ocupada: 'Ocupada',
  em_fechamento: 'Em fechamento',
  fechada: 'Fechada',
  bloqueada: 'Bloqueada'
};

const STATUS_COLOR: Record<string, string> = {
  livre: 'bg-green-100 text-green-800',
  ocupada: 'bg-amber-100 text-amber-800',
  em_fechamento: 'bg-orange-100 text-orange-800',
  fechada: 'bg-gray-100 text-gray-800',
  bloqueada: 'bg-red-100 text-red-800'
};

const STATUS_DOT: Record<string, string> = {
  livre: 'bg-green-500',
  ocupada: 'bg-amber-500',
  em_fechamento: 'bg-orange-500',
  fechada: 'bg-gray-400',
  bloqueada: 'bg-red-500'
};

const STATUS_BORDER: Record<string, string> = {
  livre: 'border-l-green-500',
  ocupada: 'border-l-amber-500',
  em_fechamento: 'border-l-orange-500',
  fechada: 'border-l-gray-400',
  bloqueada: 'border-l-red-500'
};

interface MesaLiveContext {
  abertaEm: Date | null;
  orderCount: number;
  readyCount: number;
}

function formatElapsedSince(date: Date, referenceNow = Date.now()): string {
  const mins = Math.floor((referenceNow - date.getTime()) / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  if (rem === 0) return `há ${hours}h`;
  return `há ${hours}h ${rem}min`;
}

function formatOrderSummary(ctx: MesaLiveContext): string | null {
  if (ctx.orderCount === 0) return null;
  const parts = [`${ctx.orderCount} pedido${ctx.orderCount !== 1 ? 's' : ''}`];
  if (ctx.readyCount > 0) {
    parts.push(`${ctx.readyCount} pronto${ctx.readyCount !== 1 ? 's' : ''}`);
  }
  return parts.join(' · ');
}

interface VisaoSalaoProps {
  restaurantId: string;
  mesas: Table[];
  areas: Area[];
  loading: boolean;
  onOpenMesa: (mesa: Table, responsavel?: string, observacao?: string) => void;
  onVerDetalhe: (mesa: Table) => void;
  onAtribuirResponsavel: (mesa: Table, responsavel: string) => void;
  generateTableUrl?: (numero: string) => string;
}

export default function VisaoSalao({
  restaurantId,
  mesas,
  areas,
  loading,
  onOpenMesa,
  onVerDetalhe,
  onAtribuirResponsavel
}: VisaoSalaoProps) {
  const [filterArea, setFilterArea] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [openModalMesa, setOpenModalMesa] = useState<Table | null>(null);
  const [responsavelInput, setResponsavelInput] = useState('');
  const [observacaoInput, setObservacaoInput] = useState('');
  const [responsavelToast, setResponsavelToast] = useState<{ mesaId: string; nome: string } | null>(null);
  const [liveContext, setLiveContext] = useState<Record<string, MesaLiveContext>>({});
  const [now, setNow] = useState(() => Date.now());

  const loadLiveContext = useCallback(async () => {
    if (!restaurantId) return;
    try {
      const [sessions, orders] = await Promise.all([
        getSessionsByRestaurant(restaurantId),
        getOrdersByRestaurant(restaurantId)
      ]);

      const openSessions = new Map<string, Date>();
      for (const s of sessions) {
        if (s.fechadaEm != null) continue;
        if (!openSessions.has(s.mesaId)) {
          openSessions.set(s.mesaId, s.abertaEm);
        }
      }

      const mesaOrders = orders.filter((o) => o.orderType === 'mesa' || !o.orderType);
      const byMesaId = new Map<string, MesaLiveContext>();

      for (const mesa of mesas) {
        const mesaOrdersList = mesaOrders.filter(
          (o) => o.mesaId === mesa.id || String(o.mesaNumero) === String(mesa.numero)
        );
        byMesaId.set(mesa.id, {
          abertaEm: openSessions.get(mesa.id) ?? null,
          orderCount: mesaOrdersList.length,
          readyCount: mesaOrdersList.filter((o) => o.status === 'pronto').length
        });
      }

      setLiveContext(Object.fromEntries(byMesaId));
    } catch (e) {
      console.error('Erro ao carregar contexto das mesas:', e);
    }
  }, [restaurantId, mesas]);

  useEffect(() => {
    if (!responsavelToast) return;
    const timer = setTimeout(() => setResponsavelToast(null), 1000);
    return () => clearTimeout(timer);
  }, [responsavelToast]);

  useEffect(() => {
    void loadLiveContext();
    const refresh = setInterval(() => void loadLiveContext(), 30000);
    return () => clearInterval(refresh);
  }, [loadLiveContext]);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(tick);
  }, []);

  const filtered = mesas.filter((m) => {
    if (filterArea !== 'todos' && (m.areaId ?? '') !== filterArea) return false;
    if (filterStatus !== 'todos' && m.status !== filterStatus) return false;
    return true;
  });

  const areaOptions = useMemo<FilterOption[]>(
    () => [
      { value: 'todos', label: 'Todas' },
      ...areas.map((a) => ({ value: a.id, label: a.nome })),
      { value: '', label: 'Sem área' },
    ],
    [areas]
  );

  const statusOptions = useMemo<FilterOption[]>(
    () => [
      { value: 'todos', label: 'Todos' },
      ...Object.entries(STATUS_LABEL).map(([k, v]) => ({
        value: k,
        label: v,
        dotClass: STATUS_DOT[k],
      })),
    ],
    []
  );

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center text-black">
        Carregando mesas...
      </div>
    );
  }

  if (mesas.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center text-black">
        Nenhuma mesa configurada. Configure no Editor de Salão.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
        <FilterDropdown
          label="Área"
          value={filterArea}
          onChange={setFilterArea}
          options={areaOptions}
          minWidth="10.5rem"
        />
        <FilterDropdown
          label="Status"
          value={filterStatus}
          onChange={setFilterStatus}
          options={statusOptions}
          minWidth="11.5rem"
        />
        {filtered.length !== mesas.length && (
          <p className="pb-2 text-xs text-gray-500">
            Exibindo {filtered.length} de {mesas.length} mesas
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((mesa) => {
          const ctx = liveContext[mesa.id];
          const isActive = mesa.status === 'ocupada' || mesa.status === 'em_fechamento';
          const subtitle = [mesa.areaName, `${mesa.capacidade} lugar${mesa.capacidade !== 1 ? 'es' : ''}`]
            .filter(Boolean)
            .join(' · ');
          const orderSummary = ctx ? formatOrderSummary(ctx) : null;
          const elapsed =
            isActive && ctx?.abertaEm ? formatElapsedSince(ctx.abertaEm, now) : null;

          return (
            <div
              key={mesa.id}
              className={`bg-white rounded-lg shadow-sm border border-gray-100 border-l-4 ${
                STATUS_BORDER[mesa.status] ?? 'border-l-gray-300'
              } p-4 flex flex-col min-h-[11.5rem]`}
            >
              <div className="flex justify-between items-start gap-2 mb-2">
                <span className="font-semibold text-gray-900 flex items-center gap-1.5">
                  <Table2 className="w-4 h-4 text-amber-600 shrink-0" />
                  Mesa {mesa.numero}
                </span>
                <span
                  className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                    STATUS_COLOR[mesa.status] ?? 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {STATUS_LABEL[mesa.status] ?? mesa.status}
                </span>
              </div>

              {subtitle && (
                <p className="text-xs text-gray-500 mb-2">{subtitle}</p>
              )}

              <div className="space-y-1.5 mb-3 flex-1">
                {isActive && (
                  <p className="text-sm text-gray-800 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    {mesa.responsavel ? (
                      <span className="font-medium">{mesa.responsavel}</span>
                    ) : (
                      <span className="text-gray-400 italic">Sem responsável</span>
                    )}
                  </p>
                )}

                {isActive && elapsed && (
                  <p className="text-xs text-gray-600 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    Aberta {elapsed}
                  </p>
                )}

                {isActive && (
                  <p className="text-xs text-gray-600 flex items-center gap-1.5">
                    <UtensilsCrossed className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    {orderSummary ?? 'Nenhum pedido'}
                    {ctx && ctx.readyCount > 0 && (
                      <span className="ml-1 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                        Pronto
                      </span>
                    )}
                  </p>
                )}

                {mesa.observacao && (
                  <p
                    className="text-xs text-gray-600 flex items-start gap-1.5"
                    title={mesa.observacao}
                  >
                    <StickyNote className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{mesa.observacao}</span>
                  </p>
                )}

                {!isActive && mesa.status === 'livre' && (
                  <p className="text-xs text-gray-500 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    Disponível para abertura
                  </p>
                )}

                {mesa.status === 'bloqueada' && !mesa.observacao && (
                  <p className="text-xs text-red-600">Mesa indisponível</p>
                )}
              </div>

              <div className="mt-auto flex flex-col gap-2">
                {canOpenTable(mesa.status) && (
                  <button
                    onClick={() => setOpenModalMesa(mesa)}
                    className="flex w-full items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors"
                  >
                    <DoorOpen className="w-4 h-4" />
                    {mesa.status === 'fechada' ? 'Reabrir mesa' : 'Abrir mesa'}
                  </button>
                )}

                {isActive && (
                  <>
                    <button
                      onClick={() => onVerDetalhe(mesa)}
                      className="flex w-full items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      Ver detalhe
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => {
                          const r = window.prompt('Nome do responsável:', mesa.responsavel ?? '');
                          if (r !== null && r.trim()) {
                            const nome = r.trim();
                            onAtribuirResponsavel(mesa, nome);
                            setResponsavelToast({ mesaId: mesa.id, nome });
                          }
                        }}
                        className="flex w-full items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
                      >
                        <User className="w-4 h-4" />
                        Responsável
                      </button>
                      {responsavelToast?.mesaId === mesa.id && (
                        <span className="absolute -top-2 right-2 rounded-full bg-green-600 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
                          {responsavelToast.nome}
                        </span>
                      )}
                    </div>
                  </>
                )}

                {mesa.status === 'fechada' && (
                  <button
                    onClick={() => onVerDetalhe(mesa)}
                    className="flex w-full items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    Ver detalhe
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {openModalMesa && (
        <ModalOverlay
          onBackdropClick={() => {
            setOpenModalMesa(null);
            setResponsavelInput('');
            setObservacaoInput('');
          }}
        >
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-2 text-black">Abrir mesa {openModalMesa.numero}</h3>
            <div className="space-y-2 mb-4">
              <label className="block text-sm font-medium text-black">Responsável (opcional)</label>
              <input
                type="text"
                value={responsavelInput}
                onChange={(e) => setResponsavelInput(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black"
                placeholder="Nome do garçom/caixa"
              />
              <label className="block text-sm font-medium text-black">Observação (opcional)</label>
              <input
                type="text"
                value={observacaoInput}
                onChange={(e) => setObservacaoInput(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black"
                placeholder="Ex: aniversário"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setOpenModalMesa(null);
                  setResponsavelInput('');
                  setObservacaoInput('');
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 text-black hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onOpenMesa(openModalMesa, responsavelInput.trim() || undefined, observacaoInput.trim() || undefined);
                  setOpenModalMesa(null);
                  setResponsavelInput('');
                  setObservacaoInput('');
                }}
                className="px-4 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600"
              >
                Abrir mesa
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}
