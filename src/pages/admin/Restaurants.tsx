
import { useState, useEffect } from 'react';
import { getRestaurants, deleteRestaurant, type Restaurant } from '../../services/restaurantService';
import { migrateProductsToRestaurant, countItemsWithoutRestaurant } from '../../services/migrationService';
import { getPlans, type Plan } from '../../services/planService';
import { migrateRestaurantsToPlans } from '../../utils/migrateRestaurantsToPlans';
import RestaurantModal from '../../components/RestaurantModal';

export default function Restaurants() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [migrationStats, setMigrationStats] = useState<{products: number, categories: number} | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [isMigratingPlans, setIsMigratingPlans] = useState(false);

  useEffect(() => {
    loadRestaurants();
    loadMigrationStats();
    loadPlans();
  }, []);

  const loadRestaurants = async () => {
    try {
      setIsLoading(true);
      const data = await getRestaurants();
      setRestaurants(data);
    } catch (error) {
      console.error('Erro ao carregar restaurantes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPlans = async () => {
    try {
      const plansData = await getPlans();
      setPlans(plansData);
    } catch (error) {
      console.error('Erro ao carregar planos:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja desativar este restaurante?')) {
      try {
        await deleteRestaurant(id);
        await loadRestaurants();
      } catch (error) {
        console.error('Erro ao desativar restaurante:', error);
        alert('Erro ao desativar restaurante');
      }
    }
  };

  const handleEdit = (restaurant: Restaurant) => {
    setEditingRestaurant(restaurant);
    setShowModal(true);
  };

  const handleAdd = () => {
    setEditingRestaurant(null);
    setShowModal(true);
  };

  const handleGoToRestaurant = (restaurant: Restaurant) => {
    const currentDomain = window.location.origin;
    const restaurantUrl = `${currentDomain}/${restaurant.id}`;
    window.open(restaurantUrl, '_blank');
  };

  const handleModalSuccess = () => {
    loadRestaurants();
  };

  const getPlanName = (planId?: string) => {
    if (!planId) return 'Sem plano';
    const plan = plans.find(p => p.id === planId);
    return plan ? plan.name : 'Plano não encontrado';
  };

  const loadMigrationStats = async () => {
    try {
      const stats = await countItemsWithoutRestaurant();
      setMigrationStats(stats);
    } catch (error) {
      console.error('Erro ao carregar estatísticas de migração:', error);
    }
  };

  const handleMigrate = async (restaurantId: string, restaurantName: string) => {
    if (!confirm(`Tem certeza que deseja migrar TODOS os produtos e categorias existentes para "${restaurantName}"?\n\nEsta ação não pode ser desfeita!`)) {
      return;
    }

    try {
      setIsMigrating(true);
      const result = await migrateProductsToRestaurant(restaurantId);
      
      if (result.errors.length > 0) {
        console.error('Erros durante a migração:', result.errors);
        alert(`Migração concluída com alguns erros:\n- Produtos migrados: ${result.productsUpdated}\n- Categorias migradas: ${result.categoriesUpdated}\n- Erros: ${result.errors.length}\n\nVerifique o console para detalhes.`);
      } else {
        alert(`Migração concluída com sucesso!\n- Produtos migrados: ${result.productsUpdated}\n- Categorias migradas: ${result.categoriesUpdated}`);
      }
      
      // Recarregar estatísticas
      await loadMigrationStats();
    } catch (error) {
      console.error('Erro na migração:', error);
      alert('Erro durante a migração. Verifique o console para detalhes.');
    } finally {
      setIsMigrating(false);
    }
  };

  const handleMigratePlans = async () => {
    if (!confirm('Tem certeza que deseja migrar todos os restaurantes sem plano para o plano mais barato disponível?')) {
      return;
    }

    try {
      setIsMigratingPlans(true);
      const result = await migrateRestaurantsToPlans();
      
      if (result.success) {
        if (result.migrated && result.migrated > 0) {
          alert(`✅ Migração concluída com sucesso!\n- ${result.migrated} restaurantes migrados para o plano "${result.defaultPlan}"\n${result.errors && result.errors.length > 0 ? `- ${result.errors.length} erros encontrados (veja o console)` : ''}`);
        } else {
          alert('✅ Todos os restaurantes já possuem planos associados!');
        }
        
        // Recarregar dados
        await loadRestaurants();
      } else {
        alert(`❌ Erro na migração: ${result.error}`);
      }
    } catch (error) {
      console.error('Erro na migração:', error);
      alert('❌ Erro durante a migração. Verifique o console para detalhes.');
    } finally {
      setIsMigratingPlans(false);
    }
  };

  const getPlanBadgeColor = (planId?: string) => {
    if (!planId) return 'bg-gray-100 text-gray-800';
    
    // Cores baseadas em hash do planId para consistência
    const colors = [
      'bg-blue-100 text-blue-800', 
      'bg-purple-100 text-purple-800',
      'bg-green-100 text-green-800',
      'bg-yellow-100 text-yellow-800',
      'bg-red-100 text-red-800'
    ];
    const index = planId.length % colors.length;
    return colors[index];
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Restaurantes</h1>
          <p className="text-gray-600 mt-2">Gerencie todos os restaurantes e seus domínios personalizados</p>
        </div>
        <div className="flex space-x-3">
          {/* Botão de migração de planos - só aparece se há restaurantes sem plano */}
          {restaurants.some(r => !r.planId) && (
            <button
              onClick={handleMigratePlans}
              disabled={isMigratingPlans}
              className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white px-4 py-2 rounded-md text-sm font-medium"
              title="Migrar restaurantes sem plano para o plano mais barato"
            >
              {isMigratingPlans ? 'Migrando...' : '🔧 Migrar Planos'}
            </button>
          )}
          <button
            onClick={handleAdd}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Adicionar Restaurante
          </button>
        </div>
      </div>

      {/* Banner de Migração */}
      {migrationStats && (migrationStats.products > 0 || migrationStats.categories > 0) && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-yellow-800">
                Migração de Dados Necessária
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  Encontrados <strong>{migrationStats.products} produtos</strong> e <strong>{migrationStats.categories} categorias</strong> sem restaurante associado.
                  Para que apareçam corretamente, você precisa migrar estes dados para um restaurante específico.
                </p>
                <p className="mt-2">
                  <strong>Recomendação:</strong> Use o botão "Migrar Dados" na linha do restaurante para onde deseja mover os produtos existentes.
                </p>
                <div className="mt-3">
                  <button
                    onClick={() => handleMigrate('YcL3Q98o8zkWRT1ak4BD', 'Restaurante Principal')}
                    disabled={isMigrating}
                    className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    {isMigrating ? 'Migrando...' : 'Migrar para YcL3Q98o8zkWRT1ak4BD'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Restaurante
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Domínio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plano
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Criado em
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {restaurants.map((restaurant) => (
                <tr key={restaurant.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {restaurant.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {restaurant.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {restaurant.domain}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPlanBadgeColor(restaurant.planId)}`}>
                      {getPlanName(restaurant.planId)}
                      {!restaurant.planId && (
                        <span className="ml-1" title="Restaurante precisa ser atualizado">⚠️</span>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      restaurant.active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {restaurant.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {restaurant.createdAt.toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {migrationStats && (migrationStats.products > 0 || migrationStats.categories > 0) && (
                      <button
                        onClick={() => handleMigrate(restaurant.id, restaurant.name)}
                        disabled={isMigrating}
                        className="text-orange-600 hover:text-orange-900 mr-3 disabled:opacity-50"
                        title="Migrar produtos e categorias existentes para este restaurante"
                      >
                        {isMigrating ? 'Migrando...' : 'Migrar Dados'}
                      </button>
                    )}
                    <button
                      onClick={() => handleGoToRestaurant(restaurant)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                      title="Ir para restaurante"
                    >
                      Ir para restaurante
                    </button>
                    <button
                      onClick={() => handleEdit(restaurant)}
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(restaurant.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Desativar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {restaurants.length === 0 && (
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum restaurante cadastrado</h3>
              <p className="text-gray-500 mb-4">Comece adicionando o primeiro restaurante ao sistema.</p>
              <button
                onClick={handleAdd}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Adicionar Restaurante
              </button>
            </div>
          )}
        </div>
      </div>

      <RestaurantModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={handleModalSuccess}
        restaurant={editingRestaurant}
      />
    </div>
  );
}
