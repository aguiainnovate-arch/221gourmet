import { useParams } from 'react-router-dom';
import { useOrders } from '../contexts/OrderContext';
import { useEffect, useState } from 'react';
import { getTables } from '../services/tableService';
import { getProducts } from '../services/productService';
import { getCategories } from '../services/categoryService';
import { ChevronDown, ChevronRight, Plus, Minus, Send, X, Clock, Tag, Eye, Check, ArrowLeft } from 'lucide-react';
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
      alert('Selecione pelo menos um item para ver o pedido!');
      return;
    }
    setShowConfirmation(true);
  };

  const handleCancelarPedido = () => {
    setShowConfirmation(false);
  };

  const handleConfirmarPedido = async () => {
    if (!mesaInfo) {
      alert('Informações da mesa não encontradas!');
      return;
    }

    const itensSelecionados = selectedItems.map(item => 
      `${item.product.name} (${item.quantity}x)${item.observations ? ` - ${item.observations}` : ''}`
    );
    
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
    alert(`Pedido enviado da Mesa ${mesaInfo.numero}! Verifique na página da cozinha.`);
  };

  const filteredProducts = selectedCategory === 'todos' 
    ? products 
    : products.filter(product => product.category === selectedCategory);

  const totalItems = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = selectedItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-xl text-amber-800">Carregando...</div>
      </div>
    );
  }

  if (!mesaInfo) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-xl text-red-600">Mesa não encontrada!</div>
      </div>
    );
  }

  // Tela de Confirmação do Pedido
  if (showConfirmation) {
    return (
      <div className="min-h-screen bg-amber-50">
        {/* Header */}
        <div className="bg-amber-900 text-amber-100 py-6 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center">
              <h1 className="text-4xl font-serif font-bold mb-2">221 Gourmet</h1>
              <p className="text-amber-200 text-lg">Mesa {mesaInfo.numero}</p>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Botão Voltar */}
          <div className="mb-6">
            <button
              onClick={handleCancelarPedido}
              className="flex items-center gap-2 text-amber-800 hover:text-amber-900 font-medium"
            >
              <ArrowLeft size={20} />
              Voltar ao Cardápio
            </button>
          </div>

          {/* Card de Confirmação */}
          <div className="bg-amber-50 rounded-lg p-8 border-2 border-amber-300 shadow-lg mb-6">
            <h2 className="text-3xl font-serif font-bold text-amber-900 mb-6 text-center">
              Confirme seu Pedido
            </h2>
            
            <div className="space-y-4 mb-8">
              {selectedItems.map((item) => (
                <div key={item.product.id} className="bg-amber-50 p-6 rounded-lg border border-amber-200 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-amber-900 text-xl">
                      {item.product.name}
                    </h3>
                    <span className="text-amber-800 font-bold text-xl">
                      R$ {(item.product.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-6 text-sm text-amber-700 mb-3">
                    <span className="flex items-center gap-1">
                      <Tag size={14} />
                      Quantidade: {item.quantity}
                    </span>
                    <span>•</span>
                    <span>R$ {item.product.price.toFixed(2)} cada</span>
                  </div>
                  {item.observations && (
                    <div className="bg-amber-100 p-3 rounded-lg text-sm text-amber-800 border border-amber-200">
                      <strong>Observações:</strong> {item.observations}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t-2 border-amber-300 pt-6">
              <div className="flex justify-between items-center text-2xl font-bold text-amber-900 mb-3">
                <span>Total do Pedido:</span>
                <span>R$ {totalPrice.toFixed(2)}</span>
              </div>
              <div className="text-center text-amber-700">
                <p className="text-lg">Mesa {mesaInfo.numero} • {totalItems} itens</p>
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
              Cancelar
            </button>
            <button
              onClick={handleConfirmarPedido}
              className="flex-1 bg-green-600 text-white py-4 px-6 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-lg"
            >
              <Check size={24} />
              Confirmar Pedido
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Tela Normal do Menu
  return (
    <div className="min-h-screen bg-amber-50">
      {/* Header */}
      <div className="bg-amber-900 text-amber-100 py-6 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl font-serif font-bold mb-2">221 Gourmet</h1>
            <p className="text-amber-200 text-lg">Mesa {mesaInfo.numero}</p>
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
                  ? 'bg-amber-800 text-amber-100 shadow-lg'
                  : 'bg-amber-200 text-amber-800 hover:bg-amber-300'
              }`}
            >
              Todos
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.name)}
                className={`flex-shrink-0 px-6 py-3 rounded-full font-medium transition-all ${
                  selectedCategory === category.name
                    ? 'bg-amber-800 text-amber-100 shadow-lg'
                    : 'bg-amber-200 text-amber-800 hover:bg-amber-300'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de Produtos */}
        {loadingProducts ? (
          <div className="text-center py-12">
            <div className="text-amber-700 text-lg">Carregando cardápio...</div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-amber-700 text-lg">
              {selectedCategory === 'todos' 
                ? 'Nenhum produto disponível no momento'
                : `Nenhum produto disponível na categoria "${selectedCategory}"`
              }
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
            <div className="divide-y divide-amber-200">
              {filteredProducts.map((product) => {
                const expandedItem = expandedItems.find(item => item.productId === product.id);
                const selectedItem = selectedItems.find(item => item.product.id === product.id);
                
                return (
                  <div key={product.id}>
                    {/* Item Principal */}
                    <div 
                      className="p-6 hover:bg-amber-50 transition-colors cursor-pointer"
                      onClick={() => handleProductClick(product)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="text-xl font-serif font-semibold text-amber-900">
                              {product.name}
                            </h3>
                            <span className="text-lg font-bold text-amber-800 ml-4">
                              R$ {product.price.toFixed(2)}
                            </span>
                          </div>
                          <p className="text-amber-700 text-sm leading-relaxed mb-2">
                            {product.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-amber-600">
                            {product.preparationTime && (
                              <span className="flex items-center gap-1">
                                <Clock size={12} />
                                {product.preparationTime} min
                              </span>
                            )}
                            {product.category && (
                              <span className="bg-amber-100 px-2 py-1 rounded-full flex items-center gap-1">
                                <Tag size={12} />
                                {product.category}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="ml-4">
                          {expandedProduct === product.id ? (
                            <ChevronDown size={20} className="text-amber-600" />
                          ) : (
                            <ChevronRight size={20} className="text-amber-600" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Seção Expandida */}
                    {expandedProduct === product.id && expandedItem && (
                      <div className="bg-amber-50 px-6 py-4 border-t border-amber-200">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-amber-800 mb-2">
                              Quantidade:
                            </label>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (expandedItem.quantity > 1) {
                                    updateExpandedItem(product.id, { quantity: expandedItem.quantity - 1 });
                                  }
                                }}
                                className="w-8 h-8 bg-amber-200 text-amber-800 rounded-full flex items-center justify-center hover:bg-amber-300 transition-colors"
                              >
                                <Minus size={16} />
                              </button>
                              <span className="text-lg font-semibold text-amber-900 min-w-[2rem] text-center">
                                {expandedItem.quantity}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateExpandedItem(product.id, { quantity: expandedItem.quantity + 1 });
                                }}
                                className="w-8 h-8 bg-amber-200 text-amber-800 rounded-full flex items-center justify-center hover:bg-amber-300 transition-colors"
                              >
                                <Plus size={16} />
                              </button>
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-amber-800 mb-2">
                              Observações:
                            </label>
                            <textarea
                              placeholder="Ex: Sem cebola, bem passado, etc..."
                              value={expandedItem.observations}
                              onChange={(e) => {
                                updateExpandedItem(product.id, { observations: e.target.value });
                              }}
                              className="w-full p-3 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
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
                              className="flex-1 bg-amber-800 text-amber-100 py-2 px-4 rounded-lg font-medium hover:bg-amber-900 transition-colors flex items-center justify-center gap-2"
                            >
                              <Plus size={16} />
                              Adicionar ao Pedido
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
                                Remover
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
        <div className="bg-amber-900 rounded-lg shadow-lg p-6">
          <button
            onClick={handleVerPedido}
            disabled={selectedItems.length === 0}
            className={`w-full py-4 px-6 rounded-lg text-xl font-serif font-semibold transition-colors border-2 flex items-center justify-center gap-2 ${
              selectedItems.length === 0
                ? 'bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed'
                : 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
            }`}
          >
            <Eye size={20} />
            Ver Pedido {selectedItems.length > 0 && `(${totalItems} itens)`}
          </button>
        </div>
      </div>
    </div>
  );
} 