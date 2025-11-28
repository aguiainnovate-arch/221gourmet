import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, MapPin, Phone, ChevronRight, Search, Utensils, User, LogOut, Filter, Clock, Truck, Zap, Star, Heart } from 'lucide-react';
import { getRestaurants } from '../services/restaurantService';
import { getRestaurantPermissions } from '../services/permissionService';
import type { Restaurant } from '../types/restaurant';
import AIRestaurantChat from '../components/AIRestaurantChat';
import DeliveryAuthModal from '../components/DeliveryAuthModal';
import { useDeliveryAuth } from '../contexts/DeliveryAuthContext';

export default function Delivery() {
  const navigate = useNavigate();
  const { user, logout } = useDeliveryAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('todos');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadRestaurants();
  }, []);

  const loadRestaurants = async () => {
    try {
      setLoading(true);
      const data = await getRestaurants();
      
      // Filtrar apenas restaurantes ativos
      const activeRestaurants = data.filter(r => r.active);
      
      // Verificar permissão de delivery e configurações para cada restaurante
      const restaurantsWithPermissions = await Promise.all(
        activeRestaurants.map(async (restaurant) => {
          const permissions = await getRestaurantPermissions(restaurant.id);
          const hasPermission = permissions.delivery;
          // Se deliverySettings.enabled não está definido, usar true como padrão
          const isEnabledByRestaurant = restaurant.deliverySettings?.enabled ?? true;
          
          return {
            restaurant,
            hasDeliveryPermission: hasPermission,
            isEnabledByRestaurant
          };
        })
      );
      
      // Filtrar restaurantes que têm permissão E estão habilitados pelo próprio restaurante
      const allowedRestaurants = restaurantsWithPermissions
        .filter(r => r.hasDeliveryPermission && r.isEnabledByRestaurant)
        .map(r => r.restaurant);
      
      setRestaurants(allowedRestaurants);
    } catch (error) {
      console.error('Erro ao carregar restaurantes:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRestaurants = restaurants.filter(restaurant => {
    const matchesSearch = restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      restaurant.address.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    switch (selectedFilter) {
      case 'rapido':
        return true; // Simular restaurantes rápidos
      case 'promocao':
        return true; // Simular restaurantes com promoção
      case 'favoritos':
        return false; // Implementar sistema de favoritos futuramente
      default:
        return true;
    }
  });

  const filters = [
    { id: 'todos', label: 'Todos', icon: Store },
    { id: 'rapido', label: 'Rápido', icon: Zap },
    { id: 'promocao', label: 'Promoção', icon: Star },
    { id: 'favoritos', label: 'Favoritos', icon: Heart },
  ];

  const handleRestaurantClick = (restaurantId: string) => {
    navigate(`/delivery/${restaurantId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando restaurantes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Utensils className="w-12 h-12" />
                <h1 className="text-4xl font-bold">221 Delivery</h1>
              </div>
              <div className="flex items-center space-x-2">
                {user ? (
                  <>
                    <div className="flex items-center space-x-2 bg-white/20 px-4 py-2 rounded-lg">
                      <User className="w-5 h-5" />
                      <span className="font-medium">{user.name}</span>
                    </div>
                    <button
                      onClick={logout}
                      className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                      title="Sair"
                    >
                      <LogOut className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="bg-white text-amber-600 hover:bg-amber-50 px-6 py-2 rounded-lg font-semibold flex items-center space-x-2 transition-colors"
                  >
                    <User className="w-5 h-5" />
                    <span>Entrar / Criar conta</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Busca e Filtros */}
      <div className="container mx-auto px-4 -mt-8 relative z-20">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Busca */}
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar restaurantes, pratos ou categorias..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent text-lg"
                />
              </div>

              {/* Botão de Filtros */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 px-6 py-4 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                <Filter className="w-5 h-5" />
                <span className="font-medium">Filtros</span>
              </button>
            </div>

            {/* Filtros */}
            {showFilters && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex flex-wrap gap-3">
                  {filters.map((filter) => {
                    const Icon = filter.icon;
                    return (
                      <button
                        key={filter.id}
                        onClick={() => setSelectedFilter(filter.id)}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-colors ${selectedFilter === filter.id
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="font-medium">{filter.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lista de Restaurantes */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {searchTerm ? 'Resultados da busca' : 'Restaurantes próximos'}
            </h2>
            <span className="text-gray-500 font-medium">
              {filteredRestaurants.length} {filteredRestaurants.length === 1 ? 'restaurante' : 'restaurantes'}
            </span>
          </div>

          {filteredRestaurants.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <Store className="w-20 h-20 text-gray-300 mx-auto mb-6" />
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                {searchTerm ? 'Nenhum restaurante encontrado' : 'Nenhum restaurante disponível'}
              </h3>
              <p className="text-gray-500 text-lg">
                {searchTerm ? 'Tente buscar com outros termos' : 'Em breve teremos restaurantes disponíveis'}
              </p>
            </div>
          ) : (
            <div className="grid gap-6">
              {filteredRestaurants.map((restaurant) => (
                <div
                  key={restaurant.id}
                  onClick={() => handleRestaurantClick(restaurant.id)}
                  className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden group hover:scale-[1.02]"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-start space-x-4 mb-4">
                          {/* Avatar do Restaurante */}
                          <div
                            className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg"
                            style={{
                              backgroundColor: restaurant.theme?.primaryColor || '#dc2626'
                            }}
                          >
                            {restaurant.name.charAt(0).toUpperCase()}
                          </div>

                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="text-2xl font-bold text-gray-900 group-hover:text-red-600 transition-colors mb-1">
                                  {restaurant.name}
                                </h3>

                                {/* Avaliação e Tempo */}
                                <div className="flex items-center space-x-4 mb-3">
                                  <div className="flex items-center space-x-1">
                                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                                    <span className="text-sm font-semibold text-gray-700">4.5</span>
                                    <span className="text-sm text-gray-500">(127 avaliações)</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <Clock className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-600">25-35 min</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <Truck className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-600">R$ 3,50</span>
                                  </div>
                                </div>

                                {/* Tags */}
                                <div className="flex items-center space-x-2 mb-3">
                                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                                    Aberto
                                  </span>
                                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                                    Entrega rápida
                                  </span>
                                  <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-semibold">
                                    10% OFF
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Informações de Contato */}
                            <div className="space-y-2 text-sm text-gray-600">
                              <div className="flex items-start">
                                <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-gray-400" />
                                <span className="line-clamp-1">{restaurant.address}</span>
                              </div>
                              <div className="flex items-center">
                                <Phone className="w-4 h-4 mr-2 flex-shrink-0 text-gray-400" />
                                <span>{restaurant.phone}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="ml-6 flex flex-col items-end justify-between h-full">
                        <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-red-600 transition-colors" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI Chat Assistant */}
      <AIRestaurantChat />

      {/* Auth Modal */}
      <DeliveryAuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
}

