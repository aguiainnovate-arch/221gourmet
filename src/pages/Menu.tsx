import { useParams } from 'react-router-dom';
import { useOrders } from '../contexts/OrderContext';
import { useTranslation } from 'react-i18next';
import { useEffect, useState, useCallback, useMemo, type CSSProperties } from 'react';
import { getTables } from '../services/tableService';
import { getOrdersByRestaurant } from '../services/orderService';
import type { FirestoreOrder } from '../services/orderService';
import { useRestaurantData } from '../hooks/useRestaurantData';
import { applyCustomColors, buildMenuThemeVars } from '../utils/colorUtils';
import {
  getRestaurantSettings,
  subscribeToSettings,
  type RestaurantSettings,
} from '../services/settingsService';
import MenuHeader from '../components/menu/MenuHeader';
import MenuOrdersSection from '../components/menu/MenuOrdersSection';
import MenuCategoryFilters from '../components/menu/MenuCategoryFilters';
import MenuCategorySectionHeader from '../components/menu/MenuCategorySectionHeader';
import MenuProductCard from '../components/menu/MenuProductCard';
import { useLiveTranslations } from '../hooks/useLiveTranslations';
import LoadingAnimation from '../components/LoadingAnimation';
import { ArrowLeft, X, Tag, Check, Eye } from 'lucide-react';
import type { Table } from '../services/tableService';
import type { Product } from '../types/product';
import type { OrderItem } from '../services/statisticsService';
import ImageModal from '../components/ImageModal';

interface SelectedItem {
  product: Product;
  quantity: number;
  observations: string;
}

interface ExpandedItem {
  productId: string;
  quantity: number;
  observations: string;
}

export default function Menu() {
  const { mesaId } = useParams<{ mesaId: string }>();
  const { addOrder, setRestaurantId } = useOrders();
  const { t, i18n } = useTranslation();
  const { products, categories, restaurantId } = useRestaurantData();
  const [menuSettings, setMenuSettings] = useState<RestaurantSettings | null>(null);
  const { products: displayProducts, categories: displayCategories } = useLiveTranslations(
    products,
    categories,
    i18n.language
  );
  const [mesaInfo, setMesaInfo] = useState<Table | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<ExpandedItem[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [imageModal, setImageModal] = useState<{ isOpen: boolean; src: string; alt: string }>({
    isOpen: false,
    src: '',
    alt: ''
  });
  const [loading, setLoading] = useState(true);
  const [showLoadingAnimation, setShowLoadingAnimation] = useState(true);
  const [meusPedidos, setMeusPedidos] = useState<FirestoreOrder[]>([]);

  // Configurações do restaurante da URL do QR (independente do SettingsProvider global)
  useEffect(() => {
    if (!restaurantId) return;

    let cancelled = false;

    getRestaurantSettings(restaurantId).then((loaded) => {
      if (!cancelled) setMenuSettings(loaded);
    });

    const unsubscribe = subscribeToSettings(restaurantId, (loaded) => {
      if (!cancelled) setMenuSettings(loaded);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [restaurantId]);

  // Sincroniza o contexto de pedidos com o restaurante da URL (quando abre pelo QR)
  useEffect(() => {
    if (restaurantId) setRestaurantId(restaurantId);
  }, [restaurantId, setRestaurantId]);

  useEffect(() => {
    const carregarMesaInfo = async () => {
      if (!mesaId || !restaurantId) return;

      try {
        setLoading(true);
        const tables = await getTables(restaurantId);
        const mesa = tables.find((table) => table.numero === mesaId);
        setMesaInfo(mesa || null);
      } catch (error) {
        // Erro silencioso
      } finally {
        setLoading(false);
      }
    };

    carregarMesaInfo();
  }, [mesaId, restaurantId]);

  // Pedidos desta mesa para o cliente acompanhar status (atualiza a cada 15s)
  const carregarMeusPedidos = useCallback(async () => {
    if (!restaurantId || !mesaInfo?.id) return;
    try {
      const all = await getOrdersByRestaurant(restaurantId);
      const daMesa = all.filter(
        (o) =>
          (o.mesaId === mesaInfo.id || String(o.mesaNumero) === String(mesaInfo.numero)) &&
          (o.orderType === 'mesa' || !o.orderType)
      );
      setMeusPedidos(daMesa);
    } catch {
      // silencioso
    }
  }, [restaurantId, mesaInfo?.id, mesaInfo?.numero]);

  useEffect(() => {
    if (!restaurantId || !mesaInfo?.id) return;
    carregarMeusPedidos();
    const interval = setInterval(carregarMeusPedidos, 5 * 60 * 1000); // a cada 5 min
    return () => clearInterval(interval);
  }, [carregarMeusPedidos, restaurantId, mesaInfo?.id]);

  // Aplicar cores personalizadas do restaurante no cardápio
  const menuThemeStyle = useMemo(() => {
    if (!menuSettings?.primaryColor || !menuSettings?.secondaryColor) return undefined;
    return buildMenuThemeVars(menuSettings.primaryColor, menuSettings.secondaryColor) as CSSProperties;
  }, [menuSettings?.primaryColor, menuSettings?.secondaryColor]);

  useEffect(() => {
    if (!menuSettings?.primaryColor || !menuSettings?.secondaryColor) return;
    applyCustomColors(menuSettings.primaryColor, menuSettings.secondaryColor);
  }, [menuSettings?.primaryColor, menuSettings?.secondaryColor]);

  // Reproduzir áudio de boas-vindas e controlar animação
  useEffect(() => {
    if (menuSettings?.audioUrl && mesaInfo && showLoadingAnimation) {
      // Criar um botão invisível para simular interação do usuário
      const createInvisibleButton = () => {
        const button = document.createElement('button');
        button.style.position = 'fixed';
        button.style.top = '0';
        button.style.left = '0';
        button.style.width = '1px';
        button.style.height = '1px';
        button.style.opacity = '0';
        button.style.pointerEvents = 'none';
        button.style.zIndex = '-1';
        document.body.appendChild(button);
        return button;
      };

      // Aguardar um pouco para garantir que a página carregou completamente
      const timer = setTimeout(() => {
        try {
          const audio = new Audio(menuSettings.audioUrl);
          audio.volume = 0.7; // Volume moderado
          audio.preload = 'auto';
          
          // Estratégias para contornar bloqueio de autoplay
          const playAudio = async () => {
            try {
              // Tentativa 1: Reprodução direta
              await audio.play();
              console.log('Áudio reproduzido com sucesso (tentativa 1)');
              return true;
            } catch (error) {
              console.warn('Tentativa 1 falhou:', error);
              
              try {
                // Tentativa 2: Aguardar um pouco e tentar novamente
                await new Promise(resolve => setTimeout(resolve, 500));
                await audio.play();
                console.log('Áudio reproduzido com sucesso (tentativa 2)');
                return true;
              } catch (error2) {
                console.warn('Tentativa 2 falhou:', error2);
                
                try {
                  // Tentativa 3: Simular interação do usuário com botão invisível
                  const invisibleButton = createInvisibleButton();
                  invisibleButton.click();
                  
                  await new Promise(resolve => setTimeout(resolve, 100));
                  await audio.play();
                  console.log('Áudio reproduzido com sucesso (tentativa 3)');
                  
                  // Remover botão invisível
                  document.body.removeChild(invisibleButton);
                  return true;
                } catch (error3) {
                  console.warn('Tentativa 3 falhou:', error3);
                  
                  try {
                    // Tentativa 4: Usar Web Audio API
                    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                    const response = await fetch(menuSettings.audioUrl!);
                    const arrayBuffer = await response.arrayBuffer();
                    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                    const source = audioContext.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(audioContext.destination);
                    source.start();
                    console.log('Áudio reproduzido com sucesso (Web Audio API)');
                    return true;
                  } catch (error4) {
                    console.warn('Tentativa 4 falhou:', error4);
                    
                    try {
                      // Tentativa 5: Aguardar mais tempo e tentar novamente
                      await new Promise(resolve => setTimeout(resolve, 1000));
                      await audio.play();
                      console.log('Áudio reproduzido com sucesso (tentativa 5)');
                      return true;
                    } catch (error5) {
                      console.warn('Todas as tentativas falharam:', error5);
                      return false;
                    }
                  }
                }
              }
            }
          };
          
          // Executar estratégias de reprodução
          playAudio().then(success => {
            if (!success) {
              // Se todas as tentativas falharam, esconder animação após tempo padrão
              setTimeout(() => {
                setShowLoadingAnimation(false);
              }, 5500);
            }
          });
          
          // Quando o áudio terminar, esconder a animação
          audio.addEventListener('ended', () => {
            setTimeout(() => {
              setShowLoadingAnimation(false);
            }, 500); // Pequeno delay para transição suave
          });
          
        } catch (error) {
          console.warn('Erro ao criar elemento de áudio:', error);
          // Se houver erro, esconder animação após tempo padrão
          setTimeout(() => {
            setShowLoadingAnimation(false);
          }, 5500);
        }
      }, 1000);

      return () => clearTimeout(timer);
    } else if (!menuSettings?.audioUrl && mesaInfo) {
      // Se não há áudio, esconder animação após tempo menor
      const timer = setTimeout(() => {
        setShowLoadingAnimation(false);
      }, 3000); // 3 segundos sem áudio
      
      return () => clearTimeout(timer);
    }
  }, [menuSettings?.audioUrl, mesaInfo, showLoadingAnimation]);


  // Atualizar título da aba do navegador
  useEffect(() => {
    if (menuSettings?.restaurantName) {
      document.title = `${menuSettings.restaurantName} - Mesa ${mesaInfo?.numero || ''}`;
    } else {
      document.title = 'Noctis - Menu';
    }
  }, [menuSettings?.restaurantName, mesaInfo?.numero]);

  const handleProductClick = (product: Product) => {
    if (expandedProduct === product.id) {
      setExpandedProduct(null);
    } else {
      setExpandedProduct(product.id);
      // Inicializa o item expandido se não existir
      if (!expandedItems.find(item => item.productId === product.id)) {
        const existingSelected = selectedItems.find(item => item.product.id === product.id);
        setExpandedItems(prev => [...prev, {
          productId: product.id,
          quantity: existingSelected?.quantity || 1,
          observations: existingSelected?.observations || ''
        }]);
      }
    }
  };

  const handleImageClick = (e: React.MouseEvent, imageSrc: string, imageAlt: string) => {
    e.stopPropagation();
    setImageModal({
      isOpen: true,
      src: imageSrc,
      alt: imageAlt
    });
  };

  const closeImageModal = () => {
    setImageModal({
      isOpen: false,
      src: '',
      alt: ''
    });
  };

  const updateExpandedItem = (productId: string, updates: Partial<ExpandedItem>) => {
    setExpandedItems(prev => prev.map(item => 
      item.productId === productId ? { ...item, ...updates } : item
    ));
  };

  const handleAddToOrder = (product: Product) => {
    const expandedItem = expandedItems.find(item => item.productId === product.id);
    if (!expandedItem) return;

    const existingItemIndex = selectedItems.findIndex(item => item.product.id === product.id);
    
    if (existingItemIndex >= 0) {
      // Atualiza item existente
      setSelectedItems(prev => prev.map((item, index) => 
        index === existingItemIndex 
          ? { ...item, quantity: expandedItem.quantity, observations: expandedItem.observations }
          : item
      ));
    } else {
      // Adiciona novo item
      setSelectedItems(prev => [...prev, { 
        product, 
        quantity: expandedItem.quantity, 
        observations: expandedItem.observations 
      }]);
    }
    
    setExpandedProduct(null);
  };

  const handleRemoveFromOrder = (productId: string) => {
    setSelectedItems(prev => prev.filter(item => item.product.id !== productId));
  };

  const handleVerPedido = () => {
    if (selectedItems.length === 0) {
      alert(t('menu.selectAtLeastOne'));
      return;
    }
    setShowConfirmation(true);
  };

  const handleCancelarPedido = () => {
    setShowConfirmation(false);
  };

  const handleConfirmarPedido = async () => {
    if (!mesaInfo || !mesaInfo.id) {
      alert(t('menu.tableInfoNotFound'));
      return;
    }
    const statusAceito = mesaInfo.status === 'ocupada' || mesaInfo.status === 'em_fechamento';
    if (!statusAceito) {
      alert('Esta mesa não está aberta para pedidos. Peça ao garçom para abrir a mesa no painel.');
      return;
    }

    const itensSelecionados = selectedItems.map(item => {
      const name = item.product.name;
      return `${name} (${item.quantity}x)${item.observations ? ` - ${item.observations}` : ''}`;
    });

    // Preparar dados detalhados para estatísticas
    const detailedItems: OrderItem[] = selectedItems.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      categoryId: item.product.category || 'sem-categoria',
      categoryName: item.product.category || 'Sem Categoria',
      quantity: item.quantity,
      price: item.product.price,
      observations: item.observations
    }));
    
    await addOrder({
      restaurantId: restaurantId,
      mesaId: mesaInfo.id,
      mesaNumero: mesaInfo.numero,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      status: 'novo',
      itens: itensSelecionados,
      tempoEspera: '15 min',
      orderType: 'mesa'
    }, detailedItems);

    setSelectedItems([]);
    setExpandedItems([]);
    setShowConfirmation(false);
    carregarMeusPedidos(); // atualiza "Seus pedidos" na hora
    alert(t('menu.orderSent', { number: mesaInfo.numero }));
  };

  // Agrupar produtos por categoria quando "Todos" estiver selecionado
  const getGroupedProducts = () => {
    if (selectedCategory === 'todos') {
      const grouped = displayProducts.reduce((acc, product) => {
        const category = product.category || 'Sem Categoria';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(product);
        return acc;
      }, {} as Record<string, Product[]>);
      
      return Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([category, prods]) => ({ category, products: prods }));
    } else {
      const filtered = displayProducts.filter(product => product.category === selectedCategory);
      return [{ category: selectedCategory, products: filtered }];
    }
  };

  const groupedProducts = getGroupedProducts();

  const totalItems = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = selectedItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  const handleAnimationComplete = () => {
    setShowLoadingAnimation(false);
  };

  if (loading) {
    return (
      <div className="menu-page min-h-screen flex items-center justify-center" style={menuThemeStyle}>
        <div className="text-xl text-primary-800">{t('menu.loading')}</div>
      </div>
    );
  }

  if (!mesaInfo) {
    return (
      <div className="menu-page min-h-screen flex items-center justify-center" style={menuThemeStyle}>
        <div className="text-xl text-red-600">{t('menu.tableNotFound')}</div>
      </div>
    );
  }

  // Mostrar animação de carregamento se necessário
  if (showLoadingAnimation && menuSettings) {
    return (
      <LoadingAnimation
        restaurantName={menuSettings.restaurantName}
        bannerUrl={menuSettings.bannerUrl}
        primaryColor={menuSettings.primaryColor}
        secondaryColor={menuSettings.secondaryColor}
        audioUrl={menuSettings.audioUrl}
        onAnimationComplete={handleAnimationComplete}
      />
    );
  }

  // Tela de Confirmação do Pedido
  if (showConfirmation) {
    return (
      <div className="menu-page min-h-screen animate-fadeInUp" style={menuThemeStyle}>
        <MenuHeader
          restaurantName={menuSettings?.restaurantName || 'Noctis'}
          tableLabel={t('menu.table', { number: mesaInfo.numero })}
        />

        <div className="max-w-lg mx-auto px-4 py-6">
          {/* Botão Voltar */}
          <div className="mb-6">
            <button
              onClick={handleCancelarPedido}
              className="flex items-center gap-2 text-primary-800 hover:text-primary-900 font-medium"
            >
              <ArrowLeft size={20} />
              {t('menu.backToMenu')}
            </button>
          </div>

          {/* Card de Confirmação */}
          <div className="bg-secondary-100 rounded-lg p-8 border-2 border-secondary-300 shadow-lg mb-6">
            <h2 className="text-3xl font-serif font-bold text-primary-900 mb-6 text-center">
              {t('menu.confirmOrder')}
            </h2>
            
            <div className="space-y-4 mb-8">
              {selectedItems.map((item) => (
                <div key={item.product.id} className="bg-white p-6 rounded-xl border-2 border-secondary-300 shadow-lg hover:shadow-xl transition-all duration-200">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-semibold text-primary-900 text-xl">
                      {item.product.name}
                    </h3>
                    <span className="text-primary-800 font-bold text-xl">
                      R$ {(item.product.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-6 text-sm text-primary-700 mb-4">
                    <span className="flex items-center gap-1">
                      <Tag size={14} />
                      {t('menu.quantity')} {item.quantity}
                    </span>
                    <span>•</span>
                    <span>R$ {item.product.price.toFixed(2)} {t('menu.each')}</span>
                  </div>
                  {item.observations && (
                    <div className="bg-gradient-to-r from-secondary-100 to-secondary-200 p-4 rounded-lg text-sm text-primary-800 border border-secondary-300">
                      <strong>{t('menu.observations')}</strong> {item.observations}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t-2 border-secondary-400 pt-6">
              <div className="flex justify-between items-center text-2xl font-bold text-primary-900 mb-3">
                <span>{t('menu.orderTotal')}</span>
                <span>R$ {totalPrice.toFixed(2)}</span>
              </div>
              <div className="text-center text-primary-700">
                <p className="text-lg">{t('menu.table', { number: mesaInfo.numero })} • {t('menu.items', { count: totalItems })}</p>
                <p className="text-sm mt-1">{t('menu.estimatedTime')}</p>
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-4">
            <button
              onClick={handleCancelarPedido}
              className="flex-1 bg-gray-500 text-white py-4 px-6 rounded-lg font-medium hover:bg-gray-600 transition-colors flex items-center justify-center gap-2 text-lg"
            >
              <X size={24} />
              {t('menu.cancel')}
            </button>
            <button
              onClick={handleConfirmarPedido}
              className="flex-1 bg-green-600 text-white py-4 px-6 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-lg"
            >
              <Check size={24} />
              {t('menu.confirmOrderButton')}
            </button>
                  </div>
      </div>
      
      {/* Image Modal */}
      <ImageModal
        isOpen={imageModal.isOpen}
        onClose={closeImageModal}
        imageSrc={imageModal.src}
        imageAlt={imageModal.alt}
      />
    </div>
  );
}

  const mesaAbertaParaPedidos = mesaInfo.status === 'ocupada' || mesaInfo.status === 'em_fechamento';

  // Tela Normal do Menu
  return (
    <div className="menu-page min-h-screen animate-fadeInUp pb-8" style={menuThemeStyle}>
      <MenuHeader
        restaurantName={menuSettings?.restaurantName || 'Noctis'}
        tableLabel={t('menu.table', { number: mesaInfo.numero })}
      />

      {!mesaAbertaParaPedidos && (
        <div className="px-4 -mt-1 mb-4 max-w-lg mx-auto">
          <div className="rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 text-center text-sm">
            Esta mesa não está aberta para pedidos no momento. Avise o garçom para abrir a mesa no painel.
          </div>
        </div>
      )}

      <MenuOrdersSection orders={meusPedidos} />

      {menuSettings?.bannerUrl && (
        <div className="px-4 mb-6 max-w-lg mx-auto">
          <div
            className="w-full h-28 rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(75,0,130,0.1)] cursor-pointer"
            onClick={(e) => handleImageClick(e, menuSettings.bannerUrl!, 'Banner do restaurante')}
          >
            <img
              src={menuSettings.bannerUrl}
              alt="Banner do restaurante"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto px-4">
        <MenuCategoryFilters
          selectedCategory={selectedCategory}
          allLabel={t('menu.all')}
          categories={categories.map((category) => ({
            id: category.id,
            name: category.name,
            displayName: displayCategories.find((c) => c.id === category.id)?.name ?? category.name,
          }))}
          onSelect={setSelectedCategory}
        />

        {groupedProducts.length === 0 || groupedProducts.every((group) => group.products.length === 0) ? (
          <div className="text-center py-12">
            <div className="text-primary-700 text-lg">
              {selectedCategory === 'todos'
                ? t('menu.noProducts')
                : t('menu.noProductsCategory', { category: selectedCategory })}
            </div>
          </div>
        ) : (
          <div className="space-y-8 mb-8">
            {groupedProducts.map((group) => {
              const origCat = categories.find((c) => c.name === group.category);
              const sectionTitle = origCat
                ? (displayCategories.find((dc) => dc.id === origCat.id)?.name ?? group.category)
                : group.category;

              return (
                <section key={group.category}>
                  <MenuCategorySectionHeader
                    title={sectionTitle}
                    onViewAll={
                      selectedCategory === 'todos'
                        ? () => setSelectedCategory(group.category)
                        : undefined
                    }
                  />

                  <div className="space-y-3">
                    {group.products.map((product) => {
                      const expandedItem = expandedItems.find((item) => item.productId === product.id);
                      const selectedItem = selectedItems.find((item) => item.product.id === product.id);

                      return (
                        <MenuProductCard
                          key={product.id}
                          product={product}
                          isExpanded={expandedProduct === product.id}
                          expandedItem={expandedItem}
                          isSelected={!!selectedItem}
                          quantityLabel={t('menu.quantity')}
                          observationsLabel={t('menu.observations')}
                          observationsPlaceholder={t('menu.observationsPlaceholder')}
                          addToOrderLabel={t('menu.addToOrder')}
                          removeLabel={t('menu.remove')}
                          minLabel={t('menu.min')}
                          onCardClick={() => handleProductClick(product)}
                          onAddClick={(e) => {
                            e.stopPropagation();
                            handleProductClick(product);
                          }}
                          onImageClick={handleImageClick}
                          onQuantityChange={(quantity) => updateExpandedItem(product.id, { quantity })}
                          onObservationsChange={(observations) =>
                            updateExpandedItem(product.id, { observations })
                          }
                          onConfirmAdd={(e) => {
                            e.stopPropagation();
                            handleAddToOrder(product);
                          }}
                          onRemove={(e) => {
                            e.stopPropagation();
                            handleRemoveFromOrder(product.id);
                          }}
                        />
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        <div className="sticky bottom-4 z-20">
          <div className="rounded-2xl bg-primary-900 p-4 shadow-[0_8px_32px_rgba(75,0,130,0.35)]">
            <button
              onClick={handleVerPedido}
              disabled={selectedItems.length === 0}
              className={`w-full py-4 px-6 rounded-xl text-base font-serif font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
                selectedItems.length === 0
                  ? 'bg-white/20 text-white/50 cursor-not-allowed'
                  : 'bg-white text-primary-900 hover:bg-primary-50 active:scale-[0.98] shadow-md'
              }`}
            >
              <Eye size={22} />
              {selectedItems.length === 0
                ? t('menu.selectAtLeastOne')
                : t('menu.viewOrderWithItems', { count: totalItems })}
            </button>

            {selectedItems.length > 0 && (
              <p className="mt-3 text-center text-sm text-white/80">
                {t('menu.total')}{' '}
                <span className="font-bold text-white">
                  R$ {totalPrice.toFixed(2).replace('.', ',')}
                </span>
              </p>
            )}
          </div>
        </div>
      </div>

      <ImageModal
        isOpen={imageModal.isOpen}
        onClose={closeImageModal}
        imageSrc={imageModal.src}
        imageAlt={imageModal.alt}
      />
    </div>
  );
} 