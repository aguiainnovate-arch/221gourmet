import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Store,
  MapPin,
  ChevronDown,
  LayoutGrid,
  Pizza,
  Sandwich,
  Leaf,
  Users,
  Search,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getRestaurants } from '../services/restaurantService';
import {
  getAllRestaurantPermissionsMap,
  resolveRestaurantPermissions,
} from '../services/permissionService';
import { fetchFeaturedProductImages, getDefaultFoodImages } from '../services/foodImageService';
import type { FoodImage } from '../services/foodImageService';
import type { Restaurant } from '../types/restaurant';
import type { PermissionKey } from '../types/permission';
import AIRestaurantChat from '../components/AIRestaurantChat';
import LanguageSelector from '../components/LanguageSelector';
import { useDeliveryAuth } from '../contexts/DeliveryAuthContext';
import DeliveryProfileMenu, { DeliveryProfileLoginButton } from '../components/delivery/DeliveryProfileMenu';
import DeliveryLocationModal from '../components/delivery/DeliveryLocationModal';
import DeliveryBottomNav, { type DeliveryNavTab } from '../components/delivery/DeliveryBottomNav';
import DeliveryRestaurantCard from '../components/delivery/DeliveryRestaurantCard';
import { useDeliveryBottomNav } from '../hooks/useDeliveryBottomNav';
import {
  getDeliveryLocation,
  setDeliveryLocation,
  hasSavedDeliveryLocation,
  type DeliveryLocation,
} from '../utils/deliveryLocationStorage';
import {
  getFavoriteRestaurantIds,
  toggleFavoriteRestaurantId,
} from '../utils/deliveryFavoritesStorage';
import { hasRestaurantPlatformAccess } from '../utils/partnershipAccess';
import { restaurantMatchesRegion } from '../utils/restaurantRegion';
import {
  detectDeliveryLocationFromGps,
  enrichDeliveryLocationCoords,
} from '../services/geocodingService';
import { withTimeout } from '../utils/withTimeout';

const FALLBACK_COVERS = getDefaultFoodImages();
const RESTAURANTS_FETCH_MS = 12_000;
const PERMISSIONS_FETCH_MS = 8_000;

function buildCoverMap(images: FoodImage[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const img of images) {
    if (img.restaurantId && !map.has(img.restaurantId)) {
      map.set(img.restaurantId, img.url);
    }
  }
  return map;
}

export default function Delivery() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const carouselRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScrollRef = useRef(false);
  const scrollDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { user, logout, updateUser } = useDeliveryAuth();
  const [userLocation, setUserLocation] = useState<DeliveryLocation>(() => getDeliveryLocation());
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [featuredImages, setFeaturedImages] = useState<FoodImage[]>(FALLBACK_COVERS);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => getFavoriteRestaurantIds());
  const [navTab, setNavTab] = useState<DeliveryNavTab>(() => {
    const fromState = (location.state as { navTab?: DeliveryNavTab } | null)?.navTab;
    return fromState === 'favorites' ? 'favorites' : 'discover';
  });
  const handleBottomNav = useDeliveryBottomNav(navTab);
  const [carouselIndex, setCarouselIndex] = useState(0);

  useEffect(() => {
    document.title = 'Bora Comer!';
  }, []);

  const CAROUSEL_ITEM_WIDTH = 280;
  const CAROUSEL_GAP = 16;
  const CAROUSEL_STEP = CAROUSEL_ITEM_WIDTH + CAROUSEL_GAP;
  const AUTO_ADVANCE_MS = 2000;

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

  useEffect(() => {
    const fromState = (location.state as { navTab?: DeliveryNavTab } | null)?.navTab;
    if (fromState === 'favorites') setNavTab('favorites');
  }, [location.state]);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      // GPS não pode bloquear a lista: no TestFlight o timeout + reverse geocode
      // facilmente somam vários segundos antes de qualquer restaurante aparecer.
      if (!hasSavedDeliveryLocation()) {
        void detectDeliveryLocationFromGps().then((gps) => {
          if (!cancelled && gps) {
            setUserLocation(gps);
            setDeliveryLocation(gps);
          }
        });
      }

      const allowed = cancelled ? [] : await loadRestaurants();
      if (cancelled) return;

      // Reusa a lista já filtrada — evita 2ª leitura de restaurants + N permissions + produtos.
      const imgs = await fetchFeaturedProductImages(allowed);
      if (!cancelled && imgs.length > 0) setFeaturedImages(imgs);
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const coverByRestaurant = useMemo(() => buildCoverMap(featuredImages), [featuredImages]);

  const loadRestaurants = async (): Promise<Restaurant[]> => {
    try {
      setLoading(true);
      setLoadError(null);

      const data = await withTimeout(
        getRestaurants(),
        RESTAURANTS_FETCH_MS,
        'getRestaurants'
      );

      let permissionsByRestaurant = new Map<string, Record<PermissionKey, boolean>>();
      try {
        permissionsByRestaurant = await withTimeout(
          getAllRestaurantPermissionsMap(),
          PERMISSIONS_FETCH_MS,
          'getAllRestaurantPermissionsMap'
        );
      } catch (permErr) {
        // Não bloqueia a home: DEFAULT_PERMISSIONS.delivery = true
        console.warn('Permissões indisponíveis; usando defaults.', permErr);
      }

      const allowedRestaurants = data.filter((restaurant) => {
        if (!restaurant.active || !hasRestaurantPlatformAccess(restaurant)) return false;
        const permissions = resolveRestaurantPermissions(
          restaurant.id,
          permissionsByRestaurant
        );
        const isEnabledByRestaurant = restaurant.deliverySettings?.enabled ?? true;
        return permissions.delivery && isEnabledByRestaurant;
      });
      setRestaurants(allowedRestaurants);
      return allowedRestaurants;
    } catch (error) {
      console.error('Erro ao carregar restaurantes:', error);
      setLoadError(t('delivery.loadRestaurantsError'));
      setRestaurants([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const restaurantsInRegion = useMemo(
    () => restaurants.filter((restaurant) => restaurantMatchesRegion(restaurant, userLocation)),
    [restaurants, userLocation]
  );

  const featuredInRegion = useMemo(() => {
    const ids = new Set(restaurantsInRegion.map((restaurant) => restaurant.id));
    const fromRegion = featuredImages.filter(
      (img) => img.restaurantId && ids.has(img.restaurantId)
    );
    if (fromRegion.length >= 2) return fromRegion;
    if (fromRegion.length === 1) return [...fromRegion, ...FALLBACK_COVERS].slice(0, 8);
    return FALLBACK_COVERS;
  }, [featuredImages, restaurantsInRegion]);

  const totalSlides = featuredInRegion.length;

  useEffect(() => {
    setCarouselIndex((prev) => (totalSlides <= 1 ? 0 : Math.min(prev, totalSlides - 1)));
  }, [totalSlides]);

  useEffect(() => {
    if (loading || totalSlides <= 1) return;
    const id = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % totalSlides);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [loading, totalSlides]);

  useEffect(() => {
    if (loading || !carouselRef.current) return;
    isProgrammaticScrollRef.current = true;
    const left = carouselIndex * CAROUSEL_STEP;
    carouselRef.current.scrollTo({ left, behavior: 'smooth' });
    const timer = setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, 600);
    return () => clearTimeout(timer);
  }, [carouselIndex, loading, CAROUSEL_STEP]);

  const filteredRestaurants = useMemo(() => {
    return restaurantsInRegion.filter((restaurant) => {
      if (navTab === 'favorites' && !favoriteIds.includes(restaurant.id)) return false;

      const term = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !term ||
        restaurant.name.toLowerCase().includes(term) ||
        restaurant.address.toLowerCase().includes(term);

      if (!matchesSearch) return false;

      switch (selectedCategory) {
        case 'pizza':
        case 'lanches':
        case 'saudavel':
          return true;
        default:
          return true;
      }
    });
  }, [restaurantsInRegion, searchTerm, selectedCategory, navTab, favoriteIds]);

  const handleSaveLocation = (loc: DeliveryLocation) => {
    setUserLocation(loc);
    setDeliveryLocation(loc);
    void enrichDeliveryLocationCoords(loc).then((enriched) => {
      if (enriched.lat === loc.lat && enriched.lng === loc.lng) return;
      setUserLocation(enriched);
      setDeliveryLocation(enriched);
    });
  };

  const categories = [
    { id: 'todos', label: t('delivery.categoryAll'), icon: LayoutGrid },
    { id: 'pizza', label: t('delivery.categoryPizza'), icon: Pizza },
    { id: 'lanches', label: t('delivery.categorySandwiches'), icon: Sandwich },
    { id: 'saudavel', label: t('delivery.categoryHealthy'), icon: Leaf },
  ];

  const handleRestaurantClick = (restaurantId: string) => {
    navigate(`/delivery/${restaurantId}`);
  };

  const handleToggleFavorite = useCallback((restaurantId: string) => {
    setFavoriteIds(toggleFavoriteRestaurantId(restaurantId));
  }, []);

  const handleNavChange = (tab: DeliveryNavTab) => {
    if (tab === 'orders' || tab === 'discover') {
      handleBottomNav(tab);
      if (tab === 'discover') setNavTab('discover');
      return;
    }
    setNavTab(tab);
    handleBottomNav(tab);
  };

  const getCoverUrl = (restaurant: Restaurant, index: number): string | undefined => {
    return coverByRestaurant.get(restaurant.id) ?? FALLBACK_COVERS[index % FALLBACK_COVERS.length]?.url;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center font-sans px-4" style={{ backgroundColor: '#FFF8F2' }}>
        <img
          src="/BoraComerlogo.png"
          alt="Bora Comer"
          className="h-20 w-auto max-w-[280px] object-contain mb-6"
          onError={(e) => {
            const target = e.currentTarget;
            if (!target.dataset.fallback) {
              target.dataset.fallback = '1';
              target.src = '/logoDelivery.jpeg';
            }
          }}
        />
        <div className="relative w-12 h-12 mx-auto mb-4">
          <div className="absolute inset-0 rounded-2xl border-2 border-[#E9D7C4] animate-spin" style={{ borderTopColor: '#E91120' }} />
        </div>
        <p className="font-medium text-sm" style={{ color: '#6B5A54' }}>{t('delivery.loadingRestaurants')}</p>
      </div>
    );
  }

  const hasSearch = searchTerm.trim().length > 0;
  const hasRegionResults = restaurantsInRegion.length > 0;

  const boraComerLogo = (
    <img
      src="/BoraComerlogo.png"
      alt="Bora Comer - Pediu, chegou!"
      className="w-[min(100%,26rem)] h-auto max-h-[8.25rem] sm:max-h-[9rem] object-contain object-center mx-auto block"
      width={416}
      height={107}
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
  );

  return (
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
      {/* Header */}
      <header
        className="shrink-0 border-b"
        style={{
          backgroundColor: '#FFF8F2',
          borderColor: '#E9D7C4',
          paddingTop: 'max(0.5rem, env(safe-area-inset-top))',
        }}
      >
        <div className="w-full px-4 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <LanguageSelector className="shrink-0" />
            <div className="flex items-center gap-2 shrink-0">
              {user ? (
                <DeliveryProfileMenu
                  user={user}
                  onUpdateUser={updateUser}
                  onLogout={logout}
                />
              ) : (
                <DeliveryProfileLoginButton />
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo scrollável */}
      <div
        className="flex-1 overflow-y-auto scrollbar-hide w-full"
        style={{
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorX: 'none',
          touchAction: 'pan-y',
        }}
      >
        <div className="px-4 pt-0 pb-4 max-w-lg mx-auto w-full">
          {/* Logo — ocupa o espaço em branco sem empurrar o carrossel */}
          <div className="flex justify-center items-center leading-none -mb-1 -mt-0.5 min-h-[5.5rem] sm:min-h-[6rem]">
            {boraComerLogo}
          </div>

          {/* Carrossel de destaques — acima dos tipos */}
          {navTab !== 'favorites' && (
            <div className="relative -mt-0.5 -mx-4 w-[calc(100%+2rem)]">
              <div
                ref={carouselRef}
                onScroll={handleCarouselScroll}
                className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-1 scrollbar-hide pl-4 pr-4"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', touchAction: 'pan-x' }}
                role="region"
                aria-label={t('delivery.highlightsOfTheDay')}
              >
                {featuredInRegion.map((img, i) => {
                  const isClickable = !!(img.productId && img.restaurantId);
                  const handleClick = () => {
                    if (!isClickable) return;
                    navigate(`/delivery/${img.restaurantId}`, {
                      state: { openProductId: img.productId },
                    });
                  };
                  const priceLabel =
                    typeof img.price === 'number'
                      ? new Intl.NumberFormat(
                          i18n.language.startsWith('pt') ? 'pt-BR' : 'en-US',
                          { style: 'currency', currency: 'BRL' }
                        ).format(img.price)
                      : null;
                  return (
                    <div
                      key={`${i}-${img.url}`}
                      role={isClickable ? 'button' : undefined}
                      tabIndex={isClickable ? 0 : undefined}
                      onClick={handleClick}
                      onKeyDown={(e) => {
                        if (!isClickable) return;
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleClick();
                        }
                      }}
                      aria-label={
                        isClickable
                          ? t('delivery.openProduct', {
                              name: img.productName ?? img.alt,
                              defaultValue: `Abrir ${img.productName ?? img.alt}`,
                            })
                          : undefined
                      }
                      className={`relative shrink-0 rounded-2xl overflow-hidden snap-center shadow-md border border-[#E9D7C4] ${
                        isClickable
                          ? 'cursor-pointer transition-transform active:scale-[0.98] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#E91120]/60'
                          : ''
                      }`}
                      style={{
                        width: 'calc(75vw)',
                        maxWidth: '280px',
                        height: '160px',
                        backgroundColor: '#FAF0DB',
                      }}
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
                      <div
                        className="absolute inset-0 hidden flex-col items-center justify-center text-sm"
                        style={{ backgroundColor: '#FAF0DB', color: '#6B5A54' }}
                        aria-hidden
                      >
                        <span>{img.alt}</span>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent pointer-events-none" />
                      {isClickable && (
                        <div className="absolute inset-x-0 bottom-0 p-3 text-white pointer-events-none">
                          <div className="flex items-end justify-between gap-2">
                            <p className="font-semibold text-sm leading-tight line-clamp-2 drop-shadow">
                              {img.productName ?? img.alt}
                            </p>
                            {priceLabel && (
                              <span
                                className="shrink-0 text-xs font-bold px-2 py-1 rounded-full text-white tabular-nums shadow"
                                style={{ backgroundColor: '#E91120' }}
                              >
                                {priceLabel}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Categorias */}
          {navTab !== 'favorites' && (
            <div className="mt-3 -mx-4 px-4 overflow-x-auto scrollbar-hide">
              <div className="flex gap-2 min-w-max pb-1">
                {categories.map((cat) => {
                  const active = selectedCategory === cat.id;
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all shrink-0 ${
                        active ? 'text-white shadow-md' : 'border'
                      }`}
                      style={
                        active
                          ? { backgroundColor: '#E91120' }
                          : { backgroundColor: '#FAF0DB', borderColor: '#E9D7C4', color: '#2A1E1A' }
                      }
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {cat.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  className="inline-flex items-center gap-1 px-3.5 py-2 rounded-full text-xs font-bold border shrink-0"
                  style={{ backgroundColor: '#FAF0DB', borderColor: '#E9D7C4', color: '#2A1E1A' }}
                >
                  {t('delivery.categoryMore')}
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Busca + localização */}
          {navTab !== 'favorites' && (
            <div className="mt-3 flex items-stretch gap-2">
              <div
                className="relative flex flex-1 min-w-0 items-center rounded-2xl border min-h-[48px] overflow-hidden shadow-sm"
                style={{ backgroundColor: '#FFFFFF', borderColor: '#E9D7C4' }}
              >
                <Search className="absolute left-3.5 w-[18px] h-[18px] pointer-events-none" style={{ color: '#6B5A54' }} />
                <input
                  type="search"
                  placeholder={t('delivery.searchInputPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full min-h-[48px] pl-10 pr-3 py-2.5 text-sm border-0 bg-transparent focus:outline-none placeholder:text-[#6B5A54]"
                  style={{ color: '#2A1E1A', caretColor: '#E91120' }}
                />
              </div>
              <button
                type="button"
                onClick={() => setLocationModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-2 rounded-2xl border text-[11px] font-bold max-w-[42%] truncate active:scale-[0.98] shrink-0 shadow-sm min-h-[48px]"
                style={{ backgroundColor: '#FFFFFF', borderColor: '#E91120', color: '#E91120' }}
                title={t('delivery.changeLocation')}
              >
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{userLocation.label}</span>
                <ChevronDown className="w-3 h-3 shrink-0 opacity-70" />
              </button>
            </div>
          )}

          {/* Contador */}
          <div className="flex items-center gap-1.5 mt-3 mb-4">
            <Users className="w-4 h-4" style={{ color: '#6B5A54' }} />
            <span className="text-xs font-semibold" style={{ color: '#6B5A54' }}>
              {t('delivery.establishmentsFound', { count: filteredRestaurants.length })}
            </span>
          </div>

          {/* Lista */}
          {filteredRestaurants.length === 0 ? (
            <div className="rounded-3xl border shadow-sm p-10 text-center" style={{ backgroundColor: '#FAF0DB', borderColor: '#E9D7C4' }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ backgroundColor: '#E9D7C4' }}>
                <Store className="w-8 h-8" style={{ color: '#6B5A54' }} />
              </div>
              <h3 className="text-lg font-bold mb-2" style={{ color: '#2A1E1A' }}>
                {loadError
                  ? t('delivery.loadRestaurantsErrorTitle')
                  : navTab === 'favorites'
                    ? t('delivery.noFavoritesYet')
                    : hasSearch
                      ? t('delivery.noRestaurantsFound')
                      : hasRegionResults
                        ? t('delivery.noRestaurantsAvailable')
                        : t('delivery.noRestaurantsInRegion')}
              </h3>
              <p className="text-sm max-w-sm mx-auto" style={{ color: '#6B5A54' }}>
                {loadError
                  ? loadError
                  : navTab === 'favorites'
                    ? t('delivery.noFavoritesHint')
                    : hasSearch
                      ? t('delivery.tryOtherTerms')
                      : hasRegionResults
                        ? t('delivery.comingSoon')
                        : t('delivery.noRestaurantsInRegionHint')}
              </p>
              {loadError && (
                <button
                  type="button"
                  onClick={loadRestaurants}
                  className="mt-4 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                  style={{ backgroundColor: '#E91120' }}
                >
                  {t('delivery.retryLoadRestaurants')}
                </button>
              )}
              {!loadError && !hasSearch && navTab !== 'favorites' && !hasRegionResults && (
                <button
                  type="button"
                  onClick={() => setLocationModalOpen(true)}
                  className="mt-4 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                  style={{ backgroundColor: '#E91120' }}
                >
                  {t('delivery.changeLocation')}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3.5 pb-28">
              {filteredRestaurants.map((restaurant, index) => (
                <DeliveryRestaurantCard
                  key={restaurant.id}
                  restaurant={restaurant}
                  coverUrl={getCoverUrl(restaurant, index)}
                  isFavorite={favoriteIds.includes(restaurant.id)}
                  onToggleFavorite={() => handleToggleFavorite(restaurant.id)}
                  onClick={() => handleRestaurantClick(restaurant.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <DeliveryBottomNav active={navTab} onChange={handleNavChange} />

      <AIRestaurantChat
        fabBottom="calc(5.25rem + env(safe-area-inset-bottom, 0px))"
        userLocation={userLocation}
      />

      <DeliveryLocationModal
        open={locationModalOpen}
        current={userLocation}
        onClose={() => setLocationModalOpen(false)}
        onSave={handleSaveLocation}
      />
    </div>
  );
}
