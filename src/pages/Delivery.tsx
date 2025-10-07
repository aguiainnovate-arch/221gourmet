import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, MapPin, Phone, Mail, ChevronRight, Search, Utensils } from 'lucide-react';
import { getRestaurants } from '../services/restaurantService';
import type { Restaurant } from '../types/restaurant';

export default function Delivery() {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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

  const filteredRestaurants = restaurants.filter(restaurant =>
    restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    restaurant.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <div className="flex items-center space-x-3 mb-4">
              <Utensils className="w-12 h-12" />
              <h1 className="text-4xl font-bold">221 Delivery</h1>
            </div>
            <p className="text-xl text-amber-50">
              Peça comida dos melhores restaurantes e receba em casa!
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="container mx-auto px-4 -mt-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar restaurantes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Restaurants List */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {searchTerm ? 'Resultados da busca' : 'Todos os restaurantes'}
            <span className="text-lg font-normal text-gray-500 ml-2">
              ({filteredRestaurants.length} {filteredRestaurants.length === 1 ? 'restaurante' : 'restaurantes'})
            </span>
          </h2>

          {filteredRestaurants.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {searchTerm ? 'Nenhum restaurante encontrado' : 'Nenhum restaurante disponível'}
              </h3>
              <p className="text-gray-500">
                {searchTerm ? 'Tente buscar com outros termos' : 'Em breve teremos restaurantes disponíveis'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredRestaurants.map((restaurant) => (
                <div
                  key={restaurant.id}
                  onClick={() => handleRestaurantClick(restaurant.id)}
                  className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer overflow-hidden group"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <div 
                            className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl"
                            style={{ 
                              backgroundColor: restaurant.theme?.primaryColor || '#92400e' 
                            }}
                          >
                            {restaurant.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900 group-hover:text-amber-600 transition-colors">
                              {restaurant.name}
                            </h3>
                            <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                              <span className="flex items-center">
                                <Store className="w-4 h-4 mr-1" />
                                Restaurante
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex items-start">
                            <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                            <span>{restaurant.address}</span>
                          </div>
                          <div className="flex items-center">
                            <Phone className="w-4 h-4 mr-2 flex-shrink-0" />
                            <span>{restaurant.phone}</span>
                          </div>
                          <div className="flex items-center">
                            <Mail className="w-4 h-4 mr-2 flex-shrink-0" />
                            <span>{restaurant.email}</span>
                          </div>
                        </div>
                      </div>

                      <div className="ml-4 flex flex-col items-end justify-between h-full">
                        <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                          Aberto
                        </div>
                        <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-amber-600 transition-colors mt-4" />
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

