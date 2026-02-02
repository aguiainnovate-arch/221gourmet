import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Store, MapPin, Phone, ChevronRight, Search, Utensils, User, LogOut, Filter, Clock, Truck, Star } from 'lucide-react';
import { getRestaurants } from '../services/restaurantService';
import { getRestaurantPermissions } from '../services/permissionService';
import { fetchFeaturedFoodImages, getDefaultFoodImages } from '../services/foodImageService';
import type { Restaurant } from '../types/restaurant';
import AIRestaurantChat from '../components/AIRestaurantChat';
import { useDeliveryAuth } from '../contexts/DeliveryAuthContext';

export default function Delivery() {
  const navigate = useNavigate();
  const carouselRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useDeliveryAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [showFilters, setShowFilters] = useState(false);
  const [featuredImages, setFeaturedImages] = useState(getDefaultFoodImages());

  useEffect(() => {
    loadRestaurants();
  }, []);

  useEffect(() => {
    fetchFeaturedFoodImages().then((imgs) => {
      if (imgs.length > 0) setFeaturedImages(imgs);
    });
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

    switch (selectedCategory) {
      case 'pizza':
      case 'lanches':
      case 'saudavel':
        return true; // Filtrar por categoria quando implementado
      default:
        return true;
    }
  });

  const categories = [
    { id: 'todos', label: 'Todos' },
    { id: 'pizza', label: 'Pizza' },
    { id: 'lanches', label: 'Lanches' },
    { id: 'saudavel', label: 'Saudável' },
  ];

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (!carouselRef.current) return;
    const step = 280;
    carouselRef.current.scrollBy({ left: direction === 'right' ? step : -step, behavior: 'smooth' });
  };

  const handleRestaurantClick = (restaurantId: string) => {
    navigate(`/delivery/${restaurantId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-50 to-amber-50/40 flex items-center justify-center font-sans">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-5">
            <div className="absolute inset-0 rounded-2xl bg-amber-400/20 animate-pulse" />
            <div className="absolute inset-0 rounded-2xl border-2 border-amber-300 border-t-amber-500 animate-spin" />
            <Utensils className="absolute inset-0 m-auto w-7 h-7 text-amber-500" />
          </div>
          <p className="text-stone-600 font-medium">Carregando restaurantes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 via-white to-amber-50/30 font-sans">
      {/* Header */}
      <header className="bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 text-white py-6 sm:py-7 shadow-lg shadow-amber-900/10">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/25 backdrop-blur-sm flex items-center justify-center shadow-inner">
                <Utensils className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">221 Delivery</h1>
                <p className="text-white/85 text-xs sm:text-sm font-medium hidden sm:block">Sua comida favorita em casa</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {user ? (
                <>
                  <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-2 rounded-xl border border-white/20">
                    <User className="w-4 h-4" />
                    <span className="font-medium text-sm max-w-[120px] truncate">{user.name}</span>
                  </div>
                  <button
                    onClick={logout}
                    className="p-2 rounded-xl bg-white/20 hover:bg-white/30 border border-white/20 transition-colors"
                    title="Sair"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <Link
                  to="/delivery/auth"
                  className="flex items-center gap-2 bg-white/25 hover:bg-white/35 text-white border border-white/40 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md"
                >
                  <User className="w-4 h-4" />
                  <span>Entrar / Criar conta</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Busca + Filtros */}
      <div className="container mx-auto px-4 -mt-5 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-stone-100 p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <input
                  type="text"
                  placeholder="Buscar restaurantes, pratos ou categorias..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 placeholder:text-stone-400 focus:ring-2 focus:ring-amber-400/60 focus:border-amber-400 focus:bg-white transition-all outline-none text-sm sm:text-base"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-medium text-sm transition-all sm:shrink-0 border ${showFilters ? 'bg-amber-500 text-white border-amber-500 shadow-md' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'}`}
              >
                <Filter className="w-4 h-4" />
                Filtros
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo: título + categorias + carrossel + lista */}
      <div className="container mx-auto px-4 py-6 pb-24">
        <div className="max-w-5xl mx-auto">
          {/* Linha: Restaurantes próximos | Pizza | Lanches | Saudável | 4 restaurantes */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-5">
            <h2 className="text-lg font-bold text-stone-900 shrink-0">
              {searchTerm ? 'Resultados da busca' : 'Restaurantes próximos'}
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              {categories.map((cat) => {
                const active = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all shrink-0 ${active ? 'bg-amber-500 text-white shadow-md' : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'}`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
            <span className="text-sm font-medium text-stone-500 tabular-nums ml-auto shrink-0">
              {filteredRestaurants.length} {filteredRestaurants.length === 1 ? 'restaurante' : 'restaurantes'}
            </span>
          </div>

          {/* Carrossel de destaques (imagens Unsplash) */}
          <div className="relative mb-8">
            <div
              ref={carouselRef}
              className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 scrollbar-hide"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {featuredImages.map((img, i) => (
                <div
                  key={i}
                  className="relative shrink-0 w-[280px] h-[180px] rounded-2xl overflow-hidden snap-center shadow-lg ring-1 ring-stone-100"
                >
                  <img
                    src={img.url}
                    alt={img.alt}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                </div>
              ))}
            </div>
            {/* Badge circular "221 Delivery" no centro do carrossel */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 hidden sm:flex">
              <div className="w-20 h-20 rounded-full bg-stone-800 ring-4 ring-amber-500 flex items-center justify-center shadow-xl">
                <span className="text-white text-xs font-bold text-center leading-tight px-1">221<br />Delivery</span>
              </div>
            </div>
            {/* Botão próximo */}
            <button
              type="button"
              onClick={() => scrollCarousel('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/95 shadow-lg border border-stone-200 flex items-center justify-center text-stone-600 hover:bg-white hover:text-amber-600 transition-colors"
              aria-label="Próximo"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {filteredRestaurants.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-10 sm:p-14 text-center">
              <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-5">
                <Store className="w-8 h-8 text-stone-400" />
              </div>
              <h3 className="text-xl font-semibold text-stone-900 mb-2">
                {searchTerm ? 'Nenhum restaurante encontrado' : 'Nenhum restaurante disponível'}
              </h3>
              <p className="text-stone-500 text-sm max-w-sm mx-auto">
                {searchTerm ? 'Tente outros termos na busca.' : 'Em breve teremos opções por aqui.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRestaurants.map((restaurant) => (
                <button
                  type="button"
                  key={restaurant.id}
                  onClick={() => handleRestaurantClick(restaurant.id)}
                  className="w-full text-left bg-white rounded-2xl border border-stone-100 shadow-sm hover:shadow-md hover:border-amber-200/60 transition-all duration-200 overflow-hidden group focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:ring-offset-2 focus:ring-offset-stone-50"
                >
                  <div className="p-4 sm:p-5 flex items-start gap-4">
                    <div
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center text-white font-bold text-xl sm:text-2xl shrink-0 shadow-md ring-2 ring-white"
                      style={{ backgroundColor: restaurant.theme?.primaryColor || '#d97706' }}
                    >
                      {restaurant.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-stone-900 text-lg group-hover:text-amber-700 transition-colors mb-1">
                        {restaurant.name}
                      </h3>
                      <p className="text-stone-500 text-sm flex flex-wrap items-center gap-x-3 gap-y-0.5 mb-2">
                        <span className="inline-flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          4,5
                        </span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-stone-400" />
                          25–35 min
                        </span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1">
                          <Truck className="w-3.5 h-3.5 text-stone-400" />
                          R$ 3,50
                        </span>
                      </p>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700">
                          Aberto
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-700">
                          Entrega rápida
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium bg-orange-50 text-orange-700">
                          10% OFF
                        </span>
                      </div>
                      <p className="text-stone-500 text-xs flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-stone-400" />
                        {restaurant.address}
                      </p>
                      <p className="text-stone-500 text-xs flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3.5 h-3.5 shrink-0 text-stone-400" />
                        {restaurant.phone}
                      </p>
                    </div>
                    <div className="shrink-0 w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 group-hover:bg-amber-50 group-hover:text-amber-600 transition-colors">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <AIRestaurantChat />
    </div>
  );
}

