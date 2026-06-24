import { useMemo, useState, useEffect, useCallback } from 'react';
import {
  Eye,
  User,
  DoorOpen,
  Table2,
  Clock,
  UtensilsCrossed,
  StickyNote,
  Users,
  Plus,
  Trash2,
  Download,
  QrCode,
  ChevronDown,
  X,
  Armchair,
  LayoutGrid,
  List,
} from 'lucide-react';
import type { Table } from '../../services/tableService';
import { addTable, canOpenTable } from '../../services/tableService';
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
  bloqueada: 'Bloqueada',
};

const STATUS_COLOR: Record<string, string> = {
  livre: 'bg-green-100 text-green-800',
  ocupada: 'bg-amber-100 text-amber-800',
  em_fechamento: 'bg-orange-100 text-orange-800',
  fechada: 'bg-gray-100 text-gray-800',
  bloqueada: 'bg-red-100 text-red-800',
};

const STATUS_DOT: Record<string, string> = {
  livre: 'bg-green-500',
  ocupada: 'bg-amber-500',
  em_fechamento: 'bg-orange-500',
  fechada: 'bg-gray-400',
  bloqueada: 'bg-red-500',
};

const STATUS_BORDER: Record<string, string> = {
  livre: 'border-l-green-500',
  ocupada: 'border-l-amber-500',
  em_fechamento: 'border-l-orange-500',
  fechada: 'border-l-gray-400',
  bloqueada: 'border-l-red-500',
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

type MesaViewMode = 'grid' | 'list';

const viewModeStorageKey = (restaurantId: string) => `mesas-view-mode:${restaurantId}`;

function readStoredViewMode(restaurantId: string): MesaViewMode {
  try {
    const stored = localStorage.getItem(viewModeStorageKey(restaurantId));
    return stored === 'list' ? 'list' : 'grid';
  } catch {
    return 'grid';
  }
}

interface MesaItemProps {
  mesa: Table;
  ctx: MesaLiveContext | undefined;
  now: number;
  layout: MesaViewMode;
  responsavelToast: { mesaId: string; nome: string } | null;
  onOpenModal: (mesa: Table) => void;
  onVerDetalhe: (mesa: Table) => void;
  onAtribuirResponsavel: (mesa: Table, responsavel: string) => void;
  onResponsavelToast: (toast: { mesaId: string; nome: string }) => void;
  onRemoveTable: (id: string) => void;
  visualizarQRCode: (numero: string) => void;
  baixarQRCode: (numero: string) => void;
}

function MesaItem({
  mesa,
  ctx,
  now,
  layout,
  responsavelToast,
  onOpenModal,
  onVerDetalhe,
  onAtribuirResponsavel,
  onResponsavelToast,
  onRemoveTable,
  visualizarQRCode,
  baixarQRCode,
}: MesaItemProps) {
  const isActive = mesa.status === 'ocupada' || mesa.status === 'em_fechamento';
  const subtitle = [mesa.areaName, `${mesa.capacidade} lugar${mesa.capacidade !== 1 ? 'es' : ''}`]
    .filter(Boolean)
    .join(' · ');
  const orderSummary = ctx ? formatOrderSummary(ctx) : null;
  const elapsed = isActive && ctx?.abertaEm ? formatElapsedSince(ctx.abertaEm, now) : null;

  const primaryBtn =
    'inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors';
  const iconBtn = 'p-1.5 rounded shrink-0';

  const openCloseBtn = (
    <>
      {canOpenTable(mesa.status) && (
        <button
          type="button"
          onClick={() => onOpenModal(mesa)}
          className={`${primaryBtn} bg-amber-500 text-white hover:bg-amber-600 px-3 py-2 ${layout === 'grid' ? 'w-full' : ''}`}
        >
          <DoorOpen className="w-4 h-4" />
          {mesa.status === 'fechada' ? 'Reabrir mesa' : 'Abrir mesa'}
        </button>
      )}
      {isActive && (
        <>
          <button
            type="button"
            onClick={() => onVerDetalhe(mesa)}
            className={`${primaryBtn} bg-blue-600 text-white hover:bg-blue-700 px-3 py-2 ${layout === 'grid' ? 'w-full' : ''}`}
          >
            <Eye className="w-4 h-4" />
            Ver detalhe
          </button>
          <div className={layout === 'grid' ? 'relative w-full' : 'relative'}>
            <button
              type="button"
              onClick={() => {
                const r = window.prompt('Nome do responsável:', mesa.responsavel ?? '');
                if (r !== null && r.trim()) {
                  const nome = r.trim();
                  onAtribuirResponsavel(mesa, nome);
                  onResponsavelToast({ mesaId: mesa.id, nome });
                }
              }}
              className={`${primaryBtn} border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 px-3 py-2 ${layout === 'grid' ? 'w-full' : ''}`}
            >
              <User className="w-4 h-4" />
              Responsável
            </button>
            {responsavelToast?.mesaId === mesa.id && (
              <span className="absolute -top-2 right-0 rounded-full bg-green-600 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
                {responsavelToast.nome}
              </span>
            )}
          </div>
        </>
      )}
      {mesa.status === 'fechada' && (
        <button
          type="button"
          onClick={() => onVerDetalhe(mesa)}
          className={`${primaryBtn} border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 px-3 py-2 ${layout === 'grid' ? 'w-full' : ''}`}
        >
          <Eye className="w-4 h-4" />
          Ver detalhe
        </button>
      )}
    </>
  );

  const adminActions = (
    <>
      <button
        type="button"
        onClick={() => visualizarQRCode(mesa.numero)}
        className={`${iconBtn} bg-slate-100 text-slate-600 hover:bg-slate-200`}
        title="Ver QR Code"
      >
        <QrCode className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => baixarQRCode(mesa.numero)}
        className={`${iconBtn} bg-green-50 text-green-600 hover:bg-green-100`}
        title="Baixar QR Code"
      >
        <Download className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => onRemoveTable(mesa.id)}
        className={`${iconBtn} bg-red-50 text-red-600 hover:bg-red-100 ${layout === 'grid' ? 'ml-auto' : ''}`}
        title="Remover mesa"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </>
  );

  const actions =
    layout === 'grid' ? (
      <>
        <div className="flex flex-col gap-2">{openCloseBtn}</div>
        <div className="flex items-center gap-1 pt-2 border-t border-gray-100">{adminActions}</div>
      </>
    ) : (
      <>
        {openCloseBtn}
        {adminActions}
      </>
    );

  const infoBlock = (
    <div className={layout === 'grid' ? 'space-y-1.5 mb-3 flex-1' : 'flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600'}>
      {isActive && (
        <p className={`flex items-center gap-1.5 ${layout === 'grid' ? 'text-sm text-gray-800' : ''}`}>
          <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          {mesa.responsavel ? (
            <span className={layout === 'grid' ? 'font-medium' : ''}>{mesa.responsavel}</span>
          ) : (
            <span className="text-gray-400 italic">Sem responsável</span>
          )}
        </p>
      )}
      {isActive && elapsed && (
        <p className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          Aberta {elapsed}
        </p>
      )}
      {isActive && (
        <p className={`flex items-center gap-1.5 ${!orderSummary ? 'text-black' : ''}`}>
          <UtensilsCrossed className={`w-3.5 h-3.5 shrink-0 ${!orderSummary ? 'text-gray-700' : 'text-gray-400'}`} />
          {orderSummary ?? 'Nenhum pedido'}
          {ctx && ctx.readyCount > 0 && (
            <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
              Pronto
            </span>
          )}
        </p>
      )}
      {mesa.observacao && (
        <p className="flex items-start gap-1.5" title={mesa.observacao}>
          <StickyNote className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
          <span className={layout === 'grid' ? 'line-clamp-2' : 'truncate max-w-[12rem] sm:max-w-xs'}>
            {mesa.observacao}
          </span>
        </p>
      )}
      {!isActive && mesa.status === 'livre' && (
        <p className="flex items-center gap-1.5 text-gray-500">
          <Users className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          Disponível para abertura
        </p>
      )}
      {mesa.status === 'bloqueada' && !mesa.observacao && (
        <p className="text-red-600">Mesa indisponível</p>
      )}
    </div>
  );

  if (layout === 'list') {
    return (
      <div
        className={`flex flex-col lg:flex-row lg:items-center gap-3 px-4 py-3 border-l-4 ${
          STATUS_BORDER[mesa.status] ?? 'border-l-gray-300'
        }`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-semibold text-gray-900 flex items-center gap-1.5">
              <Table2 className="w-4 h-4 text-amber-600 shrink-0" />
              Mesa {mesa.numero}
            </span>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                STATUS_COLOR[mesa.status] ?? 'bg-gray-100 text-gray-800'
              }`}
            >
              {STATUS_LABEL[mesa.status] ?? mesa.status}
            </span>
            {subtitle && <span className="text-xs text-gray-500">{subtitle}</span>}
          </div>
          {infoBlock}
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
      </div>
    );
  }

  return (
    <div
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
      {subtitle && <p className="text-xs text-gray-500 mb-2">{subtitle}</p>}
      {infoBlock}
      <div className="mt-auto flex flex-col gap-2">{actions}</div>
    </div>
  );
}

interface VisaoSalaoProps {
  restaurantId: string;
  mesas: Table[];
  areas: Area[];
  maxTables: number;
  loading: boolean;
  onOpenMesa: (mesa: Table, responsavel?: string, observacao?: string) => void;
  onVerDetalhe: (mesa: Table) => void;
  onAtribuirResponsavel: (mesa: Table, responsavel: string) => void;
  onRemoveTable: (id: string) => void;
  onAddArea: (nome: string) => void;
  onRemoveArea: (id: string) => void;
  visualizarQRCode: (numero: string) => void;
  baixarQRCode: (numero: string) => void;
  onMesaCreated: (mesa: Table) => void;
  onMesaCreateError: () => void;
}

export default function VisaoSalao({
  restaurantId,
  mesas,
  areas,
  maxTables,
  loading,
  onOpenMesa,
  onVerDetalhe,
  onAtribuirResponsavel,
  onRemoveTable,
  onAddArea,
  onRemoveArea,
  visualizarQRCode,
  baixarQRCode,
  onMesaCreated,
  onMesaCreateError,
}: VisaoSalaoProps) {
  const [filterArea, setFilterArea] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [openModalMesa, setOpenModalMesa] = useState<Table | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [novaMesa, setNovaMesa] = useState('');
  const [novaMesaCapacidade, setNovaMesaCapacidade] = useState(4);
  const [ultimaCapacidadeMesa, setUltimaCapacidadeMesa] = useState(4);
  const [savingMesa, setSavingMesa] = useState(false);
  const [responsavelInput, setResponsavelInput] = useState('');
  const [observacaoInput, setObservacaoInput] = useState('');
  const [responsavelToast, setResponsavelToast] = useState<{ mesaId: string; nome: string } | null>(null);
  const [liveContext, setLiveContext] = useState<Record<string, MesaLiveContext>>({});
  const [now, setNow] = useState(() => Date.now());
  const [newAreaName, setNewAreaName] = useState('');
  const [areasOpen, setAreasOpen] = useState(false);
  const [viewMode, setViewMode] = useState<MesaViewMode>('grid');

  useEffect(() => {
    if (!restaurantId) return;
    setViewMode(readStoredViewMode(restaurantId));
  }, [restaurantId]);

  const handleViewModeChange = (mode: MesaViewMode) => {
    setViewMode(mode);
    if (!restaurantId) return;
    try {
      localStorage.setItem(viewModeStorageKey(restaurantId), mode);
    } catch {
      // ignore storage errors
    }
  };

  const atLimit = mesas.length >= maxTables;

  const mesaNumeroTrimmed = novaMesa.trim();
  const mesaNumeroDuplicado =
    mesaNumeroTrimmed.length > 0 && mesas.some((m) => m.numero === mesaNumeroTrimmed);
  const podeAdicionarMesa =
    mesaNumeroTrimmed.length > 0 && !mesaNumeroDuplicado && novaMesaCapacidade >= 1;

  const openAddMesaModal = () => {
    setNovaMesa('');
    setNovaMesaCapacidade(ultimaCapacidadeMesa);
    setShowAddModal(true);
  };

  const closeAddMesaModal = () => {
    setShowAddModal(false);
    setNovaMesa('');
  };

  const adicionarMesa = async () => {
    if (!restaurantId || !podeAdicionarMesa || savingMesa) return;

    const numero = mesaNumeroTrimmed;
    const capacidade = Math.max(1, novaMesaCapacidade);

    setSavingMesa(true);
    try {
      const novaMesaObj = await addTable(restaurantId, numero, { capacidade });
      setUltimaCapacidadeMesa(capacidade);
      onMesaCreated(novaMesaObj);
      closeAddMesaModal();
    } catch {
      onMesaCreateError();
    } finally {
      setSavingMesa(false);
    }
  };

  const loadLiveContext = useCallback(async () => {
    if (!restaurantId) return;
    try {
      const [sessions, orders] = await Promise.all([
        getSessionsByRestaurant(restaurantId),
        getOrdersByRestaurant(restaurantId),
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
          readyCount: mesaOrdersList.filter((o) => o.status === 'pronto').length,
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
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-800">
            Limite do plano: <span className="font-medium">{maxTables}</span> mesas · Atual:{' '}
            <span className="font-medium">{mesas.length}</span>
          </p>
          <button
            type="button"
            onClick={openAddMesaModal}
            disabled={atLimit}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Adicionar mesa
          </button>
        </div>
        <div className="bg-white rounded-lg shadow p-8 text-center text-black">
          Carregando mesas...
        </div>
        {showAddModal && (
          <ModalOverlay onBackdropClick={closeAddMesaModal}>
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-black">Adicionar Nova Mesa</h3>
                <button
                  type="button"
                  onClick={closeAddMesaModal}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Número da Mesa
                  </label>
                  <input
                    type="text"
                    value={novaMesa}
                    onChange={(e) => setNovaMesa(e.target.value)}
                    placeholder="Ex: 15"
                    className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 text-black ${
                      mesaNumeroDuplicado
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    onKeyDown={(e) => e.key === 'Enter' && podeAdicionarMesa && !savingMesa && void adicionarMesa()}
                    autoFocus
                  />
                  {mesaNumeroDuplicado && (
                    <p className="mt-1.5 text-sm text-red-600">Este número de mesa já existe.</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-2 flex items-center gap-1.5">
                    <Armchair className="w-4 h-4" />
                    Número de cadeiras
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={novaMesaCapacidade}
                    onChange={(e) => {
                      const value = parseInt(e.target.value, 10);
                      setNovaMesaCapacidade(Number.isNaN(value) ? 1 : value);
                    }}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  />
                </div>
                <div className="flex space-x-2 justify-end">
                  <button
                    type="button"
                    onClick={closeAddMesaModal}
                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                    disabled={savingMesa}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => void adicionarMesa()}
                    disabled={!podeAdicionarMesa || savingMesa}
                    className={`px-4 py-2 rounded ${podeAdicionarMesa && !savingMesa
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                  >
                    {savingMesa ? 'Adicionando...' : 'Adicionar'}
                  </button>
                </div>
              </div>
            </div>
          </ModalOverlay>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-sm text-amber-800">
          Limite do plano: <span className="font-medium">{maxTables}</span> mesas · Atual:{' '}
          <span className="font-medium">{mesas.length}</span>
        </p>
        <button
          type="button"
          onClick={openAddMesaModal}
          disabled={atLimit}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          Adicionar mesa
        </button>
      </div>

      {atLimit && (
        <p className="text-sm text-amber-700 px-1">
          Limite do plano atingido ({maxTables} mesas).
        </p>
      )}

      <div className="rounded-lg border border-gray-100 bg-white shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setAreasOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-black hover:bg-gray-50"
        >
          <span>Gerenciar áreas</span>
          <ChevronDown
            className={`w-4 h-4 text-gray-500 transition-transform ${areasOpen ? 'rotate-180' : ''}`}
          />
        </button>
        {areasOpen && (
          <div className="border-t border-gray-100 px-4 py-4 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={newAreaName}
                onChange={(e) => setNewAreaName(e.target.value)}
                placeholder="Nome da área (ex: Salão, Varanda)"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-48 text-black"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newAreaName.trim()) {
                    onAddArea(newAreaName.trim());
                    setNewAreaName('');
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  if (newAreaName.trim()) {
                    onAddArea(newAreaName.trim());
                    setNewAreaName('');
                  }
                }}
                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm"
              >
                <Plus className="w-4 h-4" />
                Adicionar área
              </button>
            </div>
            {areas.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhuma área cadastrada.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {areas.map((area) => (
                  <li
                    key={area.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-black"
                  >
                    {area.nome}
                    <button
                      type="button"
                      onClick={() => onRemoveArea(area.id)}
                      className="p-0.5 rounded text-red-600 hover:bg-red-50"
                      title="Remover área"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {mesas.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-black">
          <p className="mb-1 font-medium">Nenhuma mesa configurada</p>
          <p className="text-sm text-gray-500">
            Use o botão &quot;Adicionar mesa&quot; acima para começar.
          </p>
        </div>
      ) : (
        <>
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
            <div className="flex items-center gap-1 ml-auto pb-0.5">
              <span className="text-xs text-gray-500 mr-1 hidden sm:inline">Exibição</span>
              <button
                type="button"
                onClick={() => handleViewModeChange('grid')}
                title="Grade"
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-amber-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleViewModeChange('list')}
                title="Lista"
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-amber-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((mesa) => (
                <MesaItem
                  key={mesa.id}
                  mesa={mesa}
                  ctx={liveContext[mesa.id]}
                  now={now}
                  layout="grid"
                  responsavelToast={responsavelToast}
                  onOpenModal={setOpenModalMesa}
                  onVerDetalhe={onVerDetalhe}
                  onAtribuirResponsavel={onAtribuirResponsavel}
                  onResponsavelToast={setResponsavelToast}
                  onRemoveTable={onRemoveTable}
                  visualizarQRCode={visualizarQRCode}
                  baixarQRCode={baixarQRCode}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-100">
              {filtered.map((mesa) => (
                <MesaItem
                  key={mesa.id}
                  mesa={mesa}
                  ctx={liveContext[mesa.id]}
                  now={now}
                  layout="list"
                  responsavelToast={responsavelToast}
                  onOpenModal={setOpenModalMesa}
                  onVerDetalhe={onVerDetalhe}
                  onAtribuirResponsavel={onAtribuirResponsavel}
                  onResponsavelToast={setResponsavelToast}
                  onRemoveTable={onRemoveTable}
                  visualizarQRCode={visualizarQRCode}
                  baixarQRCode={baixarQRCode}
                />
              ))}
            </div>
          )}
        </>
      )}

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
                type="button"
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
                type="button"
                onClick={() => {
                  onOpenMesa(
                    openModalMesa,
                    responsavelInput.trim() || undefined,
                    observacaoInput.trim() || undefined
                  );
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

      {showAddModal && (
        <ModalOverlay onBackdropClick={closeAddMesaModal}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-black">Adicionar Nova Mesa</h3>
              <button
                type="button"
                onClick={closeAddMesaModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Número da Mesa
                </label>
                <input
                  type="text"
                  value={novaMesa}
                  onChange={(e) => setNovaMesa(e.target.value)}
                  placeholder="Ex: 15"
                  className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 text-black ${
                    mesaNumeroDuplicado
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  onKeyDown={(e) => e.key === 'Enter' && podeAdicionarMesa && !savingMesa && void adicionarMesa()}
                  autoFocus
                />
                {mesaNumeroDuplicado && (
                  <p className="mt-1.5 text-sm text-red-600">Este número de mesa já existe.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2 flex items-center gap-1.5">
                  <Armchair className="w-4 h-4" />
                  Número de cadeiras
                </label>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={novaMesaCapacidade}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10);
                    setNovaMesaCapacidade(Number.isNaN(value) ? 1 : value);
                  }}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                />
              </div>
              <div className="flex space-x-2 justify-end">
                <button
                  type="button"
                  onClick={closeAddMesaModal}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                  disabled={savingMesa}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void adicionarMesa()}
                  disabled={!podeAdicionarMesa || savingMesa}
                  className={`px-4 py-2 rounded ${podeAdicionarMesa && !savingMesa
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                >
                  {savingMesa ? 'Adicionando...' : 'Adicionar'}
                </button>
              </div>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}
