import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Store, MapPin, Phone, ChevronRight, Search, Utensils, User, LogOut, Filter, Clock, Truck, Star, Receipt } from 'lucide-react';
import { getRestaurants } from '../services/restaurantService';
import { getRestaurantPermissions } from '../services/permissionService';
import { fetchFeaturedFoodImages, getDefaultFoodImages } from '../services/foodImageService';
import type { Restaurant } from '../types/restaurant';
import AIRestaurantChat from '../components/AIRestaurantChat';
import { useDeliveryAuth } from '../contexts/DeliveryAuthContext';

export default function Delivery() {
  const navigate = useNavigate();
  const carouselRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScrollRef = useRef(false);
  const scrollDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { user, logout } = useDeliveryAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [showFilters, setShowFilters] = useState(false);
  const [featuredImages, setFeaturedImages] = useState(getDefaultFoodImages());
  const [carouselIndex, setCarouselIndex] = useState(0);

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

  const CAROUSEL_ITEM_WIDTH = 280;
  const CAROUSEL_GAP = 16;
  const CAROUSEL_STEP = CAROUSEL_ITEM_WIDTH + CAROUSEL_GAP;
  const AUTO_ADVANCE_MS = 2000;
  const totalSlides = featuredImages.length;

  // Manter índice válido quando a lista de imagens mudar (ex.: API retornou mais fotos)
  useEffect(() => {
    setCarouselIndex((prev) => (totalSlides <= 1 ? 0 : Math.min(prev, totalSlides - 1)));
  }, [totalSlides]);

  // Avançar índice do carrossel a cada 2 segundos (em loop)
  useEffect(() => {
    if (loading || totalSlides <= 1) return;
    const id = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % totalSlides);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [loading, totalSlides]);

  // Quando o índice muda (ex.: timer), rolar o carrossel até o slide – evita conflito com onScroll
  useEffect(() => {
    if (loading || !carouselRef.current) return;
    isProgrammaticScrollRef.current = true;
    const left = carouselIndex * CAROUSEL_STEP;
    carouselRef.current.scrollTo({ left, behavior: 'smooth' });
    const t = setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, 600);
    return () => clearTimeout(t);
  }, [carouselIndex, loading]);

  // Ao arrastar com o dedo: atualizar índice só depois que parar de arrastar (debounce), para não travar
  const handleCarouselScroll = () => {
    if (isProgrammaticScrollRef.current) return;
    if (scrollDebounceRef.current) clearTimeout(scrollDebounceRef.current);
    scrollDebounceRef.current = setTimeout(() => {
      scrollDebounceRef.current = null;
      const el = carouselRef.current;
      if (!el) return;
      const index = Math.round(el.scrollLeft / CAROUSEL_STEP);
      const clamped = Math.max(0, Math.min(index, totalSlides - 1));
      setCarouselIndex(clamped);
    }, 180);
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
    <div className="min-h-screen bg-noctis-background font-sans" style={{ background: 'linear-gradient(180deg, #050A1A 0%, #0B1630 50%, #0A2A5E 100%)' }}>
      {/* Header */}
      <header className="bg-gradient-to-br from-[#050A1A] via-[#0B1630] to-[#0A2A5E] text-[#EAF2FF] py-6 sm:py-7 shadow-lg border-b border-[#1B2A4A]">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center min-h-[64px] sm:min-h-[72px]">
              <img
                src="/logoDelivery.jpeg"
                alt="Noctis Delivery"
                className="h-14 sm:h-20 w-auto max-w-[480px] sm:max-w-[640px] object-contain object-left"
              />
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/delivery/orders"
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm px-3 py-2 rounded-xl border border-white/20 transition-colors"
                title="Meus pedidos"
              >
                <Receipt className="w-4 h-4" />
                <span className="font-medium text-sm hidden sm:inline">Meus pedidos</span>
              </Link>
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

      {/* Busca + Filtros - searchbar (grid + bordas animadas, CSS exato) */}
      <div className="container mx-auto px-4 mt-8 relative z-10">
        <div className="max-w-5xl mx-auto delivery-searchbar flex items-center justify-center overflow-hidden rounded-2xl p-4">
          <div id="poda">
            <div className="glow" aria-hidden />
            <div className="darkBorderBg" aria-hidden />
            <div className="darkBorderBg" aria-hidden />
            <div className="darkBorderBg" aria-hidden />
            <div className="white" aria-hidden />
            <div className="border" aria-hidden />
            <div id="main">
              <input
                type="text"
                name="text"
                className="input"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="input-mask" aria-hidden />
              <div className="pink-mask" aria-hidden />
              <div className="filterBorder" aria-hidden />
              <button
                type="button"
                id="filter-icon"
                onClick={() => setShowFilters(!showFilters)}
                title="Filtros"
                aria-label="Filtros"
              >
                <svg preserveAspectRatio="none" height="27" width="27" viewBox="4.8 4.56 14.832 15.408" fill="none">
                  <path d="M8.16 6.65002H15.83C16.47 6.65002 16.99 7.17002 16.99 7.81002V9.09002C16.99 9.56002 16.7 10.14 16.41 10.43L13.91 12.64C13.56 12.93 13.33 13.51 13.33 13.98V16.48C13.33 16.83 13.1 17.29 12.81 17.47L12 17.98C11.24 18.45 10.2 17.92 10.2 16.99V13.91C10.2 13.5 9.97 12.98 9.73 12.69L7.52 10.36C7.23 10.08 7 9.55002 7 9.20002V7.87002C7 7.17002 7.52 6.65002 8.16 6.65002Z" stroke="#d6d6e6" strokeWidth="1" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <div id="search-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" viewBox="0 0 24 24" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" height="24" fill="none" className="feather feather-search">
                  <circle stroke="url(#search)" r="8" cy="11" cx="11" />
                  <line stroke="url(#searchl)" y2="16.65" y1="22" x2="16.65" x1="22" />
                  <defs>
                    <linearGradient gradientTransform="rotate(50)" id="search">
                      <stop stopColor="#f8e7f8" offset="0%" />
                      <stop stopColor="#b6a9b7" offset="50%" />
                    </linearGradient>
                    <linearGradient id="searchl">
                      <stop stopColor="#b6a9b7" offset="0%" />
                      <stop stopColor="#837484" offset="50%" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo: título + categorias + carrossel + lista */}
      <div className="container mx-auto px-4 py-6 pb-24">
        <div className="max-w-5xl mx-auto">
          {/* Linha: Restaurantes próximos | Pizza | Lanches | Saudável | 4 restaurantes */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-5">
            <h2 className="text-lg font-bold text-noctis-textPrimary shrink-0">
              {searchTerm ? 'Resultados da busca' : 'Restaurantes próximos'}
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              {categories.map((cat) => {
                const active = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all shrink-0 ${active ? 'bg-noctis-primary text-white shadow-md' : 'bg-noctis-surface text-noctis-textSecondary border border-noctis-border hover:bg-[#0A2A5E]'}`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
            <span className="text-sm font-medium text-noctis-textSecondary tabular-nums ml-auto shrink-0">
              {filteredRestaurants.length} {filteredRestaurants.length === 1 ? 'restaurante' : 'restaurantes'}
            </span>
          </div>

          {/* Carrossel de destaques (imagens Unsplash) */}
          <div className="relative mb-8">
            <div
              ref={carouselRef}
              onScroll={handleCarouselScroll}
              className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 scrollbar-hide touch-pan-x"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              role="region"
              aria-label="Destaques do dia"
            >
              {featuredImages.map((img, i) => (
                <div
                  key={`${i}-${img.url}`}
                  className="relative shrink-0 w-[280px] h-[180px] rounded-2xl overflow-hidden snap-center shadow-lg ring-1 ring-stone-100 bg-stone-100"
                >
                  <img
                    src={img.url}
                    alt={img.alt}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.style.display = 'none';
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) {
                        fallback.classList.remove('hidden');
                        fallback.classList.add('flex');
                      }
                    }}
                  />
                  <div className="absolute inset-0 hidden flex-col items-center justify-center bg-stone-200 text-stone-500 text-sm" aria-hidden>
                    <span>{img.alt}</span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                </div>
              ))}
            </div>
            {/* Badge circular com logo no centro do carrossel */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 hidden sm:flex">
              <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-[#2F7BFF] shadow-xl flex items-center justify-center bg-[#0B1630]">
                <img src="/logoDelivery.jpeg" alt="Noctis" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>

          {filteredRestaurants.length === 0 ? (
            <div className="bg-noctis-surface rounded-2xl border border-noctis-border shadow-sm p-10 sm:p-14 text-center">
              <div className="w-16 h-16 rounded-2xl bg-noctis-background flex items-center justify-center mx-auto mb-5">
                <Store className="w-8 h-8 text-noctis-textSecondary" />
              </div>
              <h3 className="text-xl font-semibold text-noctis-textPrimary mb-2">
                {searchTerm ? 'Nenhum restaurante encontrado' : 'Nenhum restaurante disponível'}
              </h3>
              <p className="text-noctis-textSecondary text-sm max-w-sm mx-auto">
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
                  className="w-full text-left bg-noctis-surface rounded-2xl border border-noctis-border shadow-sm hover:shadow-md hover:border-noctis-primary/50 transition-all duration-200 overflow-hidden group focus:outline-none focus:ring-2 focus:ring-noctis-primary/50 focus:ring-offset-2 focus:ring-offset-noctis-background"
                >
                  <div className="p-4 sm:p-5 flex items-start gap-4">
                    <div
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center text-white font-bold text-xl sm:text-2xl shrink-0 shadow-md ring-2 ring-white"
                      style={{ backgroundColor: restaurant.theme?.primaryColor || '#d97706' }}
                    >
                      {restaurant.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-noctis-textPrimary text-lg group-hover:text-noctis-primaryGlow transition-colors mb-1">
                        {restaurant.name}
                      </h3>
                      <p className="text-noctis-textSecondary text-sm flex flex-wrap items-center gap-x-3 gap-y-0.5 mb-2">
                        <span className="inline-flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-noctis-accent fill-noctis-accent" />
                          4,5
                        </span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-noctis-textSecondary" />
                          25–35 min
                        </span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1">
                          <Truck className="w-3.5 h-3.5 text-noctis-textSecondary" />
                          R$ 3,50
                        </span>
                      </p>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-400">
                          Aberto
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium bg-noctis-primary/20 text-noctis-primaryGlow">
                          Entrega rápida
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium bg-noctis-accent/20 text-noctis-accent">
                          10% OFF
                        </span>
                      </div>
                      <p className="text-noctis-textSecondary text-xs flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-noctis-textSecondary" />
                        {restaurant.address}
                      </p>
                      <p className="text-noctis-textSecondary text-xs flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3.5 h-3.5 shrink-0 text-noctis-textSecondary" />
                        {restaurant.phone}
                      </p>
                    </div>
                    <div className="shrink-0 w-10 h-10 rounded-full bg-noctis-background flex items-center justify-center text-noctis-textSecondary group-hover:bg-noctis-primary/20 group-hover:text-noctis-primary transition-colors">
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

