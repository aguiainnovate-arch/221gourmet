import { useEffect, useState } from 'react';
import {
  getRestaurantLeads,
  updateLeadStatus
} from '../../services/restaurantLeadFirestoreService';
import type { RestaurantLead, LeadStatus } from '../../services/restaurantLeadFirestoreService';

type Tab = 'pending' | 'approved' | 'rejected';

const TAB_LABELS: Record<Tab, string> = {
  pending: 'Pendentes',
  approved: 'Aprovados',
  rejected: 'Rejeitados'
};

const STATUS_BADGE: Record<LeadStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700'
};

function LeadCard({
  lead,
  onApprove,
  onReject,
  loading
}: {
  lead: RestaurantLead;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  loading: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-gray-900 text-lg leading-tight">{lead.restaurantName}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{lead.ownerName}</p>
        </div>
        <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_BADGE[lead.status]}`}>
          {TAB_LABELS[lead.status]}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-gray-600">
        <span><b className="text-gray-700">E-mail:</b> {lead.email}</span>
        <span><b className="text-gray-700">WhatsApp:</b> {lead.whatsapp || lead.phone}</span>
        <span><b className="text-gray-700">Cidade:</b> {lead.cityState}</span>
        <span><b className="text-gray-700">Tipo:</b> {lead.cuisineType}</span>
        {lead.cnpj && <span><b className="text-gray-700">CNPJ:</b> {lead.cnpj}</span>}
        {lead.priceRange && <span><b className="text-gray-700">Faixa:</b> {lead.priceRange}</span>}
      </div>

      {lead.description && (
        <p className="text-sm text-gray-500 border-t border-gray-50 pt-2">{lead.description}</p>
      )}

      <p className="text-xs text-gray-400 pt-1">
        Recebido em {lead.createdAt.toLocaleString('pt-BR')}
      </p>

      {lead.status === 'pending' && (
        <div className="flex gap-3 pt-1">
          <button
            disabled={loading}
            onClick={() => onApprove(lead.id)}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold py-2 rounded-lg transition"
          >
            Aprovar
          </button>
          <button
            disabled={loading}
            onClick={() => onReject(lead.id)}
            className="flex-1 bg-red-100 hover:bg-red-200 disabled:opacity-50 text-red-700 text-sm font-semibold py-2 rounded-lg transition"
          >
            Rejeitar
          </button>
        </div>
      )}
    </div>
  );
}

export default function RestaurantLeads() {
  const [leads, setLeads] = useState<RestaurantLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setLeads(await getRestaurantLeads());
    } catch {
      setError('Não foi possível carregar as solicitações.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function handleStatus(id: string, status: LeadStatus) {
    setActionLoading(true);
    try {
      await updateLeadStatus(id, status);
      setLeads((prev) => prev.map((l) => l.id === id ? { ...l, status } : l));
    } catch {
      setError('Erro ao atualizar status. Tente novamente.');
    } finally {
      setActionLoading(false);
    }
  }

  const filtered = leads.filter((l) => l.status === activeTab);

  const tabCounts: Record<Tab, number> = {
    pending: leads.filter((l) => l.status === 'pending').length,
    approved: leads.filter((l) => l.status === 'approved').length,
    rejected: leads.filter((l) => l.status === 'rejected').length
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Solicitações de Parceiros</h2>
        <p className="text-sm text-gray-500 mt-1">
          Gerencie os pedidos de cadastro de novos restaurantes na plataforma.
        </p>
      </div>

      {/* Abas */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-6">
        {(['pending', 'approved', 'rejected'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition flex items-center gap-2 ${
              activeTab === tab
                ? 'bg-white shadow-sm text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {TAB_LABELS[tab]}
            {tabCounts[tab] > 0 && (
              <span
                className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                  tab === 'pending' ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {tabCounts[tab]}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
          <button className="ml-3 underline" onClick={() => void load()}>Tentar novamente</button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-4 bg-gray-100 rounded w-1/3 mb-4" />
              <div className="h-3 bg-gray-100 rounded w-full mb-2" />
              <div className="h-3 bg-gray-100 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" />
          </svg>
          <p className="font-medium">Nenhuma solicitação {TAB_LABELS[activeTab].toLowerCase()}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              loading={actionLoading}
              onApprove={(id) => void handleStatus(id, 'approved')}
              onReject={(id) => void handleStatus(id, 'rejected')}
            />
          ))}
        </div>
      )}
    </div>
  );
}
