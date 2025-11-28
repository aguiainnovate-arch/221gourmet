import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AdminSidebar from '../components/AdminSidebar';
import Restaurants from './admin/Restaurants';
import Permissions from './admin/Permissions';
import Plans from './admin/Plans';
import AIConfiguration from './owner/AIConfiguration';
import RegistrationLinks from './owner/RegistrationLinks';
import GenerateRegistrationLinkModal from '../components/GenerateRegistrationLinkModal';

export default function Owner() {
  const { logout } = useAuth();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [showGenerateLinkModal, setShowGenerateLinkModal] = useState(false);

  const renderContent = () => {
    switch (activeSection) {
      case 'restaurants':
        return <Restaurants />;
      case 'permissions':
        return <Permissions />;
      case 'plans':
        return <Plans />;
      case 'ai-config':
        return <AIConfiguration />;
      case 'registration-links':
        return <RegistrationLinks />;
      case 'dashboard':
      default:
        return renderDashboard();
    }
  };

  const renderDashboard = () => {
    return (
      <div className="p-6">
        {/* Card de Ação Rápida */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Ações Rápidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card Gerar Link de Cadastro */}
            <button
              onClick={() => setShowGenerateLinkModal(true)}
              className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 text-left group"
            >
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    Gerar Link de Cadastro
                  </h3>
                  <p className="text-sm text-gray-600">
                    Crie um link único para cadastro de novo restaurante com plano personalizado
                  </p>
                </div>
              </div>
            </button>

            {/* Card Gerenciar Restaurantes */}
            <button
              onClick={() => setActiveSection('restaurants')}
              className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 text-left group"
            >
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    Restaurantes
                  </h3>
                  <p className="text-sm text-gray-600">
                    Visualize e gerencie todos os restaurantes cadastrados
                  </p>
                </div>
              </div>
            </button>

            {/* Card Gerenciar Planos */}
            <button
              onClick={() => setActiveSection('plans')}
              className="bg-white rounded-lg shadow hover:shadow-lg transition p-6 text-left group"
            >
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    Planos
                  </h3>
                  <p className="text-sm text-gray-600">
                    Gerencie planos, preços e permissões disponíveis
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Placeholder para futuras estatísticas */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Estatísticas em Desenvolvimento</h3>
            <p className="text-gray-500">Dashboard com estatísticas e métricas será implementado em breve.</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <AdminSidebar 
        activeSection={activeSection} 
        onSectionChange={setActiveSection} 
      />
      
      {/* Main Content */}
      <div className="ml-64 flex flex-col min-h-screen">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="px-6 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {activeSection === 'dashboard' ? 'Dashboard' : 
                   activeSection === 'restaurants' ? 'Restaurantes' :
                   activeSection === 'permissions' ? 'Permissões' :
                   activeSection === 'plans' ? 'Planos' :
                   activeSection === 'ai-config' ? 'Configuração de IA' :
                   activeSection === 'registration-links' ? 'Links de Cadastro' : 'Admin'}
                </h1>
              </div>
              <button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto">
          {renderContent()}
        </div>
      </div>

      {/* Modal de Geração de Link */}
      <GenerateRegistrationLinkModal
        isOpen={showGenerateLinkModal}
        onClose={() => setShowGenerateLinkModal(false)}
        onSuccess={() => {
          // Não fazer nada aqui para evitar re-render desnecessário
          // O modal já mostra a mensagem de sucesso internamente
        }}
      />
    </div>
  );
}
