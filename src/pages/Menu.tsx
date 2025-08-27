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
import { ChevronDown, ChevronRight, Plus, Minus, X, Clock, Tag, Eye, Check, ArrowLeft } from 'lucide-react';
import type { Table } from '../services/tableService';
import type { Product } from '../types/product';
import type { Category } from '../services/categoryService';

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
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);

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

  const filteredProducts = selectedCategory === 'todos' 
    ? products 
    : products.filter(product => product.category === selectedCategory);

  const totalItems = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = selectedItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

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
                <div key={item.product.id} className="bg-white p-6 rounded-lg border border-secondary-300 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-primary-900 text-xl">
                      {translatedProduct.name}
                    </h3>
                    <span className="text-primary-800 font-bold text-xl">
                      R$ {(item.product.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-6 text-sm text-primary-700 mb-3">
                    <span className="flex items-center gap-1">
                      <Tag size={14} />
                      {t('menu.quantity')} {item.quantity}
                    </span>
                    <span>•</span>
                    <span>R$ {item.product.price.toFixed(2)} {t('menu.each')}</span>
                  </div>
                  {item.observations && (
                    <div className="bg-secondary-200 p-3 rounded-lg text-sm text-primary-800 border border-secondary-300">
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
      </div>
    );
  }

  // Tela Normal do Menu
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

      <div className="bg-secondary-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="w-full h-32 bg-secondary-100 rounded-lg flex items-center justify-center">
            <div className="text-center text-secondary-600">
              <p className="text-lg font-medium">Banner do Restaurante</p>
              <p className="text-sm opacity-70">Espaço para imagem promocional</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Barra de Categorias */}
        <div className="mb-8">
          <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide">
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
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-primary-700 text-lg">
              {selectedCategory === 'todos' 
                ? t('menu.noProducts')
                : t('menu.noProductsCategory', { category: selectedCategory })
              }
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
            <div className="divide-y divide-secondary-200">
              {filteredProducts.map((product) => {
                const expandedItem = expandedItems.find(item => item.productId === product.id);
                const selectedItem = selectedItems.find(item => item.product.id === product.id);
                const translatedProduct = getProductTranslation(product, i18n.language);
                
                return (
                  <div key={product.id}>
                    {/* Item Principal */}
                    <div 
                      className="p-6 hover:bg-secondary-50 transition-colors cursor-pointer"
                      onClick={() => handleProductClick(product)}
                    >
                      <div className="flex gap-4">
                        {/* Imagem do Produto */}
                        <div className="flex-shrink-0">
                          <div className="w-24 h-24 bg-secondary-200 rounded-lg flex items-center justify-center">
                            {product.image ? (
                              <img 
                                src={product.image} 
                                alt={translatedProduct.name}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <div className="text-center text-secondary-500">
                                <p className="text-xs">Imagem</p>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Conteúdo do Produto */}
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="text-xl font-serif font-semibold text-primary-900">
                              {translatedProduct.name}
                            </h3>
                            <span className="text-lg font-bold text-primary-800 ml-4">
                              R$ {product.price.toFixed(2)}
                            </span>
                          </div>
                          <p className="text-primary-700 text-sm leading-relaxed mb-2">
                            {translatedProduct.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-primary-600">
                            {product.preparationTime && (
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
                      <div className="bg-secondary-100 px-6 py-4 border-t border-secondary-200">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-primary-800 mb-2">
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
                                className="w-8 h-8 bg-secondary-300 text-primary-800 rounded-full flex items-center justify-center hover:bg-secondary-400 transition-colors"
                              >
                                <Minus size={16} />
                              </button>
                              <span className="text-lg font-semibold text-primary-900 min-w-[2rem] text-center">
                                {expandedItem.quantity}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateExpandedItem(product.id, { quantity: expandedItem.quantity + 1 });
                                }}
                                className="w-8 h-8 bg-secondary-300 text-primary-800 rounded-full flex items-center justify-center hover:bg-secondary-400 transition-colors"
                              >
                                <Plus size={16} />
                              </button>
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-primary-800 mb-2">
                              {t('menu.observations')}
                            </label>
                            <textarea
                              placeholder={t('menu.observationsPlaceholder')}
                              value={expandedItem.observations}
                              onChange={(e) => {
                                updateExpandedItem(product.id, { observations: e.target.value });
                              }}
                              className="w-full p-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                              rows={2}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>

                          <div className="flex gap-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddToOrder(product);
                              }}
                              className="flex-1 bg-primary-800 text-primary-100 py-2 px-4 rounded-lg font-medium hover:bg-primary-900 transition-colors flex items-center justify-center gap-2"
                            >
                              <Plus size={16} />
                              {t('menu.addToOrder')}
                            </button>
                            {selectedItem && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveFromOrder(product.id);
                                }}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
                              >
                                <X size={16} />
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
        )}

        {/* Botão de Ver Pedido */}
        <div className="bg-primary-900 rounded-lg shadow-lg p-6">
          <button
            onClick={handleVerPedido}
            disabled={selectedItems.length === 0}
            className={`w-full py-4 px-6 rounded-lg text-xl font-serif font-semibold transition-colors border-2 flex items-center justify-center gap-2 ${
              selectedItems.length === 0
                ? 'bg-gray-400 text-gray-200 border-gray-300 cursor-not-allowed'
                : 'bg-primary-800 text-primary-100 border-primary-700 hover:bg-primary-900 hover:border-primary-800'
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
    </div>
  );
} 