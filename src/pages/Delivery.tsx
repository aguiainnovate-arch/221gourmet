import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, MapPin, Phone, Mail, ChevronRight, Search, Utensils, Star, Clock, Truck, Filter, Heart, Zap, Receipt } from 'lucide-react';
import { getRestaurants } from '../services/restaurantService';
import type { Restaurant } from '../types/restaurant';

export default function Delivery() {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
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
      setRestaurants(data.filter(r => r.active));
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
      {/* Header Moderno */}
      <div className="bg-gradient-to-br from-red-500 via-red-600 to-red-700 text-white relative overflow-hidden">
        {/* Elementos decorativos */}
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-48 translate-x-48"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-32 -translate-x-32"></div>

        <div className="container mx-auto px-4 py-16 relative z-10">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <Utensils className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold">221 Delivery</h1>
                  <p className="text-red-100 text-lg">Comida rápida e deliciosa</p>
                </div>
              </div>
              <div className="hidden md:flex items-center space-x-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
                  <span className="text-sm font-medium">Entrega grátis acima de R$ 25</span>
                </div>
                <button
                  onClick={() => navigate('/orders')}
                  className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 hover:bg-white/30 transition-colors"
                >
                  <Receipt className="w-4 h-4" />
                  <span className="text-sm font-medium">Meus Pedidos</span>
                </button>
              </div>
            </div>

            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">Peça comida dos melhores restaurantes</h2>
              <p className="text-xl text-red-100">Receba em casa com rapidez e qualidade</p>

              {/* Botão mobile para pedidos */}
              <div className="md:hidden mt-6">
                <button
                  onClick={() => navigate('/orders')}
                  className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-full px-6 py-3 hover:bg-white/30 transition-colors mx-auto"
                >
                  <Receipt className="w-5 h-5" />
                  <span className="font-medium">Meus Pedidos</span>
                </button>
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
    </div>
  );
}

