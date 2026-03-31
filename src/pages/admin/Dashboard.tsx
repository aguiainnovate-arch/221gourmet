import { useEffect, useState } from 'react';
import { getRestaurants } from '../../services/restaurantService';
import { getStatistics } from '../../services/statisticsService';
import { getRestaurantLeads } from '../../services/restaurantLeadFirestoreService';
import { isRestaurantLeadModerationConfigured } from '../../services/restaurantLeadModerationService';

interface DashboardMetrics {
  totalRestaurants: number;
  totalRevenue: number;
  pendingLeads: number;
  aiActive: boolean;
}

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  accent: string;
}

function StatCard({ title, value, description, icon, accent }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-start gap-4">
      <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${accent}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        <p className="text-xs text-gray-400 mt-1">{description}</p>
      </div>
    </div>
  );
}

export default function Dashboard({ onNavigate }: { onNavigate: (section: string) => void }) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [restaurants, stats, leads] = await Promise.all([
          getRestaurants(),
          getStatistics(),
          getRestaurantLeads()
        ]);

        setMetrics({
          totalRestaurants: restaurants.length,
          totalRevenue: stats.totalRevenue,
          pendingLeads: leads.filter((l) => l.status === 'pending').length,
          aiActive: isRestaurantLeadModerationConfigured()
        });
      } catch {
        setMetrics({ totalRestaurants: 0, totalRevenue: 0, pendingLeads: 0, aiActive: false });
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="p-6 space-y-8">
      {/* Métricas */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Visão Geral</h2>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
                <div className="h-7 bg-gray-200 rounded w-1/2 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Restaurantes Ativos"
              value={metrics?.totalRestaurants ?? 0}
              description="cadastrados na plataforma"
              accent="bg-blue-100"
              icon={
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              }
            />
            <StatCard
              title="Receita Total"
              value={formatCurrency(metrics?.totalRevenue ?? 0)}
              description="acumulado de todos os pedidos"
              accent="bg-green-100"
              icon={
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <StatCard
              title="Solicitações Pendentes"
              value={metrics?.pendingLeads ?? 0}
              description="aguardando aprovação"
              accent="bg-amber-100"
              icon={
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              }
            />
            <StatCard
              title="Moderação por IA"
              value={metrics?.aiActive ? 'Ativa' : 'Inativa'}
              description={metrics?.aiActive ? 'filtrando cadastros automaticamente' : 'configure VITE_OPENAI_API_KEY'}
              accent={metrics?.aiActive ? 'bg-indigo-100' : 'bg-gray-100'}
              icon={
                <svg className={`w-6 h-6 ${metrics?.aiActive ? 'text-indigo-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              }
            />
          </div>
        )}
      </div>

      {/* Ações rápidas */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => onNavigate('restaurants')}
            className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition p-5 text-left group"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
                </svg>
              </div>
              <span className="font-semibold text-gray-800">Restaurantes</span>
            </div>
            <p className="text-sm text-gray-500">Visualize e gerencie todos os restaurantes</p>
          </button>

          <button
            onClick={() => onNavigate('leads')}
            className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition p-5 text-left group"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center group-hover:bg-amber-100 transition">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" />
                </svg>
              </div>
              <span className="font-semibold text-gray-800">Solicitações</span>
              {(metrics?.pendingLeads ?? 0) > 0 && (
                <span className="ml-auto bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {metrics!.pendingLeads}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">Aprovar ou rejeitar pedidos de parceiros</p>
          </button>

          <button
            onClick={() => onNavigate('motoboys')}
            className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition p-5 text-left group"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center group-hover:bg-green-100 transition">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <span className="font-semibold text-gray-800">Motoboys</span>
            </div>
            <p className="text-sm text-gray-500">Cadastrar e gerenciar entregadores</p>
          </button>

          <button
            onClick={() => onNavigate('plans')}
            className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition p-5 text-left group"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center group-hover:bg-purple-100 transition">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className="font-semibold text-gray-800">Planos</span>
            </div>
            <p className="text-sm text-gray-500">Gerenciar planos e permissões</p>
          </button>

          <button
            onClick={() => onNavigate('registration-links')}
            className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition p-5 text-left group"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center group-hover:bg-indigo-100 transition">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <span className="font-semibold text-gray-800">Links de Cadastro</span>
            </div>
            <p className="text-sm text-gray-500">Gerar links únicos para novos restaurantes</p>
          </button>

          <button
            onClick={() => onNavigate('ai-config')}
            className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition p-5 text-left group"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 bg-pink-50 rounded-lg flex items-center justify-center group-hover:bg-pink-100 transition">
                <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <span className="font-semibold text-gray-800">Configuração de IA</span>
            </div>
            <p className="text-sm text-gray-500">Ajustar parâmetros do assistente</p>
          </button>
        </div>
      </div>
    </div>
  );
}
