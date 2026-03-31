import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AdminSidebar from '../components/AdminSidebar';
import Dashboard from './admin/Dashboard';
import Restaurants from './admin/Restaurants';
import Permissions from './admin/Permissions';
import Plans from './admin/Plans';
import RestaurantLeads from './admin/RestaurantLeads';
import Motoboys from './admin/Motoboys';
import AIConfiguration from './owner/AIConfiguration';
import RegistrationLinks from './owner/RegistrationLinks';
import GenerateRegistrationLinkModal from '../components/GenerateRegistrationLinkModal';

const SECTION_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  restaurants: 'Restaurantes',
  permissions: 'Permissões',
  plans: 'Planos',
  leads: 'Solicitações de Parceiros',
  motoboys: 'Motoboys',
  'ai-config': 'Configuração de IA',
  'registration-links': 'Links de Cadastro'
};

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
      case 'leads':
        return <RestaurantLeads />;
      case 'motoboys':
        return <Motoboys />;
      case 'ai-config':
        return <AIConfiguration />;
      case 'registration-links':
        return <RegistrationLinks />;
      case 'dashboard':
      default:
        return <Dashboard onNavigate={setActiveSection} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      <div className="ml-64 flex flex-col min-h-screen">
        <div className="bg-white shadow">
          <div className="px-6 py-4 flex justify-between items-center">
            <h1 className="text-xl font-semibold text-gray-900">
              {SECTION_TITLES[activeSection] ?? 'Admin'}
            </h1>
            <div className="flex items-center gap-3">
              {activeSection === 'registration-links' && (
                <button
                  onClick={() => setShowGenerateLinkModal(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Gerar Link
                </button>
              )}
              <button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Sair
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {renderContent()}
        </div>
      </div>

      <GenerateRegistrationLinkModal
        isOpen={showGenerateLinkModal}
        onClose={() => setShowGenerateLinkModal(false)}
        onSuccess={() => {}}
      />
    </div>
  );
}
