import { useEffect, useMemo, useState } from 'react';
import { getRestaurants, type Restaurant } from '../../services/restaurantService';
import { 
  getRestaurantPermissions, 
  updateRestaurantPermissions,
  type PermissionKey 
} from '../../services/permissionService';
import { PERMISSION_DEFINITIONS, DEFAULT_PERMISSIONS } from '../../types/permission';

export default function Permissions() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoadingRestaurants, setIsLoadingRestaurants] = useState(true);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('');
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);

  // Permissões reais do banco de dados
  const [permissionStore, setPermissionStore] = useState<Record<string, Record<PermissionKey, boolean>>>({});

  // Modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [pendingChange, setPendingChange] = useState<{ restaurantId: string; key: PermissionKey; value: boolean } | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoadingRestaurants(true);
        const data = await getRestaurants();
        setRestaurants(data);
        if (data.length > 0) {
          setSelectedRestaurantId(data[0].id);
        }
      } catch (e) {
        console.error('Erro ao carregar restaurantes:', e);
      } finally {
        setIsLoadingRestaurants(false);
      }
    };
    load();
  }, []);

  // Permissões ativas do restaurante selecionado
  const selectedPermissions: Record<PermissionKey, boolean> = useMemo(() => {
    if (!selectedRestaurantId) return DEFAULT_PERMISSIONS;
    return permissionStore[selectedRestaurantId] ?? DEFAULT_PERMISSIONS;
  }, [permissionStore, selectedRestaurantId]);

  const selectedRestaurant = useMemo(
    () => restaurants.find(r => r.id === selectedRestaurantId) || null,
    [restaurants, selectedRestaurantId]
  );

  // Carregar permissões quando um restaurante é selecionado
  useEffect(() => {
    if (selectedRestaurantId) {
      loadRestaurantPermissions(selectedRestaurantId);
    }
  }, [selectedRestaurantId]);

  const loadRestaurantPermissions = async (restaurantId: string) => {
    try {
      setIsLoadingPermissions(true);
      const permissions = await getRestaurantPermissions(restaurantId);
      setPermissionStore(prev => ({
        ...prev,
        [restaurantId]: permissions
      }));
    } catch (error) {
      console.error('Erro ao carregar permissões:', error);
    } finally {
      setIsLoadingPermissions(false);
    }
  };

  const requestToggle = (key: PermissionKey, value: boolean) => {
    if (!selectedRestaurantId) return;
    setPendingChange({ restaurantId: selectedRestaurantId, key, value });
    setShowConfirmModal(true);
  };

  const confirmToggle = async () => {
    if (confirmText.toLowerCase() !== 'confirmar' || !pendingChange) return;

    try {
      // Atualizar no banco de dados
      const currentPermissions = permissionStore[pendingChange.restaurantId] ?? DEFAULT_PERMISSIONS;
      const newPermissions = {
        ...currentPermissions,
        [pendingChange.key]: pendingChange.value,
      };
      
      await updateRestaurantPermissions(pendingChange.restaurantId, newPermissions);
      
      // Atualizar estado local
      setPermissionStore(prev => ({
        ...prev,
        [pendingChange.restaurantId]: newPermissions,
      }));

      setShowConfirmModal(false);
      setConfirmText('');
      setPendingChange(null);
    } catch (error) {
      console.error('Erro ao atualizar permissões:', error);
      alert('Erro ao atualizar permissões. Tente novamente.');
    }
  };

  const cancelToggle = () => {
    setShowConfirmModal(false);
    setConfirmText('');
    setPendingChange(null);
  };


  return (
    <>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Permissões</h1>
          <p className="text-gray-600 mt-2">Configure permissões por restaurante</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de restaurantes */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Selecionar Restaurante</h2>

            {isLoadingRestaurants ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Carregando restaurantes...</span>
              </div>
            ) : restaurants.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Nenhum restaurante encontrado.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {restaurants.map(r => (
                  <div
                    key={r.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedRestaurantId === r.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedRestaurantId(r.id)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium text-gray-900">{r.name}</h3>
                        <p className="text-sm text-gray-500">{r.domain}</p>
                        {r.email && <p className="text-xs text-gray-400">{r.email}</p>}
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          r.planId ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {r.planId ? 'PLANO' : 'SEM PLANO'}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          r.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {r.active ? 'ATIVO' : 'INATIVO'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Permissões */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
            {selectedRestaurant ? (
              <div>
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Permissões - {selectedRestaurant.name}</h2>
                  {selectedRestaurant.planId && (
                    <p className="text-gray-600">Plano ID: {selectedRestaurant.planId}</p>
                  )}
                </div>

                {isLoadingPermissions ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">Carregando permissões...</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.keys(PERMISSION_DEFINITIONS).map(key => {
                      const pKey = key as PermissionKey;
                      return (
                        <div key={key} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center">
                                <h3 className="font-medium text-gray-900">{PERMISSION_DEFINITIONS[pKey].name}</h3>
                                <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                                  selectedPermissions[pKey] ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {selectedPermissions[pKey] ? 'Ativo' : 'Inativo'}
                                </span>
                              </div>
                              <p className="text-sm text-gray-500 mt-1">{PERMISSION_DEFINITIONS[pKey].description}</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={!!selectedPermissions[pKey]}
                                onChange={(e) => requestToggle(pKey, e.target.checked)}
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Selecione um Restaurante</h3>
                <p className="text-gray-500">Escolha um restaurante à esquerda para gerenciar suas permissões.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Confirmação */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirmar Alteração de Permissão</h3>

            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Restaurante:</strong> {selectedRestaurant?.name}<br />
                <strong>Permissão:</strong> {pendingChange ? PERMISSION_DEFINITIONS[pendingChange.key].name : ''}<br />
                <strong>Novo Status:</strong> {pendingChange?.value ? 'Ativo' : 'Inativo'}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Digite "confirmar" para prosseguir:</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="confirmar"
              />
            </div>

            <div className="flex space-x-3">
              <button onClick={cancelToggle} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">Cancelar</button>
              <button onClick={confirmToggle} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
