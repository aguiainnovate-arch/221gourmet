import { useState, useEffect } from 'react';
import { addRestaurant, updateRestaurant, checkDomainExists, type Restaurant, type CreateRestaurantData } from '../services/restaurantService';
import { getActivePlans, getPlans, type Plan } from '../services/planService';

interface RestaurantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  restaurant?: Restaurant | null;
}

export default function RestaurantModal({ isOpen, onClose, onSuccess, restaurant }: RestaurantModalProps) {
  const [formData, setFormData] = useState<CreateRestaurantData>({
    name: '',
    domain: '',
    email: '',
    phone: '',
    address: '',
    planId: '',
    theme: {
      primaryColor: '#4f46e5',
      secondaryColor: '#6b7280'
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [plans, setPlans] = useState<Plan[]>([]);

  // Carregar planos quando o modal abrir
  useEffect(() => {
    if (isOpen) {
      loadPlans();
    }
  }, [isOpen]);

  useEffect(() => {
    if (restaurant) {
      setFormData({
        name: restaurant.name || '',
        domain: restaurant.domain || '',
        email: restaurant.email || '',
        phone: restaurant.phone || '',
        address: restaurant.address || '',
        planId: restaurant.planId || (plans.length > 0 ? plans[0].id : ''),
        theme: restaurant.theme || {
          primaryColor: '#4f46e5',
          secondaryColor: '#6b7280'
        }
      });
    } else {
      setFormData({
        name: '',
        domain: '',
        email: '',
        phone: '',
        address: '',
        planId: plans.length > 0 ? plans[0].id : '',
        theme: {
          primaryColor: '#4f46e5',
          secondaryColor: '#6b7280'
        }
      });
    }
    setErrors({});
  }, [restaurant, isOpen, plans]);

  const loadPlans = async () => {
    try {
      let plansData = await getActivePlans();
      
      // Se não há planos ativos, tenta carregar todos os planos
      if (plansData.length === 0) {
        const allPlans = await getPlans();
        plansData = allPlans.filter(plan => plan.active);
      }
      
      setPlans(plansData);
    } catch (error) {
      console.error('Erro ao carregar planos:', error);
      // Tentar carregar todos os planos como último recurso
      try {
        const allPlans = await getPlans();
        const activePlans = allPlans.filter(plan => plan.active);
        setPlans(activePlans);
      } catch (fallbackError) {
        console.error('Falha no fallback:', fallbackError);
      }
    }
  };

  const validateForm = async (): Promise<boolean> => {
    const newErrors: Record<string, string> = {};

    // Validações obrigatórias
    if (!formData.name?.trim()) newErrors.name = 'Nome é obrigatório';
    if (!formData.domain?.trim()) newErrors.domain = 'Domínio é obrigatório';
    if (!formData.email?.trim()) newErrors.email = 'Email é obrigatório';
    if (!formData.phone?.trim()) newErrors.phone = 'Telefone é obrigatório';
    if (!formData.address?.trim()) newErrors.address = 'Endereço é obrigatório';
    if (!formData.planId?.trim()) newErrors.planId = 'Plano é obrigatório';

    // Validação de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    // Validação de domínio
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    if (formData.domain && !domainRegex.test(formData.domain)) {
      newErrors.domain = 'Formato de domínio inválido (ex: exemplo.com)';
    }

    // Verificar se domínio já existe
    if (formData.domain && !newErrors.domain) {
      const domainExists = await checkDomainExists(formData.domain, restaurant?.id);
      if (domainExists) {
        newErrors.domain = 'Este domínio já está em uso';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isValid = await validateForm();
    if (!isValid) return;

    setIsLoading(true);
    try {
      if (restaurant) {
        await updateRestaurant(restaurant.id, formData);
      } else {
        await addRestaurant(formData);
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('❌ Erro ao salvar restaurante:', error);
      setErrors({ submit: 'Erro ao salvar restaurante. Tente novamente.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateRestaurantData, value: string) => {
    setFormData((prev: CreateRestaurantData) => ({
      ...prev,
      [field]: value
    }));
    // Limpar erro do campo quando usuário começar a digitar
    if (errors[field as string]) {
      setErrors((prev: Record<string, string>) => ({ ...prev, [field]: '' }));
    }
  };

  const handleThemeChange = (field: 'primaryColor' | 'secondaryColor', value: string) => {
    setFormData((prev: CreateRestaurantData) => ({
      ...prev,
      theme: {
        ...prev.theme!,
        [field]: value
      }
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              {restaurant ? 'Editar Restaurante' : 'Adicionar Restaurante'}
            </h3>
          </div>

          {/* Body */}
          <div className="px-6 py-4 space-y-6">
            {/* Informações Básicas */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">Informações Básicas</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Restaurante *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      errors.name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Ex: Pizzaria do João"
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Domínio Personalizado *
                  </label>
                  <input
                    type="text"
                    value={formData.domain}
                    onChange={(e) => handleInputChange('domain', e.target.value.toLowerCase())}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      errors.domain ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="exemplo.com"
                  />
                  {errors.domain && <p className="mt-1 text-sm text-red-600">{errors.domain}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      errors.email ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="contato@exemplo.com"
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      errors.phone ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="(11) 99999-9999"
                  />
                  {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Endereço *
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.address ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Rua, número, bairro, cidade - CEP"
                />
                {errors.address && <p className="mt-1 text-sm text-red-600">{errors.address}</p>}
              </div>
            </div>

            {/* Plano */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">
                Plano de Assinatura 
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({plans.length} planos disponíveis)
                </span>
              </h4>
              {plans.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {plans.map((plan) => (
                    <label key={plan.id} className="relative cursor-pointer">
                      <input
                        type="radio"
                        name="planId"
                        value={plan.id}
                        checked={formData.planId === plan.id}
                        onChange={(e) => handleInputChange('planId', e.target.value)}
                        className="sr-only"
                      />
                      <div className={`p-4 border-2 rounded-lg ${
                        formData.planId === plan.id 
                          ? 'border-indigo-500 bg-indigo-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <div className="font-medium text-gray-900">{plan.name}</div>
                        <div className="text-sm text-gray-500 mt-1">
                          R$ {plan.price.toFixed(2)}/{plan.period === 'monthly' ? 'mês' : 'ano'}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          Até {plan.maxTables === 999 ? '∞' : plan.maxTables} mesas
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="text-sm text-gray-600">
                    <p className="mb-2">⚠️ Nenhum plano ativo encontrado.</p>
                    <p>Por favor:</p>
                    <ol className="list-decimal list-inside mt-2 space-y-1">
                      <li>Vá para a aba "Planos" no painel admin</li>
                      <li>Crie pelo menos um plano</li>
                      <li>Certifique-se de que o plano está marcado como "ativo"</li>
                    </ol>
                  </div>
                  <button
                    type="button"
                    onClick={loadPlans}
                    className="mt-3 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    🔄 Recarregar Planos
                  </button>
                </div>
              )}
              {errors.planId && <p className="mt-1 text-sm text-red-600">{errors.planId}</p>}
            </div>

            {/* Tema */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">Personalização Visual</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cor Primária
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={formData.theme?.primaryColor}
                      onChange={(e) => handleThemeChange('primaryColor', e.target.value)}
                      className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.theme?.primaryColor}
                      onChange={(e) => handleThemeChange('primaryColor', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="#4f46e5"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cor Secundária
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={formData.theme?.secondaryColor}
                      onChange={(e) => handleThemeChange('secondaryColor', e.target.value)}
                      className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.theme?.secondaryColor}
                      onChange={(e) => handleThemeChange('secondaryColor', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="#6b7280"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Aviso para restaurantes sem planId */}
            {restaurant && !restaurant.planId && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-amber-800">
                      Restaurante sem plano associado
                    </h3>
                    <div className="mt-2 text-sm text-amber-700">
                      <p>Este restaurante foi criado antes da implementação dos planos. Selecione um plano para continuar.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {isLoading ? 'Salvando...' : restaurant ? 'Atualizar' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
