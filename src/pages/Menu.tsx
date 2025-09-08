import { useParams } from 'react-router-dom';
import { useOrders } from '../contexts/OrderContext';
import { useSettings } from '../contexts/SettingsContext';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { getTables } from '../services/tableService';
import { getProducts } from '../services/productService';
import { getCategories } from '../services/categoryService';
import { applyCustomColors } from '../utils/colorUtils';
import { getProductTranslation, getCategoryTranslation } from '../utils/translationUtils';
import LanguageSelector from '../components/LanguageSelector';
import LoadingAnimation from '../components/LoadingAnimation';
import { ChevronDown, ChevronRight, Plus, Minus, X, Clock, Tag, Eye, Check, ArrowLeft } from 'lucide-react';
import type { Table } from '../services/tableService';
import type { Product } from '../types/product';
import type { Category } from '../services/categoryService';
import ProductImage from '../components/ProductImage';
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
  const { addOrder } = useOrders();
  const { settings } = useSettings();
  const { t, i18n } = useTranslation();
  const [mesaInfo, setMesaInfo] = useState<Table | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<ExpandedItem[]>([]);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [imageModal, setImageModal] = useState<{ isOpen: boolean; src: string; alt: string }>({
    isOpen: false,
    src: '',
    alt: ''
  });
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [showLoadingAnimation, setShowLoadingAnimation] = useState(true);

  useEffect(() => {
    const carregarMesaInfo = async () => {
      if (!mesaId) return;
      
      try {
        setLoading(true);
        const tables = await getTables();
        const mesa = tables.find(table => table.numero === mesaId);
        setMesaInfo(mesa || null);
      } catch (error) {
        // Erro silencioso
      } finally {
        setLoading(false);
      }
    };

    const carregarProdutos = async () => {
      try {
        setLoadingProducts(true);
        const productsData = await getProducts();
        setProducts(productsData.filter(p => p.available));
      } catch (error) {
        // Erro silencioso
      } finally {
        setLoadingProducts(false);
      }
    };

    const carregarCategorias = async () => {
      try {
        const categoriesData = await getCategories();
        setCategories(categoriesData);
      } catch (error) {
        // Erro silencioso
      }
    };

    carregarMesaInfo();
    carregarProdutos();
    carregarCategorias();
  }, [mesaId]);

  // Aplicar cores personalizadas
  useEffect(() => {
    if (settings) {
      applyCustomColors(settings.primaryColor, settings.secondaryColor);
    }
  }, [settings]);

  // Reproduzir áudio de boas-vindas e controlar animação
  useEffect(() => {
    if (settings?.audioUrl && mesaInfo && showLoadingAnimation) {
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
          const audio = new Audio(settings.audioUrl);
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
                    const response = await fetch(settings.audioUrl!);
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
    } else if (!settings?.audioUrl && mesaInfo) {
      // Se não há áudio, esconder animação após tempo menor
      const timer = setTimeout(() => {
        setShowLoadingAnimation(false);
      }, 3000); // 3 segundos sem áudio
      
      return () => clearTimeout(timer);
    }
  }, [settings?.audioUrl, mesaInfo, showLoadingAnimation]);


  // Atualizar título da aba do navegador
  useEffect(() => {
    if (settings?.restaurantName) {
      document.title = `${settings.restaurantName} - Mesa ${mesaInfo?.numero || ''}`;
    } else {
      document.title = '221 Gourmet - Menu';
    }
  }, [settings?.restaurantName, mesaInfo?.numero]);

  const handleProductClick = (product: Product) => {
    if (expandedProduct === product.id) {
      setExpandedProduct(null);
      setExpandedImage(null);
    } else {
      setExpandedProduct(product.id);
      setExpandedImage(product.id);
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
    setExpandedImage(null);
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
    if (!mesaInfo) {
      alert(t('menu.tableInfoNotFound'));
      return;
    }

    const itensSelecionados = selectedItems.map(item => {
      const translatedProduct = getProductTranslation(item.product, i18n.language);
      return `${translatedProduct.name} (${item.quantity}x)${item.observations ? ` - ${item.observations}` : ''}`;
    });
    
    await addOrder({
      mesaId: mesaInfo.id,
      mesaNumero: mesaInfo.numero,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      status: 'novo',
      itens: itensSelecionados,
      tempoEspera: '15 min'
    });

    setSelectedItems([]);
    setExpandedItems([]);
    setShowConfirmation(false);
    alert(t('menu.orderSent', { number: mesaInfo.numero }));
  };

  // Agrupar produtos por categoria quando "Todos" estiver selecionado
  const getGroupedProducts = () => {
    if (selectedCategory === 'todos') {
      // Agrupar produtos por categoria
      const grouped = products.reduce((acc, product) => {
        const category = product.category || 'Sem Categoria';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(product);
        return acc;
      }, {} as Record<string, Product[]>);
      
      // Ordenar categorias alfabeticamente
      return Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([category, products]) => ({ category, products }));
    } else {
      // Retornar produtos filtrados por categoria específica
      const filtered = products.filter(product => product.category === selectedCategory);
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
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
        <div className="text-xl text-primary-800">{t('menu.loading')}</div>
      </div>
    );
  }

  if (!mesaInfo) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
        <div className="text-xl text-red-600">{t('menu.tableNotFound')}</div>
      </div>
    );
  }

  // Mostrar animação de carregamento se necessário
  if (showLoadingAnimation && settings) {
    return (
      <LoadingAnimation
        restaurantName={settings.restaurantName}
        bannerUrl={settings.bannerUrl}
        primaryColor={settings.primaryColor}
        secondaryColor={settings.secondaryColor}
        audioUrl={settings.audioUrl}
        onAnimationComplete={handleAnimationComplete}
      />
    );
  }

  // Tela de Confirmação do Pedido
  if (showConfirmation) {
    return (
      <div className="min-h-screen bg-secondary-50">
        {/* Header */}
        <div className="bg-primary-900 text-primary-100 py-6 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center">
              <div className="flex-1"></div>
              <div className="text-center">
                <h1 className="text-4xl font-serif font-bold mb-2">{settings?.restaurantName || '221 Gourmet'}</h1>
                <p className="text-primary-200 text-lg">{t('menu.table', { number: mesaInfo.numero })}</p>
              </div>
              <div className="flex-1 flex justify-end">
                <LanguageSelector />
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-6">
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
              {selectedItems.map((item) => {
                const translatedProduct = getProductTranslation(item.product, i18n.language);
                return (
                <div key={item.product.id} className="bg-white p-6 rounded-xl border-2 border-secondary-300 shadow-lg hover:shadow-xl transition-all duration-200">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-semibold text-primary-900 text-xl">
                      {translatedProduct.name}
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
                );
              })}
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

  // Tela Normal do Menu
  return (
    <div className="min-h-screen bg-secondary-50 animate-fadeInUp">
      {/* Header */}
      <div className="bg-primary-900 text-primary-100 py-6 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center">
            <div className="flex-1"></div>
            <div className="text-center">
              <h1 className="text-4xl font-serif font-bold mb-2">{settings?.restaurantName || '221 Gourmet'}</h1>
              <p className="text-primary-200 text-lg">{t('menu.table', { number: mesaInfo.numero })}</p>
            </div>
            <div className="flex-1 flex justify-end">
              <LanguageSelector />
            </div>
          </div>
        </div>
      </div>

      {settings?.bannerUrl && (
        <div className="bg-secondary-50 py-8 px-4">
          <div className="max-w-4xl mx-auto">
            <div 
              className="w-full h-32 rounded-lg overflow-hidden shadow-lg cursor-pointer hover:shadow-xl transition-shadow duration-300"
              onClick={(e) => handleImageClick(e, settings.bannerUrl!, 'Banner do restaurante')}
            >
              <img 
                src={settings.bannerUrl} 
                alt="Banner do restaurante" 
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Barra de Categorias */}
        <div className="mb-8">
          <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory('todos')}
              className={`flex-shrink-0 px-6 py-3 rounded-full font-medium transition-all ${
                selectedCategory === 'todos'
                  ? 'bg-primary-800 text-primary-100 shadow-lg'
                  : 'bg-secondary-200 text-primary-800 hover:bg-secondary-300'
              }`}
            >
              {t('menu.all')}
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.name)}
                className={`flex-shrink-0 px-6 py-3 rounded-full font-medium transition-all ${
                  selectedCategory === category.name
                    ? 'bg-primary-800 text-primary-100 shadow-lg'
                    : 'bg-secondary-200 text-primary-800 hover:bg-secondary-300'
                }`}
              >
                {getCategoryTranslation(category, i18n.language)}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de Produtos */}
        {loadingProducts ? (
          <div className="text-center py-12">
            <div className="text-primary-700 text-lg">{t('menu.loadingMenu')}</div>
          </div>
        ) : groupedProducts.length === 0 || groupedProducts.every(group => group.products.length === 0) ? (
          <div className="text-center py-12">
            <div className="text-primary-700 text-lg">
              {selectedCategory === 'todos' 
                ? t('menu.noProducts')
                : t('menu.noProductsCategory', { category: selectedCategory })
              }
            </div>
          </div>
        ) : (
          <div className="space-y-8 mb-8">
            {groupedProducts.map((group) => (
              <div key={group.category} className="space-y-4">
                {/* Cabeçalho da Categoria */}
                <div className="border-b-2 border-primary-200 pb-2">
                  <h2 className="text-2xl font-serif font-bold text-primary-900">
                    {(() => {
                      const category = categories.find(c => c.name === group.category);
                      return category ? getCategoryTranslation(category, i18n.language) : group.category;
                    })()}
                  </h2>
                </div>
                
                {/* Produtos da Categoria */}
                <div className="space-y-4">
                  {group.products.map((product) => {
                    const expandedItem = expandedItems.find(item => item.productId === product.id);
                    const selectedItem = selectedItems.find(item => item.product.id === product.id);
                    const translatedProduct = getProductTranslation(product, i18n.language);
                    const isImageExpanded = expandedImage === product.id;
                    
                    return (
                      <div key={product.id} className="bg-white rounded-xl shadow-lg border border-secondary-200 overflow-hidden hover:shadow-xl transition-all duration-200">
                        {/* Item Principal */}
                        <div 
                          className="p-6 hover:bg-secondary-50 transition-colors cursor-pointer"
                          onClick={() => handleProductClick(product)}
                        >
                          <div className={`flex gap-4 ${isImageExpanded ? 'flex-col' : ''}`}>
                            {/* Imagem do Produto */}
                            <div className={`flex-shrink-0 ${isImageExpanded ? 'w-full' : ''}`}>
                              <div 
                                className={`${isImageExpanded ? 'w-full h-48 image-expanded' : 'w-24 h-24'} bg-secondary-200 rounded-lg flex items-center justify-center overflow-hidden image-expand-transition ${isImageExpanded ? 'cursor-pointer hover:shadow-lg transition-shadow duration-300' : ''}`}
                                onClick={(e) => {
                                  if (isImageExpanded && product.image) {
                                    handleImageClick(e, product.image!, translatedProduct.name);
                                  }
                                }}
                              >
                                {product.image ? (
                                  <ProductImage 
                                    src={product.image} 
                                    alt={translatedProduct.name}
                                    className={`w-full h-full transition-transform duration-300 ${isImageExpanded ? 'hover:scale-105' : ''}`}
                                    containerClassName={isImageExpanded ? 'w-full h-48' : 'w-24 h-24'}
                                    onClick={(e) => {
                                      if (isImageExpanded) {
                                        handleImageClick(e, product.image!, translatedProduct.name);
                                      }
                                    }}
                                  />
                                ) : (
                                  <div className="text-center text-secondary-500">
                                    <p className="text-xs">Imagem</p>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Conteúdo do Produto */}
                            <div className={`flex-1 ${isImageExpanded ? 'mt-4' : ''}`}>
                              <div className="flex justify-between items-start mb-3">
                                <h3 className="text-xl font-serif font-semibold text-primary-900">
                                  {translatedProduct.name}
                                </h3>
                                <span className="text-lg font-bold text-primary-800 ml-4">
                                  R$ {product.price.toFixed(2)}
                                </span>
                              </div>
                              <p className="text-primary-700 text-sm leading-relaxed mb-3">
                                {translatedProduct.description}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-primary-600">
                                {product.preparationTime !== undefined && product.preparationTime !== null && product.preparationTime > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Clock size={12} />
                                    {product.preparationTime} {t('menu.min')}
                                  </span>
                                )}
                                {product.category && (
                                  <span className="bg-secondary-200 px-2 py-1 rounded-full flex items-center gap-1">
                                    <Tag size={12} />
                                    {(() => {
                                      const category = categories.find(c => c.name === product.category);
                                      return category ? getCategoryTranslation(category, i18n.language) : product.category;
                                    })()}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="ml-4">
                              {expandedProduct === product.id ? (
                                <ChevronDown size={20} className="text-primary-600" />
                              ) : (
                                <ChevronRight size={20} className="text-primary-600" />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Seção Expandida */}
                        {expandedProduct === product.id && expandedItem && (
                          <div className="bg-gradient-to-r from-secondary-50 to-secondary-100 px-6 py-6 border-t-2 border-secondary-200">
                            <div className="space-y-5">
                              <div>
                                <label className="block text-sm font-medium text-primary-800 mb-3">
                                  {t('menu.quantity')}
                                </label>
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (expandedItem.quantity > 1) {
                                        updateExpandedItem(product.id, { quantity: expandedItem.quantity - 1 });
                                      }
                                    }}
                                    className="w-10 h-10 bg-secondary-300 text-primary-800 rounded-full flex items-center justify-center hover:bg-secondary-400 transition-colors shadow-sm"
                                  >
                                    <Minus size={18} />
                                  </button>
                                  <span className="text-xl font-semibold text-primary-900 min-w-[3rem] text-center">
                                    {expandedItem.quantity}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateExpandedItem(product.id, { quantity: expandedItem.quantity + 1 });
                                    }}
                                    className="w-10 h-10 bg-secondary-300 text-primary-800 rounded-full flex items-center justify-center hover:bg-secondary-400 transition-colors shadow-sm"
                                  >
                                    <Plus size={18} />
                                  </button>
                                </div>
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium text-primary-800 mb-3">
                                  {t('menu.observations')}
                                </label>
                                <textarea
                                  placeholder={t('menu.observationsPlaceholder')}
                                  value={expandedItem.observations}
                                  onChange={(e) => {
                                    updateExpandedItem(product.id, { observations: e.target.value });
                                  }}
                                  className="w-full p-4 border-2 border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none shadow-sm"
                                  rows={3}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>

                              <div className="flex gap-4 pt-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddToOrder(product);
                                  }}
                                  className="flex-1 bg-primary-800 text-primary-100 py-3 px-6 rounded-lg font-medium hover:bg-primary-900 transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                                >
                                  <Plus size={18} />
                                  {t('menu.addToOrder')}
                                </button>
                                {selectedItem && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveFromOrder(product.id);
                                    }}
                                    className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center gap-2 shadow-md hover:shadow-lg"
                                  >
                                    <X size={18} />
                                    {t('menu.remove')}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Botão de Ver Pedido */}
        <div className="bg-primary-900 rounded-lg shadow-lg p-6">
          <button
            onClick={handleVerPedido}
            disabled={selectedItems.length === 0}
            className={`w-full py-4 px-6 rounded-lg text-xl font-serif font-semibold transition-all duration-200 border-2 flex items-center justify-center gap-2 ${
              selectedItems.length === 0
                ? 'bg-gray-400 text-gray-200 border-gray-300 cursor-not-allowed'
                : 'bg-primary-800 text-primary-100 border-primary-600 hover:bg-primary-900 hover:border-primary-700 hover:shadow-xl'
            }`}
          >
            <Eye size={24} />
            {selectedItems.length === 0 
              ? t('menu.selectAtLeastOne')
              : t('menu.viewOrderWithItems', { count: totalItems })
            }
          </button>
          
          {selectedItems.length > 0 && (
            <div className="mt-4 text-center text-primary-200">
              <p className="text-lg font-medium">
                {t('menu.total')} <span className="text-white font-bold">R$ {totalPrice.toFixed(2)}</span>
              </p>
            </div>
          )}
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