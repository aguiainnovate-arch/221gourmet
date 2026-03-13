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
      <div className="min-h-screen flex items-center justify-center font-sans" style={{ backgroundColor: '#FFF8F2' }}>
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-5">
            <div className="absolute inset-0 rounded-2xl animate-pulse" style={{ backgroundColor: 'rgba(233,17,32,0.15)' }} />
            <div className="absolute inset-0 rounded-2xl border-2 border-[#E9D7C4] animate-spin" style={{ borderTopColor: '#E91120' }} />
            <Utensils className="absolute inset-0 m-auto w-7 h-7" style={{ color: '#E91120' }} />
          </div>
          <p className="font-medium" style={{ color: '#6B5A54' }}>{t('delivery.loadingRestaurants')}</p>
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
        backgroundColor: '#FFF8F2',
        overflow: 'hidden',
        width: '100%',
        maxWidth: '100vw',
      }}
    >
      {/* ── HEADER ── apenas ações: idioma, Meus pedidos, Entrar/Criar */}
      <header
        className="shrink-0 relative shadow-sm border-b border-[#E9D7C4]"
        style={{ backgroundColor: '#FFF8F2', color: '#2A1E1A', paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
      >
        <div className="w-full px-4 sm:px-6 py-2.5">
          <div className="flex items-center justify-between gap-2 min-h-0">
            <div className="flex items-center shrink-0">
              <LanguageSelector className="shrink-0" />
            </div>
            <div className="flex items-center gap-2 shrink-0 min-w-0">
            <Link
              to={user ? '/delivery/orders' : '/delivery/auth?redirect=/delivery/orders'}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl border transition-colors shrink-0"
              style={{ backgroundColor: '#FAF0DB', borderColor: '#E9D7C4', color: '#2A1E1A' }}
              title={t('delivery.myOrders')}
            >
              <Receipt className="w-4 h-4 shrink-0" />
              <span className="font-medium text-xs hidden sm:inline">{t('delivery.myOrders')}</span>
            </Link>
            {user ? (
              <>
                <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl border min-w-0" style={{ backgroundColor: '#FAF0DB', borderColor: '#E9D7C4', color: '#2A1E1A' }}>
                  <User className="w-4 h-4 shrink-0" />
                  <span className="font-medium text-xs max-w-[80px] truncate">{user.name}</span>
                </div>
                <button
                  onClick={logout}
                  className="p-2 rounded-xl border transition-colors shrink-0"
                  style={{ backgroundColor: '#FAF0DB', borderColor: '#E9D7C4', color: '#2A1E1A' }}
                  title={t('delivery.logout')}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <Link
                to="/delivery/auth"
                className="flex items-center gap-1.5 text-white px-3 py-2 rounded-xl font-semibold text-xs transition-all shadow-md shrink-0 hover:opacity-90"
                style={{ backgroundColor: '#E91120' }}
              >
                <User className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">{t('delivery.signIn')}</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── ÁREA SCROLLÁVEL ── logo + busca rolam; categorias ficam sticky abaixo do header; só os cards rolam por baixo */}
      <div
        className="flex-1 overflow-y-auto scrollbar-hide w-full pb-24"
        style={{
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorX: 'none',
          touchAction: 'pan-y',
        }}
      >
        {/* ── LOGO ── rola com o scroll */}
        <div className="shrink-0 flex justify-center items-start pt-0 pb-0 px-2 -mb-1">
          <img
            src="/BoraComerlogo.png"
            alt="Bora Comer - Pediu, chegou!"
            className="h-[14.4rem] sm:h-[17.28rem] w-auto max-w-[720px] sm:max-w-[1008px] object-contain object-center"
            width={734}
            height={188}
            loading="eager"
            decoding="async"
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.dataset.fallback) {
                target.dataset.fallback = '1';
                target.src = '/logoDelivery.jpeg';
                target.alt = 'Bora Comer Delivery';
              }
            }}
          />
        </div>

        {/* ── BUSCA ── rola com o scroll */}
        <div className="shrink-0 px-4 pt-0 pb-1 w-full -mt-[10px]">
          <div className="mx-auto w-full max-w-[416px] relative flex items-center rounded-xl border min-h-[60px] overflow-hidden" style={{ backgroundColor: '#FAF0DB', borderColor: '#E9D7C4' }}>
            <span className="absolute left-4 flex items-center justify-center pointer-events-none" style={{ color: '#6B5A54' }} aria-hidden>
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </span>
            <input
              type="text"
              name="text"
              placeholder={t('delivery.searchInputPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full min-h-[60px] pl-12 pr-12 py-3 text-base border-0 bg-transparent focus:outline-none focus:ring-0 placeholder:text-[#6B5A54]"
              style={{ color: '#2A1E1A', caretColor: '#E91120' }}
            />
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              title={t('delivery.filters')}
              aria-label={t('delivery.filters')}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-lg transition-colors hover:opacity-80"
              style={{ color: '#6B5A54' }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8.16 6.65H15.83C16.47 6.65 16.99 7.17 16.99 7.81V9.09C16.99 9.56 16.7 10.14 16.41 10.43L13.91 12.64C13.56 12.93 13.33 13.51 13.33 13.98V16.48C13.33 16.83 13.1 17.29 12.81 17.47L12 17.98C11.24 18.45 10.2 17.92 10.2 16.99V13.91C10.2 13.5 9.97 12.98 9.73 12.69L7.52 10.36C7.23 10.08 7 9.55 7 9.2V7.87C7 7.17 7.52 6.65 8.16 6.65Z" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── CATEGORIAS + CONTADOR ── sticky: ao rolar, gruda logo abaixo do header; só os cards rolam por baixo */}
        <div
          className="sticky top-0 z-10 w-full pt-3 pb-2 -mb-2"
          style={{ backgroundColor: '#FFF8F2' }}
        >
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full px-4">
            <h2 className="text-base font-bold shrink-0" style={{ color: '#2A1E1A' }}>
              {searchTerm ? t('delivery.searchResults') : t('delivery.nearbyRestaurants')}
            </h2>
            <div className="flex items-center gap-1.5 flex-wrap">
              {categories.map((cat) => {
                const active = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 ${active ? 'text-white shadow-md' : 'border'}`}
                    style={active ? { backgroundColor: '#E91120' } : { backgroundColor: '#FAF0DB', borderColor: '#E9D7C4', color: '#2A1E1A' }}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
            <span className="text-xs font-medium tabular-nums ml-auto shrink-0" style={{ color: '#6B5A54' }}>
              {filteredRestaurants.length}{' '}
              {filteredRestaurants.length === 1
                ? t('delivery.restaurantSingular')
                : t('delivery.restaurantPlural')}
            </span>
          </div>
        </div>
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
                className="relative shrink-0 rounded-2xl overflow-hidden snap-center shadow-lg border border-[#E9D7C4]"
                style={{ width: 'calc(75vw)', maxWidth: '280px', height: '160px', backgroundColor: '#FAF0DB' }}
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
                <div className="absolute inset-0 hidden flex-col items-center justify-center text-sm" style={{ backgroundColor: '#FAF0DB', color: '#6B5A54' }} aria-hidden>
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
          <div className="rounded-2xl border shadow-sm p-10 text-center" style={{ backgroundColor: '#FAF0DB', borderColor: '#E9D7C4' }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ backgroundColor: '#E9D7C4' }}>
              <Store className="w-8 h-8" style={{ color: '#6B5A54' }} />
            </div>
            <h3 className="text-xl font-semibold mb-2" style={{ color: '#2A1E1A' }}>
              {searchTerm ? t('delivery.noRestaurantsFound') : t('delivery.noRestaurantsAvailable')}
            </h3>
            <p className="text-sm max-w-sm mx-auto" style={{ color: '#6B5A54' }}>
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
                className="w-full text-left rounded-2xl border shadow-sm transition-all duration-200 overflow-hidden group focus:outline-none hover:border-[#E91120]/60"
                style={{ backgroundColor: '#FAF0DB', borderColor: '#E9D7C4' }}
              >
                <div className="p-4 flex items-start gap-3">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-xl shrink-0 shadow-md ring-2 ring-white/20"
                    style={{ backgroundColor: restaurant.theme?.primaryColor || '#E91120' }}
                  >
                    {restaurant.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base mb-0.5 truncate" style={{ color: '#2A1E1A' }}>
                      {restaurant.name}
                    </h3>
                    <p className="text-xs flex flex-wrap items-center gap-x-2 gap-y-0 mb-2" style={{ color: '#6B5A54' }}>
                      <span className="inline-flex items-center gap-0.5">
                        <Star className="w-3 h-3 text-[#F9CF4A] fill-[#F9CF4A]" />
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
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium text-white" style={{ backgroundColor: '#E91120' }}>
                        {t('delivery.open')}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium" style={{ backgroundColor: 'rgba(249,207,74,0.3)', color: '#2A1E1A' }}>
                        {t('delivery.fastDelivery')}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium" style={{ backgroundColor: '#F9CF4A', color: '#2A1E1A' }}>
                        10% OFF
                      </span>
                    </div>
                    <p className="text-xs flex items-center gap-1 truncate" style={{ color: '#6B5A54' }}>
                      <MapPin className="w-3 h-3 shrink-0" />
                      {restaurant.address}
                    </p>
                    <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: '#6B5A54' }}>
                      <Phone className="w-3 h-3 shrink-0" />
                      {restaurant.phone}
                    </p>
                  </div>
                  <div className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors group-hover:bg-[#E91120]/15" style={{ backgroundColor: '#E9D7C4', color: '#6B5A54' }}>
                    <ChevronRight className="w-4 h-4 group-hover:opacity-80" style={{ color: '#E91120' }} />
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

