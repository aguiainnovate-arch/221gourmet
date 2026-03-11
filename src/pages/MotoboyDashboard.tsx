import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Truck,
  MapPin,
  DollarSign,
  LogOut,
  ArrowLeft,
  CheckCircle,
  XCircle,
  RefreshCw,
  Package,
  Mail,
  Phone,
  BarChart3,
  History,
  X,
  Edit2,
  Fuel,
  TrendingUp
} from 'lucide-react';
import { useRestaurantAuth } from '../contexts/RestaurantAuthContext';
import {
  subscribePendingDeliveryRequests,
  acceptDeliveryRequest,
  refuseDeliveryRequest,
  getMotoboyHistory,
  type MotoboyHistoryPeriod
} from '../services/deliveryRequestService';
import { getDeliveryOrderById, assignMotoboyToDeliveryOrder } from '../services/deliveryService';
import { getMotoboyProfile, setMotoboyProfile, setMotoboyOnline } from '../services/motoboyProfileService';
import { getMotoboyById } from '../services/userService';
import { getDaySummary } from '../services/dailyFinanceService';
import { formatCurrency } from '../utils/currencyUtils';
import MotoboyFinanceDrawer from '../components/MotoboyFinanceDrawer';
import type { DeliveryRequest } from '../types/deliveryRequest';
import type { DeliveryOrder } from '../types/delivery';
import type { MotoboyProfile } from '../types/motoboyProfile';

type RequestWithOrder = DeliveryRequest & { order?: DeliveryOrder | null };

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (name.trim().slice(0, 2) || 'M').toUpperCase();
}

export default function MotoboyDashboard() {
  const { motoboyUserId, logout } = useRestaurantAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'chamadas' | 'historico'>('chamadas');
  const [profile, setProfile] = useState<MotoboyProfile | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [historyPeriod, setHistoryPeriod] = useState<MotoboyHistoryPeriod>('30d');
  const [historyList, setHistoryList] = useState<DeliveryRequest[]>([]);
  const [pendingRequests, setPendingRequests] = useState<RequestWithOrder[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCity, setEditCity] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [daySummary, setDaySummary] = useState<{
    date: string;
    deliveriesCount: number;
    grossProfit: number;
    totalExpense: number;
    netProfit: number;
  } | null>(null);
  const [loadingDaySummary, setLoadingDaySummary] = useState(true);

  const displayName = profile?.name?.trim() || userEmail.split('@')[0] || 'Motoboy';

  const loadDaySummary = useCallback(async () => {
    if (!motoboyUserId) return;
    setLoadingDaySummary(true);
    try {
      const summary = await getDaySummary(motoboyUserId);
      setDaySummary(summary);
    } finally {
      setLoadingDaySummary(false);
    }
  }, [motoboyUserId]);

  const loadProfileAndUser = useCallback(async () => {
    if (!motoboyUserId) return;
    setLoadingProfile(true);
    try {
      const [profileData, userData] = await Promise.all([
        getMotoboyProfile(motoboyUserId),
        getMotoboyById(motoboyUserId)
      ]);
      setProfile(profileData);
      setUserEmail(userData?.email ?? '');
      setEditName(profileData?.name ?? userData?.displayName ?? '');
      setEditPhone(profileData?.phone ?? userData?.phone ?? '');
      setEditCity(profileData?.city ?? '');
    } finally {
      setLoadingProfile(false);
    }
  }, [motoboyUserId]);

  const loadHistory = useCallback(async () => {
    if (!motoboyUserId) return;
    setLoadingHistory(true);
    try {
      const list = await getMotoboyHistory(motoboyUserId, historyPeriod);
      setHistoryList(list);
    } finally {
      setLoadingHistory(false);
    }
  }, [motoboyUserId, historyPeriod]);

  useEffect(() => {
    loadProfileAndUser();
  }, [loadProfileAndUser]);

  useEffect(() => {
    loadDaySummary();
  }, [loadDaySummary]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (!motoboyUserId) return;
    const unsubscribe = subscribePendingDeliveryRequests(async (list) => {
      const withOrders = await Promise.all(
        list.map(async (req) => {
          const order = await getDeliveryOrderById(req.orderId);
          return { ...req, order: order ?? undefined };
        })
      );
      setPendingRequests(withOrders);
    });
    return () => unsubscribe();
  }, [motoboyUserId]);

  const handleAccept = async (requestId: string, orderId: string) => {
    if (!motoboyUserId) return;
    setActionLoading(requestId);
    try {
      await acceptDeliveryRequest(requestId, motoboyUserId);
      await assignMotoboyToDeliveryOrder(orderId, motoboyUserId);
      await loadHistory();
    } catch (err) {
      console.error('Erro ao aceitar chamada:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefuse = async (requestId: string) => {
    if (!motoboyUserId) return;
    setActionLoading(requestId);
    try {
      await refuseDeliveryRequest(requestId, motoboyUserId);
      await loadHistory();
    } catch (err) {
      console.error('Erro ao recusar chamada:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleOnline = async () => {
    if (!motoboyUserId) return;
    const next = !profile?.isOnline;
    try {
      await setMotoboyOnline(motoboyUserId, next);
      const updated = await getMotoboyProfile(motoboyUserId);
      setProfile(updated ?? { id: motoboyUserId, motoboyUserId, name: '', isOnline: next, updatedAt: new Date() });
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    }
  };

  const handleSaveProfile = async () => {
    if (!motoboyUserId) return;
    setSavingProfile(true);
    try {
      const updated = await setMotoboyProfile(motoboyUserId, {
        name: editName.trim(),
        phone: editPhone.trim() || undefined,
        city: editCity.trim() || undefined
      });
      setProfile(updated);
      setShowEditModal(false);
    } catch (err) {
      console.error('Erro ao salvar perfil:', err);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/delivery/auth', { replace: true });
  };

  if (!motoboyUserId) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header com identidade — gradiente alinhado ao botão Despesas e totais */}
      <header className="bg-[linear-gradient(144deg,#af40ff,#5b42f3_50%,#00ddeb)] text-white shadow-[0_4px_20px_-2px_rgba(91,66,243,0.3)]">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/delivery" className="p-1.5 rounded-lg hover:bg-white/20 transition-colors" title="Voltar">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="w-10 h-10 rounded-full bg-white/25 flex items-center justify-center text-lg font-bold shrink-0">
                {profile?.photoUrl ? (
                  <img src={profile.photoUrl} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  getInitials(displayName)
                )}
              </div>
              <div>
                <h1 className="text-lg font-bold">{displayName}</h1>
                <p className="text-white/90 text-sm flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${profile?.isOnline ? 'bg-emerald-300' : 'bg-slate-400'}`} />
                  {profile?.isOnline ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleOnline}
                className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-medium"
              >
                {profile?.isOnline ? 'Offline' : 'Online'}
              </button>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-sm font-medium"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Card Perfil */}
        <section className="bg-white rounded-xl shadow-sm border border-violet-100 p-4 sm:p-5">
          {loadingProfile ? (
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
                <div className="h-3 bg-gray-100 rounded w-48 animate-pulse" />
              </div>
            </div>
          ) : (
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold shrink-0">
                {profile?.photoUrl ? (
                  <img src={profile.photoUrl} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  getInitials(displayName)
                )}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{displayName}</p>
                {userEmail && (
                  <p className="text-sm text-gray-500 flex items-center gap-1 truncate">
                    <Mail className="w-3 h-3 shrink-0" /> {userEmail}
                  </p>
                )}
                {(profile?.phone || profile?.city) && (
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                    {profile?.phone && <><Phone className="w-3 h-3 shrink-0" /> {profile.phone}</>}
                    {profile?.city && <><MapPin className="w-3 h-3 shrink-0 ml-1" /> {profile.city}</>}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowEditModal(true)}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-violet-300 text-violet-700 hover:bg-violet-50 text-sm font-medium"
            >
              <Edit2 className="w-4 h-4" />
              Editar perfil
            </button>
          </div>
          )}
        </section>

        {/* Resumo do dia (somente dia atual) */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-violet-600" />
              Resumo do dia
            </h2>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex items-center justify-center min-w-[140px] p-[3px] rounded-lg bg-[linear-gradient(144deg,#af40ff,#5b42f3_50%,#00ddeb)] shadow-[0_15px_30px_-5px_rgba(151,65,252,0.2)] text-white text-base font-medium cursor-pointer transition-all duration-300 hover:outline-none active:outline-none active:scale-90"
            >
              <span className="flex items-center justify-center gap-2 w-full h-full bg-[rgb(5,6,45)] py-4 px-6 rounded-[6px] transition-all duration-300 hover:bg-transparent">
                <DollarSign className="w-4 h-4 shrink-0" />
                Despesas e totais
              </span>
            </button>
          </div>
          {loadingDaySummary ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl border border-violet-100 p-4 shadow-sm">
                <p className="text-xs text-slate-500 font-medium">Entregas do dia</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{daySummary?.deliveriesCount ?? 0}</p>
              </div>
              <div className="bg-white rounded-xl border border-violet-100 p-4 shadow-sm">
                <p className="text-xs text-slate-500 font-medium">Lucro bruto do dia</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {daySummary ? formatCurrency(daySummary.grossProfit) : 'R$ 0,00'}
                </p>
              </div>
              <div className="bg-white rounded-xl border border-violet-100 p-4 shadow-sm">
                <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                  <Fuel className="w-3 h-3 text-violet-500" /> Despesas do dia
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {daySummary ? formatCurrency(daySummary.totalExpense) : 'R$ 0,00'}
                </p>
              </div>
              <div className="bg-white rounded-xl border border-violet-100 p-4 shadow-sm">
                <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-violet-500" /> Lucro líquido do dia
                </p>
                <p className={`text-2xl font-bold mt-1 ${(daySummary?.netProfit ?? 0) < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {daySummary ? formatCurrency(daySummary.netProfit) : 'R$ 0,00'}
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Tabs Chamadas | Histórico */}
        <div className="border-b border-slate-200">
          <nav className="flex gap-6">
            <button
              type="button"
              onClick={() => setTab('chamadas')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${tab === 'chamadas' ? 'border-violet-500 text-violet-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Chamadas pendentes
              {pendingRequests.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-violet-500 text-white text-xs">
                  {pendingRequests.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setTab('historico')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${tab === 'historico' ? 'border-violet-500 text-violet-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Histórico
            </button>
          </nav>
        </div>

        {tab === 'chamadas' && (
          <section>
            <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Truck className="w-4 h-4 text-violet-600" />
              Chamadas pendentes
            </h2>
            {pendingRequests.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-violet-100 p-8 text-center">
                <Truck className="w-12 h-12 text-violet-200 mx-auto mb-3" />
                <p className="text-slate-700 font-medium mb-1">Nenhuma chamada no momento</p>
                <p className="text-sm text-slate-500">Quando um restaurante chamar um motoboy, a chamada aparecerá aqui.</p>
                <button
                  type="button"
                  onClick={() => {}}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-100 text-violet-800 hover:bg-violet-200 text-sm font-medium"
                >
                  <RefreshCw className="w-4 h-4" />
                  Atualizar
                </button>
              </div>
            ) : (
              <ul className="space-y-4">
                {pendingRequests.map((req) => (
                  <li key={req.id} className="bg-white rounded-xl shadow-sm border border-violet-100 overflow-hidden">
                    <div className="p-4 sm:p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-violet-100">
                            <Package className="w-5 h-5 text-violet-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">Pedido #{req.orderId.substring(0, 8)}</p>
                            {req.order?.restaurantName && (
                              <p className="text-sm text-gray-500">{req.order.restaurantName}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-100 text-green-800">
                          <DollarSign className="w-4 h-4" />
                          <span className="font-bold">R$ {req.fee.toFixed(2)}</span>
                        </div>
                      </div>
                      {req.order?.customerAddress && (
                        <div className="flex items-start gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
                          <MapPin className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-700">{req.order.customerAddress}</span>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleAccept(req.id, req.orderId)}
                          disabled={actionLoading === req.id}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white font-medium text-sm hover:bg-green-700 disabled:opacity-50"
                        >
                          {actionLoading === req.id ? (
                            <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                          Aceitar
                        </button>
                        <button
                          onClick={() => handleRefuse(req.id)}
                          disabled={actionLoading === req.id}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 text-red-700 font-medium text-sm hover:bg-red-50 disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" />
                          Recusar
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {tab === 'historico' && (
          <section>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <History className="w-4 h-4 text-violet-600" />
                Últimas entregas
              </h2>
              <select
                value={historyPeriod}
                onChange={(e) => setHistoryPeriod(e.target.value as MotoboyHistoryPeriod)}
                className="border border-violet-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              >
                <option value="7d">Últimos 7 dias</option>
                <option value="30d">Últimos 30 dias</option>
                <option value="all">Tudo</option>
              </select>
            </div>
            {loadingHistory ? (
              <div className="bg-white rounded-xl border border-violet-100 p-8 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-500 mx-auto" />
              </div>
            ) : historyList.length === 0 ? (
              <div className="bg-white rounded-xl border border-violet-100 p-8 text-center text-slate-500 text-sm">
                Nenhuma entrega neste período.
              </div>
            ) : (
              <ul className="space-y-2">
                {historyList.map((r) => (
                  <li key={r.id} className="bg-white rounded-lg border border-violet-100 p-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {r.updatedAt.toLocaleDateString('pt-BR')} {r.updatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-sm font-medium text-gray-900">Pedido #{r.orderId.substring(0, 8)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        r.status === 'ACEITA' ? 'bg-green-100 text-green-800' :
                        r.status === 'RECUSADA' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {r.status === 'ACEITA' ? 'Aceita' : r.status === 'RECUSADA' ? 'Recusada' : r.status}
                      </span>
                    </div>
                    <span className="font-semibold text-gray-900">R$ {r.fee.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>

      {/* Drawer Despesas e totais */}
      <MotoboyFinanceDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        motoboyUserId={motoboyUserId}
        daySummary={daySummary}
        onSaved={loadDaySummary}
      />

      {/* Modal Editar perfil */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Editar perfil</h3>
              <button type="button" onClick={() => setShowEditModal(false)} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black mb-1">Nome completo</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-black"
                  placeholder="Seu nome"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">Telefone</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-black"
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">Cidade / Área</label>
                <input
                  type="text"
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-black"
                  placeholder="Cidade ou região"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-2 justify-end">
              <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-black hover:bg-gray-50">
                Cancelar
              </button>
              <button type="button" onClick={handleSaveProfile} disabled={savingProfile} className="px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50">
                {savingProfile ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
