import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Store, MapPin, Phone, ChevronRight, Utensils, User, LogOut, Clock, Truck, Star, Receipt } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getRestaurants } from '../services/restaurantService';
import { getRestaurantPermissions } from '../services/permissionService';
import { fetchFeaturedFoodImages, getDefaultFoodImages } from '../services/foodImageService';
import type { Restaurant } from '../types/restaurant';
import AIRestaurantChat from '../components/AIRestaurantChat';
import LanguageSelector from '../components/LanguageSelector';
import { useDeliveryAuth } from '../contexts/DeliveryAuthContext';

export default function Delivery() {
  const { t } = useTranslation();
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
    { id: 'todos', label: t('delivery.categoryAll') },
    { id: 'pizza', label: t('delivery.categoryPizza') },
    { id: 'lanches', label: t('delivery.categorySandwiches') },
    { id: 'saudavel', label: t('delivery.categoryHealthy') },
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
          <p className="text-stone-600 font-medium">{t('delivery.loadingRestaurants')}</p>
        </div>
      </div>
    );
  }

  return (
    /*
     * CANVAS FIXO — estrutura de app nativo:
     * • Root ocupa 100% da viewport sem overflow
     * • Header + Busca + Categorias: fixos (não rolam)
     * • Área de conteúdo: único elemento com scroll vertical
     * • Chat FAB: ancorado na viewport via position fixed
     */
    <div
      className="font-sans flex flex-col scrollbar-hide"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'linear-gradient(180deg, #050A1A 0%, #0B1630 50%, #0A2A5E 100%)',
        overflow: 'hidden',
        width: '100%',
        maxWidth: '100vw',
      }}
    >
      {/* ── HEADER ── apenas ações: idioma, Meus pedidos, Entrar/Criar */}
      <header
        className="shrink-0 relative bg-gradient-to-br from-[#050A1A] via-[#0B1630] to-[#0A2A5E] text-[#EAF2FF] shadow-lg border-b border-[#1B2A4A]"
        style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
      >
        <div className="w-full px-4 sm:px-6 py-2.5">
          <div className="flex items-center justify-between gap-2 min-h-0">
            <div className="flex items-center shrink-0">
              <LanguageSelector className="shrink-0" />
            </div>
            <div className="flex items-center gap-2 shrink-0 min-w-0">
            <Link
              to={user ? '/delivery/orders' : '/delivery/auth?redirect=/delivery/orders'}
              className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-2.5 py-2 rounded-xl border border-white/20 transition-colors shrink-0"
              title={t('delivery.myOrders')}
            >
              <Receipt className="w-4 h-4 shrink-0" />
              <span className="font-medium text-xs hidden sm:inline">{t('delivery.myOrders')}</span>
            </Link>
            {user ? (
              <>
                <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-2.5 py-2 rounded-xl border border-white/20 min-w-0">
                  <User className="w-4 h-4 shrink-0" />
                  <span className="font-medium text-xs max-w-[80px] truncate">{user.name}</span>
                </div>
                <button
                  onClick={logout}
                  className="p-2 rounded-xl bg-white/20 border border-white/20 transition-colors shrink-0"
                  title={t('delivery.logout')}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <Link
                to="/delivery/auth"
                className="flex items-center gap-1.5 bg-white/25 text-white border border-white/40 px-3 py-2 rounded-xl font-semibold text-xs transition-all shadow-md shrink-0"
              >
                <User className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">{t('delivery.signIn')}</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── LOGO ── abaixo da header, acima da searchbar */}
      <div className="shrink-0 flex justify-center items-center pt-0 pb-0 px-2">
        <img
          src={`/${encodeURI('Sem fundo.png')}`}
          alt="Noctis Food - delivery rápido noturno"
          className="h-[6.49rem] sm:h-[7.41rem] w-auto max-w-[334px] sm:max-w-[407px] object-contain object-center"
          width={392}
          height={101}
          loading="eager"
          decoding="async"
          onError={(e) => {
            const target = e.currentTarget;
            if (!target.dataset.fallback) {
              target.dataset.fallback = '1';
              target.src = '/logoDelivery.jpeg';
              target.alt = 'Noctis Delivery';
            }
          }}
        />
      </div>

      {/* ── BUSCA ── abaixo da logo (neon/glass) */}
      <div className="shrink-0 px-4 pt-2 pb-1 relative z-10 w-full overflow-hidden">
        <div id="poda" className="delivery-searchbar flex items-center justify-center overflow-hidden rounded-2xl w-full">
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
                placeholder={t('delivery.searchInputPlaceholder')}
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
                title={t('delivery.filters')}
                aria-label={t('delivery.filters')}
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

      {/* ── CATEGORIAS + CONTADOR ── fixos, ocupam toda a largura */}
      <div className="shrink-0 w-full pt-3 pb-2">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full px-4">
          <h2 className="text-base font-bold text-[#EAF2FF] shrink-0">
            {searchTerm ? t('delivery.searchResults') : t('delivery.nearbyRestaurants')}
          </h2>
          <div className="flex items-center gap-1.5 flex-wrap">
            {categories.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 ${active ? 'bg-[#2F7BFF] text-white shadow-md' : 'bg-[#0B1630] text-[#A9B8D6] border border-[#1B2A4A]'}`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
          <span className="text-xs font-medium text-[#A9B8D6] tabular-nums ml-auto shrink-0">
            {filteredRestaurants.length}{' '}
            {filteredRestaurants.length === 1
              ? t('delivery.restaurantSingular')
              : t('delivery.restaurantPlural')}
          </span>
        </div>
      </div>

      {/* ── ÁREA SCROLLÁVEL ── ocupa toda a largura */}
      <div
        className="flex-1 overflow-y-auto scrollbar-hide w-full pb-24"
        style={{
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorX: 'none',
          touchAction: 'pan-y',
        }}
      >
        {/* Carrossel de destaques — full width, padding só nas laterais do scroll */}
        <div className="relative mb-6 mt-2 w-full">
          <div
            ref={carouselRef}
            onScroll={handleCarouselScroll}
            className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 scrollbar-hide w-full pl-4 pr-4"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', touchAction: 'pan-x' }}
            role="region"
            aria-label={t('delivery.highlightsOfTheDay')}
          >
            {featuredImages.map((img, i) => (
              <div
                key={`${i}-${img.url}`}
                className="relative shrink-0 rounded-2xl overflow-hidden snap-center shadow-lg bg-stone-100"
                style={{ width: 'calc(75vw)', maxWidth: '280px', height: '160px' }}
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
        </div>

        {/* Lista de restaurantes */}
        <div className="w-full px-4">
        {filteredRestaurants.length === 0 ? (
          <div className="bg-[#0B1630] rounded-2xl border border-[#1B2A4A] shadow-sm p-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#050A1A] flex items-center justify-center mx-auto mb-5">
              <Store className="w-8 h-8 text-[#A9B8D6]" />
            </div>
            <h3 className="text-xl font-semibold text-[#EAF2FF] mb-2">
              {searchTerm ? t('delivery.noRestaurantsFound') : t('delivery.noRestaurantsAvailable')}
            </h3>
            <p className="text-[#A9B8D6] text-sm max-w-sm mx-auto">
              {searchTerm ? t('delivery.tryOtherTerms') : t('delivery.comingSoon')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRestaurants.map((restaurant) => (
              <button
                type="button"
                key={restaurant.id}
                onClick={() => handleRestaurantClick(restaurant.id)}
                className="w-full text-left bg-[#0B1630] rounded-2xl border border-[#1B2A4A] shadow-sm hover:border-[#2F7BFF]/50 transition-all duration-200 overflow-hidden group focus:outline-none"
              >
                <div className="p-4 flex items-start gap-3">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-xl shrink-0 shadow-md ring-2 ring-white/20"
                    style={{ backgroundColor: restaurant.theme?.primaryColor || '#d97706' }}
                  >
                    {restaurant.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-[#EAF2FF] text-base mb-0.5 truncate">
                      {restaurant.name}
                    </h3>
                    <p className="text-[#A9B8D6] text-xs flex flex-wrap items-center gap-x-2 gap-y-0 mb-2">
                      <span className="inline-flex items-center gap-0.5">
                        <Star className="w-3 h-3 text-[#00D4FF] fill-[#00D4FF]" />
                        4,5
                      </span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-0.5">
                        <Clock className="w-3 h-3" />
                        {t('delivery.deliveryTime', { min: 25, max: 35 })}
                      </span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-0.5">
                        <Truck className="w-3 h-3" />
                        {t('delivery.deliveryFeeValue', { value: '3,50' })}
                      </span>
                    </p>
                    <div className="flex flex-wrap gap-1 mb-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-400">
                        {t('delivery.open')}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium bg-[#2F7BFF]/20 text-[#7CCBFF]">
                        {t('delivery.fastDelivery')}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium bg-[#00D4FF]/20 text-[#00D4FF]">
                        10% OFF
                      </span>
                    </div>
                    <p className="text-[#A9B8D6] text-xs flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 shrink-0" />
                      {restaurant.address}
                    </p>
                    <p className="text-[#A9B8D6] text-xs flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 shrink-0" />
                      {restaurant.phone}
                    </p>
                  </div>
                  <div className="shrink-0 w-9 h-9 rounded-full bg-[#050A1A] flex items-center justify-center text-[#A9B8D6] group-hover:bg-[#2F7BFF]/20 group-hover:text-[#2F7BFF] transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
        </div>
      </div>

      {/* ── CHAT ── ancorado na viewport, sempre visível */}
      <AIRestaurantChat />
    </div>
  );
}

