import { useState, useEffect } from 'react';
import { 
  getPlansWithRestaurantCount, 
  addPlan, 
  updatePlan, 
  togglePlanStatus,
  type Plan,
  type CreatePlanData 
} from '../../services/planService';
import { 
  getRestaurantsByPlan, 
  updateRestaurantPlan
} from '../../services/restaurantService';
import { 
  updatePlanPermissions,
  applyPlanPermissionsToRestaurants,
  type PermissionKey 
} from '../../services/permissionService';
import { PERMISSION_DEFINITIONS, DEFAULT_PERMISSIONS } from '../../types/permission';
import type { Restaurant } from '../../types/restaurant';

interface PlanWithCount extends Plan {
  restaurantCount: number;
}

interface PlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (plan: CreatePlanData) => void;
  plan?: PlanWithCount;
}

interface RestaurantMoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurant: Restaurant | null;
  plans: PlanWithCount[];
  onMove: (restaurantId: string, newPlanId: string) => void;
}

function PlanModal({ isOpen, onClose, onSave, plan }: PlanModalProps) {
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    price: number;
    period: 'monthly' | 'yearly';
    features: string;
    maxTables: number;
    maxProducts: number;
    supportLevel: 'basic' | 'priority' | 'premium';
    active: boolean;
    permissions: Record<PermissionKey, boolean>;
  }>({
    name: '',
    description: '',
    price: 0,
    period: 'monthly',
    features: '',
    maxTables: 10,
    maxProducts: 50,
    supportLevel: 'basic',
    active: true,
    permissions: DEFAULT_PERMISSIONS
  });

  // Atualizar dados do formulário quando o plano mudar
  useEffect(() => {
    if (plan) {
      setFormData({
        name: plan.name || '',
        description: plan.description || '',
        price: plan.price || 0,
        period: (plan.period || 'monthly') as 'monthly' | 'yearly',
        features: plan.features?.join('\n') || '',
        maxTables: plan.maxTables || 10,
        maxProducts: plan.maxProducts || 50,
        supportLevel: (plan.supportLevel || 'basic') as 'basic' | 'priority' | 'premium',
        active: plan.active ?? true,
        permissions: plan.permissions || DEFAULT_PERMISSIONS
      });
    } else {
      // Reset para valores padrão quando criando novo plano
      setFormData({
        name: '',
        description: '',
        price: 0,
        period: 'monthly',
        features: '',
        maxTables: 10,
        maxProducts: 50,
        supportLevel: 'basic',
        active: true,
        permissions: DEFAULT_PERMISSIONS
      });
    }
  }, [plan]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const planData = {
      ...formData,
      features: formData.features.split('\n').filter(f => f.trim() !== '')
    };
    
    onSave(planData);
    onClose();
  };

  const handlePermissionChange = (permission: PermissionKey, enabled: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permission]: enabled
      }
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {plan ? 'Editar Plano' : 'Criar Novo Plano'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome do Plano
              </label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Premium"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preço
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                placeholder="99.90"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição
            </label>
            <textarea
              required
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descrição do plano..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Período
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.period}
                onChange={(e) => setFormData(prev => ({ ...prev, period: e.target.value as 'monthly' | 'yearly' }))}
              >
                <option value="monthly">Mensal</option>
                <option value="yearly">Anual</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Máx. Mesas
              </label>
              <input
                type="number"
                min="1"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.maxTables}
                onChange={(e) => setFormData(prev => ({ ...prev, maxTables: parseInt(e.target.value) }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Máx. Produtos
              </label>
              <input
                type="number"
                min="1"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.maxProducts}
                onChange={(e) => setFormData(prev => ({ ...prev, maxProducts: parseInt(e.target.value) }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nível de Suporte
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.supportLevel}
              onChange={(e) => setFormData(prev => ({ ...prev, supportLevel: e.target.value as 'basic' | 'priority' | 'premium' }))}
            >
              <option value="basic">Básico</option>
              <option value="priority">Prioritário</option>
              <option value="premium">Premium</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Funcionalidades (uma por linha)
            </label>
            <textarea
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.features}
              onChange={(e) => setFormData(prev => ({ ...prev, features: e.target.value }))}
              placeholder="Cardápio digital&#10;Suporte 24/7&#10;Analytics avançado"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Permissões do Plano
            </label>
            <div className="space-y-3">
              {Object.keys(PERMISSION_DEFINITIONS).map(key => {
                const permission = key as PermissionKey;
                return (
                  <div key={key} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{PERMISSION_DEFINITIONS[permission].name}</h4>
                      <p className="text-sm text-gray-500">{PERMISSION_DEFINITIONS[permission].description}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={formData.permissions[permission]}
                        onChange={(e) => handlePermissionChange(permission, e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="active"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              checked={formData.active}
              onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
            />
            <label htmlFor="active" className="ml-2 block text-sm text-gray-900">
              Plano ativo (disponível para novos clientes)
            </label>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {plan ? 'Salvar Alterações' : 'Criar Plano'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RestaurantMoveModal({ isOpen, onClose, restaurant, plans, onMove }: RestaurantMoveModalProps) {
  const [selectedPlanId, setSelectedPlanId] = useState('');

  useEffect(() => {
    if (restaurant) {
      setSelectedPlanId(restaurant.planId || '');
    }
  }, [restaurant]);

  const handleMove = () => {
    if (restaurant && selectedPlanId && selectedPlanId !== restaurant.planId) {
      onMove(restaurant.id, selectedPlanId);
      onClose();
    }
  };

  if (!isOpen || !restaurant) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Mover Restaurante
        </h3>
        
        <div className="mb-4">
          <p className="text-gray-600 mb-2">
            Movendo: <strong>{restaurant.name}</strong>
          </p>
          <p className="text-sm text-gray-500">
            Email: {restaurant.email}
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Novo Plano
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedPlanId}
            onChange={(e) => setSelectedPlanId(e.target.value)}
          >
            {plans.map(plan => (
              <option key={plan.id} value={plan.id}>
                {plan.name} - R$ {plan.price.toFixed(2)}/{plan.period === 'monthly' ? 'mês' : 'ano'}
              </option>
            ))}
          </select>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleMove}
            disabled={!selectedPlanId || selectedPlanId === restaurant.planId}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Mover
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Plans() {
  const [plans, setPlans] = useState<PlanWithCount[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanWithCount | undefined>();
  const [restaurantsInPlan, setRestaurantsInPlan] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [movingRestaurant, setMovingRestaurant] = useState<Restaurant | null>(null);

  // Carregar dados iniciais
  useEffect(() => {
    loadPlans();
  }, []);

  // Carregar restaurantes quando um plano é selecionado
  useEffect(() => {
    if (selectedPlan) {
      loadRestaurantsInPlan(selectedPlan);
    }
  }, [selectedPlan]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const plansData = await getPlansWithRestaurantCount();
      setPlans(plansData);
    } catch (error) {
      console.error('Erro ao carregar planos:', error);
      alert('Erro ao carregar planos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const loadRestaurantsInPlan = async (planId: string) => {
    try {
      const restaurants = await getRestaurantsByPlan(planId);
      setRestaurantsInPlan(restaurants);
    } catch (error) {
      console.error('Erro ao carregar restaurantes do plano:', error);
      setRestaurantsInPlan([]);
    }
  };

  const handleCreatePlan = () => {
    setEditingPlan(undefined);
    setShowModal(true);
  };

  const handleEditPlan = (plan: PlanWithCount) => {
    setEditingPlan(plan);
    setShowModal(true);
  };

  const handleSavePlan = async (planData: CreatePlanData) => {
    try {
      if (editingPlan) {
        // Editando plano existente
        await updatePlan(editingPlan.id, planData);
        
        // Atualizar permissões do plano
        if (planData.permissions) {
          await updatePlanPermissions(editingPlan.id, planData.permissions);
          // Aplicar permissões a todos os restaurantes do plano automaticamente
          await applyPlanPermissionsToRestaurants(editingPlan.id);
        }
        
        alert('Plano atualizado com sucesso! As permissões foram aplicadas automaticamente aos restaurantes.');
      } else {
        // Criando novo plano
        const newPlan = await addPlan(planData);
        
        // Criar permissões do plano
        if (planData.permissions) {
          await updatePlanPermissions(newPlan.id, planData.permissions);
        }
        
        alert('Plano criado com sucesso!');
      }
      
      // Recarregar dados
      await loadPlans();
      
      // Se um plano estava selecionado, recarregar seus restaurantes
      if (selectedPlan) {
        await loadRestaurantsInPlan(selectedPlan);
      }
    } catch (error) {
      console.error('Erro ao salvar plano:', error);
      alert('Erro ao salvar plano. Tente novamente.');
    }
  };

  const handleTogglePlanStatus = async (planId: string, currentStatus: boolean) => {
    try {
      await togglePlanStatus(planId, !currentStatus);
      await loadPlans();
      alert(`Plano ${!currentStatus ? 'ativado' : 'desativado'} com sucesso!`);
    } catch (error) {
      console.error('Erro ao alterar status do plano:', error);
      alert('Erro ao alterar status do plano. Tente novamente.');
    }
  };

  const handleMoveRestaurant = async (restaurantId: string, newPlanId: string) => {
    try {
      // updateRestaurantPlan já aplica as permissões automaticamente
      await updateRestaurantPlan(restaurantId, newPlanId);
      alert('Restaurante movido com sucesso! As permissões foram aplicadas automaticamente.');
      
      // Recarregar dados
      await loadPlans();
      if (selectedPlan) {
        await loadRestaurantsInPlan(selectedPlan);
      }
    } catch (error) {
      console.error('Erro ao mover restaurante:', error);
      alert('Erro ao mover restaurante. Tente novamente.');
    }
  };

  const openMoveModal = (restaurant: Restaurant) => {
    setMovingRestaurant(restaurant);
    setShowMoveModal(true);
  };

  const selectedPlanData = plans.find(p => p.id === selectedPlan);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Carregando planos...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-6">
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Planos</h1>
              <p className="text-gray-600 mt-2">Configure planos de assinatura e gerencie funcionalidades</p>
            </div>
            <button
              onClick={handleCreatePlan}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Criar Novo Plano
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de Planos */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Planos Disponíveis</h2>
              
              {plans.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum Plano Encontrado</h3>
                  <p className="text-gray-500 mb-4">Crie o primeiro plano para começar.</p>
                  <button
                    onClick={handleCreatePlan}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Criar Primeiro Plano
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {plans.map(plan => (
                    <div
                      key={plan.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedPlan === plan.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      } ${!plan.active ? 'opacity-60' : ''}`}
                      onClick={() => setSelectedPlan(plan.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              plan.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {plan.active ? 'ATIVO' : 'INATIVO'}
                            </span>
                          </div>
                          <p className="text-gray-600 text-sm mt-1">{plan.description}</p>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                            <span>R$ {plan.price.toFixed(2)}/{plan.period === 'monthly' ? 'mês' : 'ano'}</span>
                            <span>•</span>
                            <span>{plan.restaurantCount} restaurantes</span>
                            <span>•</span>
                            <span>Até {plan.maxTables === 999 ? '∞' : plan.maxTables} mesas</span>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditPlan(plan);
                            }}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            Editar
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTogglePlanStatus(plan.id, plan.active);
                            }}
                            className={`text-sm ${
                              plan.active 
                                ? 'text-red-600 hover:text-red-800' 
                                : 'text-green-600 hover:text-green-800'
                            }`}
                          >
                            {plan.active ? 'Desativar' : 'Ativar'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Detalhes do Plano Selecionado */}
          <div className="bg-white rounded-lg shadow">
            {selectedPlanData ? (
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Detalhes - {selectedPlanData.name}
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Funcionalidades</h3>
                    <ul className="space-y-1">
                      {selectedPlanData.features.map((feature, index) => (
                        <li key={index} className="text-sm text-gray-600 flex items-center">
                          <svg className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Permissões</h3>
                    <div className="space-y-2">
                      {Object.keys(PERMISSION_DEFINITIONS).map(key => {
                        const permission = key as PermissionKey;
                        const isEnabled = selectedPlanData.permissions?.[permission] || false;
                        return (
                          <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div className="flex-1">
                              <span className="text-sm font-medium text-gray-900">{PERMISSION_DEFINITIONS[permission].name}</span>
                            </div>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              isEnabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {isEnabled ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Limites</h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>Mesas: {selectedPlanData.maxTables === 999 ? 'Ilimitadas' : selectedPlanData.maxTables}</div>
                      <div>Produtos: {selectedPlanData.maxProducts === 9999 ? 'Ilimitados' : selectedPlanData.maxProducts}</div>
                      <div>Suporte: {
                        selectedPlanData.supportLevel === 'basic' ? 'Básico' :
                        selectedPlanData.supportLevel === 'priority' ? 'Prioritário' : 'Premium'
                      }</div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">
                      Restaurantes ({restaurantsInPlan.length})
                    </h3>
                    {restaurantsInPlan.length > 0 ? (
                      <div className="space-y-2">
                        {restaurantsInPlan.map(restaurant => (
                          <div key={restaurant.id} className="p-2 bg-gray-50 rounded text-sm">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">{restaurant.name}</div>
                                <div className="text-gray-600">{restaurant.email}</div>
                              </div>
                              <button
                                onClick={() => openMoveModal(restaurant)}
                                className="text-blue-600 hover:text-blue-800 text-xs"
                                title="Mover para outro plano"
                              >
                                Mover
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Nenhum restaurante neste plano</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Selecione um Plano</h3>
                <p className="text-gray-500">Clique em um plano à esquerda para ver seus detalhes.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Criação/Edição */}
      <PlanModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSavePlan}
        plan={editingPlan}
      />

      {/* Modal de Movimentação de Restaurante */}
      <RestaurantMoveModal
        isOpen={showMoveModal}
        onClose={() => setShowMoveModal(false)}
        restaurant={movingRestaurant}
        plans={plans}
        onMove={handleMoveRestaurant}
      />
    </>
  );
}