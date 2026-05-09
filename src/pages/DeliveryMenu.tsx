import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { getNativeSafeAreaTop, isNativePlatform } from '../utils/capacitorUtils';
import { ArrowLeft, Plus, Minus, MapPin, Bike, Search, ChevronDown, ShoppingCart } from 'lucide-react';
import { getProducts } from '../services/productService';
import { getCategories } from '../services/categoryService';
import { getRestaurants } from '../services/restaurantService';
import { createDeliveryOrder } from '../services/deliveryService';
import { useDeliveryAuth } from '../contexts/DeliveryAuthContext';
import { saveDeliveryUser } from '../services/deliveryUserService';
import { useLiveTranslations } from '../hooks/useLiveTranslations';
import type { Product } from '../types/product';
import type { Category } from '../services/categoryService';
import type { Restaurant } from '../types/restaurant';
import type { CreateDeliveryOrderData } from '../types/delivery';
import LanguageSelector from '../components/LanguageSelector';
import ProductImage from '../components/ProductImage';
import FloatingCartBar from '../components/delivery/FloatingCartBar';
import CheckoutFlow from '../components/delivery/CheckoutFlow';
import type { CartLine } from '../components/delivery/CheckoutFlow';

export default function DeliveryMenu() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { user, updateUser, isLoading: authLoading } = useDeliveryAuth();
  // Produto pedido via navegação (carrossel da página /delivery)
  const requestedProductId = (location.state as { openProductId?: string } | null)?.openProductId ?? null;
  // Garante que o auto-open só dispare uma vez por entrada na página
  const autoOpenedRef = useRef(false);
  
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [selectedItems, setSelectedItems] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // Modal de detalhes do produto (slide de baixo + arrastar para fechar)
  const [productModalProduct, setProductModalProduct] = useState<Product | null>(null);
  const [modalQuantity, setModalQuantity] = useState(1);
  const [modalObservations, setModalObservations] = useState('');
  const [sheetTranslateY, setSheetTranslateY] = useState(0);
  const dragStartY = useRef(0);
  const dragStartTranslate = useRef(0);
  const isDragging = useRef(false);
  const [isDraggingSheet, setIsDraggingSheet] = useState(false);
  const [sheetAnimateIn, setSheetAnimateIn] = useState(false);
  const [backdropVisible, setBackdropVisible] = useState(false);

  const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
  const stripePromise = useMemo(
    () => (stripePublishableKey ? loadStripe(stripePublishableKey) : null),
    [stripePublishableKey]
  );

  const deliveryFee = 5.00; // Taxa de entrega fixa

  const { products: displayProducts, categories: displayCategories, loading: _loadingTranslations } = useLiveTranslations(
    products,
    categories,
    i18n.language
  );

  // Seções por categoria: ordem das categorias que têm produtos + produtos agrupados (inclui categorias só dos produtos)
  const categoryNamesFromApi = displayCategories
    .filter((cat) => displayProducts.some((p) => p.category === cat.name))
    .map((cat) => cat.name);
  const allCategoryNamesInProducts = [...new Set(displayProducts.map((p) => p.category))];
  const categoryNamesWithProducts = [
    ...categoryNamesFromApi,
    ...allCategoryNamesInProducts.filter((name) => !categoryNamesFromApi.includes(name)),
  ];
  const productsByCategory = categoryNamesWithProducts.reduce<Record<string, Product[]>>((acc, name) => {
    acc[name] = displayProducts.filter((p) => p.category === name);
    return acc;
  }, {});

  // Refs das seções para scroll spy e scroll-into-view ao clicar na aba
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadRestaurantData();
  }, [restaurantId]);

  // Scroll spy: ao rolar no container, atualizar a aba ativa conforme a seção que está no topo (abaixo da barra fixa)
  const stickyBarHeight = 120;
  useEffect(() => {
    if (categoryNamesWithProducts.length === 0) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    const refs = sectionRefs.current;
    const onScroll = () => {
      const threshold = stickyBarHeight + 10;
      let activeCategory: string = 'todos';
      for (const name of categoryNamesWithProducts) {
        const el = refs[name];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= threshold) activeCategory = name;
      }
      setSelectedCategory(activeCategory);
    };
    onScroll();
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, [categoryNamesWithProducts.join(',')]);

  // Disparar animação de entrada do modal (slide de baixo) após o primeiro paint
  useEffect(() => {
    if (!productModalProduct) return;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setSheetAnimateIn(true);
        setBackdropVisible(true);
      });
    });
    return () => cancelAnimationFrame(id);
  }, [productModalProduct]);

  const loadRestaurantData = async () => {
    if (!restaurantId) return;

    try {
      setLoading(true);
      const [restaurantsData, productsData, categoriesData] = await Promise.all([
        getRestaurants(),
        getProducts(restaurantId),
        getCategories(restaurantId)
      ]);

      const currentRestaurant = restaurantsData.find(r => r.id === restaurantId);
      setRestaurant(currentRestaurant || null);
      
      const availableProducts = productsData.filter(p => 
        p.available && (p.availableForDelivery ?? true)
      );
      
      setProducts(availableProducts);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const openProductModal = useCallback((product: Product) => {
    const inCart = selectedItems.find(item => item.product.id === product.id);
    setProductModalProduct(product);
    setModalQuantity(inCart?.quantity ?? 1);
    setModalObservations(inCart?.observations ?? '');
    setSheetTranslateY(0);
    setSheetAnimateIn(false);
    setBackdropVisible(false);
  }, [selectedItems]);

  const closeProductModal = useCallback(() => {
    setProductModalProduct(null);
    setSheetTranslateY(0);
    setSheetAnimateIn(false);
    setBackdropVisible(false);
  }, []);

  // Abre automaticamente o modal do produto pedido pelo carrossel da home
  // (rota /delivery -> /delivery/:restaurantId com state.openProductId).
  // Dispara apenas uma vez por entrada na página.
  useEffect(() => {
    if (autoOpenedRef.current) return;
    if (loading) return;
    if (!requestedProductId) return;
    if (products.length === 0) return;

    const target = products.find((p) => p.id === requestedProductId);
    if (!target) {
      autoOpenedRef.current = true;
      return;
    }

    autoOpenedRef.current = true;
    openProductModal(target);
    // Limpa o state da rota para que um refresh não reabra o modal
    navigate(location.pathname, { replace: true });
  }, [
    loading,
    products,
    requestedProductId,
    openProductModal,
    navigate,
    location.pathname,
  ]);

  const handleAddFromModal = useCallback(() => {
    if (!productModalProduct) return;
    const existing = selectedItems.find(item => item.product.id === productModalProduct.id);
    if (existing) {
      setSelectedItems(selectedItems.map(item =>
        item.product.id === productModalProduct.id
          ? { ...item, quantity: modalQuantity, observations: modalObservations }
          : item
      ));
    } else {
      setSelectedItems([...selectedItems, {
        product: productModalProduct,
        quantity: modalQuantity,
        observations: modalObservations
      }]);
    }
    closeProductModal();
  }, [productModalProduct, modalQuantity, modalObservations, selectedItems, closeProductModal]);

  const DRAG_CLOSE_THRESHOLD = 120;

  const handleSheetPointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    setIsDraggingSheet(true);
    dragStartY.current = e.clientY;
    dragStartTranslate.current = sheetTranslateY;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, [sheetTranslateY]);

  const handleSheetPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const delta = e.clientY - dragStartY.current;
    const next = Math.max(0, dragStartTranslate.current + delta);
    setSheetTranslateY(next);
  }, []);

  const handleSheetPointerUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    setIsDraggingSheet(false);
    if (sheetTranslateY >= DRAG_CLOSE_THRESHOLD) {
      closeProductModal();
    } else {
      setSheetTranslateY(0);
    }
  }, [sheetTranslateY, closeProductModal]);

  const calculateSubtotal = useCallback(
    () => selectedItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [selectedItems]
  );

  const subtotal = calculateSubtotal();
  const itemCount = selectedItems.reduce((s, it) => s + it.quantity, 0);

  const updateItemQuantity = useCallback((productId: string, nextQuantity: number) => {
    setSelectedItems((prev) => {
      if (nextQuantity <= 0) {
        return prev.filter((it) => it.product.id !== productId);
      }
      return prev.map((it) =>
        it.product.id === productId ? { ...it, quantity: nextQuantity } : it
      );
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setSelectedItems((prev) => prev.filter((it) => it.product.id !== productId));
  }, []);

  const fmtBRL = useMemo(
    () =>
      new Intl.NumberFormat(i18n.language.startsWith('pt') ? 'pt-BR' : 'en-US', {
        style: 'currency',
        currency: 'BRL',
      }),
    [i18n.language]
  );

  const handleOrderCreated = useCallback(
    async ({ orderPayload }: { orderPayload: CreateDeliveryOrderData }) => {
      if (user) {
        try {
          const updatedUser = await saveDeliveryUser({
            name: orderPayload.customerName,
            email: user.email,
            phone: orderPayload.customerPhone,
            address: orderPayload.customerAddress,
            defaultPaymentMethod: orderPayload.paymentMethod,
            stripeCustomerId: user.stripeCustomerId,
          });
          updateUser(updatedUser);
        } catch (error) {
          console.error('Erro ao atualizar informações do usuário:', error);
        }
      }

      await createDeliveryOrder(orderPayload);
      setCheckoutOpen(false);
      setSelectedItems([]);
      alert(t('delivery.orderSuccess'));
      navigate('/delivery/orders', { state: { phone: orderPayload.customerPhone } });
    },
    [user, updateUser, t, navigate]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('menu.loadingMenu')}</p>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('delivery.restaurantNotFound')}</h2>
          <button
            onClick={() => navigate('/delivery')}
            className="text-amber-600 hover:text-amber-700 font-semibold"
          >
            {t('delivery.backToRestaurantList')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col bg-gray-50 h-screen max-h-[100dvh] overflow-hidden"
      style={{ minHeight: 0 }}
    >
      {/* Único container de scroll: ao rolar, o header sobe; a barra (busca + categorias) sobe até o topo e fica sticky; só os cards rolam por baixo */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide pb-24"
        style={{ WebkitOverflowScrolling: 'touch', minHeight: 0 }}
      >
      {/* Header - banner + card de entrega (rolam normalmente) */}
      <div className="relative overflow-x-hidden">
        {/* Restaurant Banner Background */}
        <div
          className="h-40 sm:h-48 bg-cover bg-center relative"
          style={{
            backgroundImage: restaurant.theme?.logo ? `url(${restaurant.theme.logo})` : `linear-gradient(135deg, ${restaurant.theme?.primaryColor || '#92400e'}, ${restaurant.theme?.secondaryColor || '#d97706'})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/40"></div>

          {/* Navigation: no app nativo (Capacitor/Android) fica abaixo da status bar e com área de toque maior */}
          {(() => {
            const isNative = isNativePlatform();
            const safeAreaTop = getNativeSafeAreaTop();
            const headerClass = isNative
              ? 'absolute top-0 left-2 right-2 flex items-center justify-between z-10'
              : 'absolute top-4 left-4 right-4 flex items-center justify-between z-10';
            const headerStyle = isNative && safeAreaTop
              ? { paddingTop: safeAreaTop }
              : undefined;
            const backBtnClass = isNative
              ? 'flex items-center justify-center min-h-[44px] min-w-[44px] text-white hover:text-gray-200 transition-colors duration-200 bg-black/20 backdrop-blur-sm px-3 py-2.5 rounded-full text-sm touch-manipulation'
              : 'flex items-center text-white hover:text-gray-200 transition-colors duration-200 bg-black/20 backdrop-blur-sm px-3 py-2 rounded-full';
            return (
              <div className={headerClass} style={headerStyle}>
                <button
                  type="button"
                  onClick={() => navigate('/delivery')}
                  className={backBtnClass}
                  aria-label={t('delivery.back')}
                >
                  <ArrowLeft className={isNative ? 'w-4 h-4 mr-1.5' : 'w-5 h-5 mr-2'} />
                  {t('delivery.back')}
                </button>
                <LanguageSelector compact={isNative} />
              </div>
            );
          })()}

          {/* Restaurant Info */}
          <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 z-10">
            <div className="flex items-end gap-3 sm:gap-4">
              {/* Restaurant Logo */}
              <div className="w-14 h-14 sm:w-20 sm:h-20 bg-white rounded-lg shadow-lg flex items-center justify-center flex-shrink-0">
                <span className="text-xl sm:text-2xl font-bold" style={{ color: restaurant.theme?.primaryColor || '#92400e' }}>
                  {restaurant.name.charAt(0).toUpperCase()}
                </span>
              </div>

              {/* Restaurant Details */}
              <div className="flex-1 min-w-0 text-white">
                <h1 className="text-lg sm:text-2xl font-bold mb-0.5 truncate">{restaurant.name}</h1>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-white/90">
                  <div className="flex items-center shrink-0">
                    <span className="text-yellow-400 mr-1">★</span>
                    <span>4.5</span>
                  </div>
                  <div className="flex items-center min-w-0 overflow-hidden">
                    <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 shrink-0" />
                    <span className="truncate">{restaurant.address}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Delivery Info Card - responsivo mobile */}
        <div className="bg-white mx-3 sm:mx-4 mt-3 sm:mt-4 rounded-xl shadow-lg p-3 sm:p-4 relative z-20">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 min-w-0">
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs sm:text-sm font-medium text-gray-700">{t('delivery.open')}</span>
              </div>
              <div className="text-xs sm:text-sm text-gray-500 shrink-0">
                Pedido mín. R$ 15,00
              </div>
            </div>
            <button className="text-red-500 text-xs sm:text-sm font-medium hover:text-red-600 shrink-0">
              {t('delivery.seeMore')}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="flex-1 min-w-0 bg-gray-50 rounded-lg p-2.5 sm:p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Bike className="w-4 h-4 text-gray-600 shrink-0" />
                  <span className="text-xs sm:text-sm font-medium text-gray-700 truncate">{t('delivery.deliveryFee')}</span>
                </div>
                <span className="text-xs text-gray-500 shrink-0">▼</span>
              </div>
            </div>

            <div className="flex-1 min-w-0 bg-gray-50 rounded-lg p-2.5 sm:p-3">
              <div className="text-xs sm:text-sm font-medium text-gray-700">{t('delivery.today')}</div>
              <div className="text-xs text-gray-500">25-35 min • R$ 5,99</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search + Categorias: fixos no topo ao rolar (fora do header para sticky funcionar) */}
      <div className="sticky top-0 z-30 bg-gray-50 pb-2 -mt-px shadow-[0_4px_6px_-2px_rgba(0,0,0,0.08)]">
        <div className="px-3 sm:px-4 pt-3 sm:pt-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5 pointer-events-none" />
            <input
              type="text"
              placeholder={t('delivery.searchPlaceholder')}
              className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent shadow-sm"
            />
          </div>
        </div>
        <div className="px-3 sm:px-4 -mx-3 sm:mx-0">
          <div
            className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-hide overflow-y-hidden"
            style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}
          >
            <button
              onClick={() => { setSelectedCategory('todos'); scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className={`shrink-0 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200 ${selectedCategory === 'todos'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                }`}
            >
              {t('menu.allCategories')}
            </button>
            {categoryNamesWithProducts.map((categoryName) => {
              const displayName = displayCategories.find(c => c.name === categoryName)?.name ?? categoryName;
              return (
                <button
                  key={categoryName}
                  onClick={() => {
                    setSelectedCategory(categoryName);
                    sectionRefs.current[categoryName]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className={`shrink-0 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200 ${selectedCategory === categoryName
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                    }`}
                >
                  {displayName}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-3xl overflow-x-hidden">
        <div className="grid grid-cols-1 gap-6 lg:gap-8">
          {/* Menu - itens por categoria, com nome da categoria no início de cada seção */}
          <div className="min-w-0">
            <div className="space-y-8 sm:space-y-10">
              {categoryNamesWithProducts.map((categoryName) => {
                const sectionProducts = productsByCategory[categoryName] ?? [];
                const displayName = displayCategories.find(c => c.name === categoryName)?.name ?? categoryName;
                return (
                  <div
                    key={categoryName}
                    ref={(el) => { sectionRefs.current[categoryName] = el; }}
                    data-section-category={categoryName}
                    className="scroll-mt-32"
                  >
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 pb-2 border-b-2 border-amber-200">
                      {displayName}
                    </h2>
                    <div className="space-y-3 sm:space-y-4">
                      {sectionProducts.map((product) => {
                        const itemInCart = selectedItems.find(item => item.product.id === product.id);
                        return (
                          <div key={product.id} className="bg-white rounded-xl shadow-md overflow-hidden">
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={() => openProductModal(product)}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openProductModal(product); } }}
                              className="p-3 sm:p-4 cursor-pointer active:scale-[0.99] transition-transform touch-manipulation select-none"
                              aria-label={`Ver detalhes de ${product.name}`}
                            >
                              <div className="flex items-start gap-3 sm:gap-4">
                                {/* Imagem */}
                                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg flex-shrink-0 bg-gray-100 flex items-center justify-center overflow-hidden">
                                  {product.image ? (
                                    <ProductImage
                                      src={product.image}
                                      alt={product.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="text-center text-gray-400 p-1.5 sm:p-2">
                                      <div className="text-[10px] sm:text-xs font-medium">📷</div>
                                      <div className="text-[10px] sm:text-xs leading-tight">{t('delivery.noImage')}</div>
                                    </div>
                                  )}
                                </div>

                                {/* Nome, descrição e preço */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-0.5 sm:mb-1 break-words line-clamp-2 leading-snug">
                                      {product.name}
                                    </h3>
                                    {itemInCart && (
                                      <span className="shrink-0 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                        {itemInCart.quantity} {t('delivery.inCart')}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs sm:text-sm text-gray-600 mb-1.5 sm:mb-2 line-clamp-2 leading-snug">
                                    {product.description}
                                  </p>
                                  <p className="text-lg sm:text-xl font-bold text-amber-600 tabular-nums">
                                    R$ {product.price.toFixed(2)}
                                  </p>
                                </div>

                                {/* Indicador de toque: seta ou chevron */}
                                <div className="shrink-0 flex items-center text-gray-400">
                                  <ChevronDown className="w-5 h-5 rotate-[-90deg]" aria-hidden />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      </div>

      <FloatingCartBar
        itemCount={itemCount}
        subtotalLabel={t('delivery.withoutDeliveryFee')}
        itemsLabel={`${fmtBRL.format(subtotal)} / ${itemCount} ${itemCount === 1 ? t('delivery.item') : t('delivery.items')}`}
        ctaLabel={t('delivery.viewBag')}
        onClick={() => setCheckoutOpen(true)}
        accentColor={restaurant.theme?.primaryColor || '#E91120'}
      />

      <CheckoutFlow
        onlineCardPaymentsEnabled={restaurant.stripeConnectChargesEnabled === true}
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        items={selectedItems}
        onChangeQuantity={updateItemQuantity}
        onRemoveItem={removeItem}
        user={user}
        authLoading={authLoading}
        onUpdateUser={updateUser}
        restaurantId={restaurant.id}
        restaurantName={restaurant.name}
        accentColor={restaurant.theme?.primaryColor || '#E91120'}
        baseDeliveryFee={deliveryFee}
        defaultName={user?.name || ''}
        defaultPhone={user?.phone || ''}
        defaultAddress={user?.address || ''}
        currency="BRL"
        locale={i18n.language}
        stripePromise={stripePromise}
        onOrderCreated={handleOrderCreated}
      />

      {/* Modal de detalhes do produto - slide de baixo, arrastar para fechar */}
      {productModalProduct && (
        <>
          <div
            className={`fixed inset-0 z-40 transition-opacity duration-300 ease-out ${backdropVisible ? 'bg-black/50 opacity-100' : 'bg-black/50 opacity-0'}`}
            onClick={closeProductModal}
            aria-hidden
          />
          <div
            className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] bg-white rounded-t-2xl shadow-2xl flex flex-col"
            style={{
              transform: isDraggingSheet
                ? `translateY(${sheetTranslateY}px)`
                : `translateY(${sheetAnimateIn ? 0 : '100%'})`,
              transition: isDraggingSheet ? 'none' : 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
            }}
          >
            {/* Alça para arrastar e fechar */}
            <div
              className="shrink-0 flex flex-col items-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none select-none"
              onPointerDown={handleSheetPointerDown}
              onPointerMove={handleSheetPointerMove}
              onPointerUp={handleSheetPointerUp}
              onPointerCancel={handleSheetPointerUp}
              role="button"
              tabIndex={0}
              aria-label={t('delivery.dragToClose')}
            >
              <div className="w-12 h-1.5 rounded-full bg-gray-300" />
            </div>

            <div className="overflow-y-auto flex-1 min-h-0 pb-8">
              {(() => {
                const inCart = selectedItems.find(item => item.product.id === productModalProduct.id);
                return (
                  <>
                    {/* Imagem grande do produto */}
                    <div className="w-full aspect-[4/3] max-h-56 bg-gray-100 flex items-center justify-center overflow-hidden">
                      {productModalProduct.image ? (
                        <ProductImage
                          src={productModalProduct.image}
                          alt={productModalProduct.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center text-gray-400 p-4">
                          <div className="text-4xl mb-2">📷</div>
                          <div className="text-sm font-medium">{t('delivery.noImage')}</div>
                        </div>
                      )}
                    </div>

                    <div className="p-4 sm:p-6">
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                        {productModalProduct.name}
                      </h2>
                      <p className="text-sm text-gray-600 leading-relaxed mb-4 whitespace-pre-wrap">
                        {productModalProduct.description}
                      </p>
                      <p className="text-2xl font-bold text-amber-600 mb-6 tabular-nums">
                        R$ {productModalProduct.price.toFixed(2)}
                      </p>

                      {/* Quantidade */}
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-gray-700">{t('delivery.quantityLabel')}</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setModalQuantity((q) => Math.max(1, q - 1)); }}
                            className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 active:scale-95"
                          >
                            <Minus className="w-5 h-5" />
                          </button>
                          <span className="font-bold text-lg min-w-[2rem] text-center text-black">{modalQuantity}</span>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setModalQuantity((q) => q + 1); }}
                            className="w-10 h-10 rounded-full bg-amber-600 text-white flex items-center justify-center hover:bg-amber-700 active:scale-95"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* Observações */}
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('delivery.observationsOptional')}
                        </label>
                        <input
                          type="text"
                          placeholder={t('menu.observationsPlaceholder')}
                          value={modalObservations}
                          onChange={(e) => setModalObservations(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm text-black"
                        />
                      </div>

                      {/* Botão adicionar ao carrinho (dentro do modal) */}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleAddFromModal(); }}
                        className="w-full bg-amber-600 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-amber-700 active:scale-[0.98] shadow-lg"
                      >
                        <ShoppingCart className="w-6 h-6" />
                        {inCart ? t('delivery.updateInCart') : t('delivery.addToCart')} · R$ {(productModalProduct.price * modalQuantity).toFixed(2)}
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </>
      )}

    </div>
  );
}

