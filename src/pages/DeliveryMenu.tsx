import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Minus, X, ShoppingCart, MapPin, User, Phone, CreditCard, Bike, Search } from 'lucide-react';
import { getProducts } from '../services/productService';
import { getCategories } from '../services/categoryService';
import { getRestaurants } from '../services/restaurantService';
import { createDeliveryOrder } from '../services/deliveryService';
import { getProductTranslation, getCategoryTranslation } from '../utils/translationUtils';
import { useDeliveryAuth } from '../contexts/DeliveryAuthContext';
import { saveDeliveryUser } from '../services/deliveryUserService';
import type { Product } from '../types/product';
import type { Category } from '../services/categoryService';
import type { Restaurant } from '../types/restaurant';
import type { DeliveryOrderItem } from '../types/delivery';
import LanguageSelector from '../components/LanguageSelector';
import ProductImage from '../components/ProductImage';

interface SelectedItem {
  product: Product;
  quantity: number;
  observations: string;
}

export default function DeliveryMenu() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user, updateUser } = useDeliveryAuth();
  
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCheckout, setShowCheckout] = useState(false);

  // Dados do cliente
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [customerAddress, setCustomerAddress] = useState(user?.address || '');
  const [paymentMethod, setPaymentMethod] = useState<'money' | 'credit' | 'debit' | 'pix'>(
    user?.defaultPaymentMethod || 'money'
  );
  const [observations, setObservations] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const deliveryFee = 5.00; // Taxa de entrega fixa

  // Carregar informações do usuário quando ele estiver logado
  useEffect(() => {
    if (user) {
      setCustomerName(user.name);
      setCustomerPhone(user.phone);
      setCustomerAddress(user.address);
      setPaymentMethod(user.defaultPaymentMethod);
    }
  }, [user]);

  useEffect(() => {
    loadRestaurantData();
  }, [restaurantId]);

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
      
      // Filtrar apenas produtos disponíveis E disponíveis para delivery
      // Se availableForDelivery não está definido, usar true como padrão
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

  const filteredProducts = selectedCategory === 'todos'
    ? products
    : products.filter(p => p.category === selectedCategory);

  const addToCart = (product: Product) => {
    const existing = selectedItems.find(item => item.product.id === product.id);

    if (existing) {
      setSelectedItems(selectedItems.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setSelectedItems([...selectedItems, { product, quantity: 1, observations: '' }]);
    }
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity === 0) {
      setSelectedItems(selectedItems.filter(item => item.product.id !== productId));
    } else {
      setSelectedItems(selectedItems.map(item =>
        item.product.id === productId
          ? { ...item, quantity: newQuantity }
          : item
      ));
    }
  };

  const updateObservations = (productId: string, obs: string) => {
    setSelectedItems(selectedItems.map(item =>
      item.product.id === productId
        ? { ...item, observations: obs }
        : item
    ));
  };

  const calculateTotal = () => {
    const subtotal = selectedItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    return subtotal + deliveryFee;
  };

  const handleSubmitOrder = async () => {
    if (!restaurant || !customerName || !customerPhone || !customerAddress) {
      alert('Por favor, preencha todos os dados para entrega');
      return;
    }

    if (selectedItems.length === 0) {
      alert('Adicione pelo menos um item ao carrinho');
      return;
    }

    try {
      setIsSubmitting(true);

      // Se o usuário estiver logado, atualizar suas informações salvas
      if (user) {
        try {
          const updatedUser = await saveDeliveryUser({
            name: customerName,
            email: user.email,
            phone: customerPhone,
            address: customerAddress,
            defaultPaymentMethod: paymentMethod
          });
          updateUser(updatedUser);
        } catch (error) {
          console.error('Erro ao atualizar informações do usuário:', error);
          // Não falha o pedido se a atualização do usuário falhar
        }
      }

      const orderItems: DeliveryOrderItem[] = selectedItems.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
        observations: item.observations
      }));

      await createDeliveryOrder({
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        customerName,
        customerPhone,
        customerAddress,
        items: orderItems,
        total: calculateTotal(),
        paymentMethod,
        deliveryFee,
        observations
      });

      alert('Pedido realizado com sucesso! O restaurante receberá em breve.');
      navigate('/delivery/orders', { state: { phone: customerPhone } });
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      alert('Erro ao realizar pedido. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando cardápio...</p>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Restaurante não encontrado</h2>
          <button
            onClick={() => navigate('/delivery')}
            className="text-amber-600 hover:text-amber-700 font-semibold"
          >
            Voltar para lista de restaurantes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
      {/* Header - overflow-visible para searchbar não ser cortada */}
      <div className="relative w-full min-w-0 overflow-visible">
        {/* Restaurant Banner Background */}
        <div
          className="h-48 bg-cover bg-center relative"
          style={{
            backgroundImage: restaurant.theme?.logo ? `url(${restaurant.theme.logo})` : `linear-gradient(135deg, ${restaurant.theme?.primaryColor || '#92400e'}, ${restaurant.theme?.secondaryColor || '#d97706'})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/40"></div>

          {/* Navigation - safe-area para notch */}
          <div className="absolute top-4 pt-[env(safe-area-inset-top,0px)] left-4 right-4 flex items-center justify-between z-10">
            <button
              onClick={() => navigate('/delivery')}
              className="flex items-center text-white hover:text-gray-200 transition-colors duration-200 bg-black/20 backdrop-blur-sm px-3 py-2 rounded-full"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Voltar
            </button>
            <LanguageSelector />
          </div>

          {/* Restaurant Info - min-w-0 + truncate para textos longos */}
          <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
            <div className="flex items-end gap-3 min-w-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-lg shadow-lg flex items-center justify-center flex-shrink-0">
                <span className="text-xl sm:text-2xl font-bold" style={{ color: restaurant.theme?.primaryColor || '#92400e' }}>
                  {restaurant.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0 text-white">
                <h1 className="text-lg sm:text-2xl font-bold mb-1 truncate" title={restaurant.name}>{restaurant.name}</h1>
                <div className="flex items-center gap-2 sm:gap-4 text-sm text-white/90 flex-wrap">
                  <div className="flex items-center flex-shrink-0">
                    <span className="text-yellow-400 mr-1">★</span>
                    <span>4.5</span>
                  </div>
                  <div className="flex items-center min-w-0">
                    <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                    <span className="truncate" title={restaurant.address}>{restaurant.address}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Delivery Info Card */}
        <div className="bg-white mx-4 mt-4 rounded-lg shadow-lg p-4 relative z-20">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 min-w-0">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">Aberto</span>
              </div>
              <div className="text-sm text-gray-500 truncate">
                Pedido mínimo R$ 15,00
              </div>
            </div>
            <button className="text-red-500 text-sm font-medium hover:text-red-600 flex-shrink-0 min-h-[44px] flex items-center">
              Ver mais
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex-1 bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Bike className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Entrega</span>
                </div>
                <div className="text-xs text-gray-500">▼</div>
              </div>
            </div>

            <div className="flex-1 bg-gray-50 rounded-lg p-3">
              <div className="text-sm font-medium text-gray-700">Hoje</div>
              <div className="text-xs text-gray-500">25-35 min • R$ 5,99</div>
            </div>
          </div>
        </div>

        {/* Search Bar - w-full + safe-area para não cortar nas laterais no mobile */}
        <div
          className="w-full mt-4 box-border"
          style={{
            paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))',
            paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))',
          }}
        >
          <div className="relative w-full max-w-full min-w-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
            <input
              type="search"
              placeholder="Buscar no cardápio"
              className="w-full max-w-full min-w-0 min-h-[44px] pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent shadow-sm box-border"
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Menu */}
          <div className="lg:col-span-2">
            {/* Categories - rolagem horizontal, touch 44px */}
            <div className="mb-6 -mx-4 px-4">
              <div
                className="flex gap-2 overflow-x-auto pb-2 overflow-y-hidden scrollbar-hide"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                <button
                  onClick={() => setSelectedCategory('todos')}
                  className={`flex-shrink-0 min-h-[44px] px-4 py-2 rounded-full font-medium whitespace-nowrap transition-all duration-200 ${selectedCategory === 'todos'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                    }`}
                >
                  {t('menu.allCategories')}
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.name)}
                    className={`flex-shrink-0 min-h-[44px] px-4 py-2 rounded-full font-medium whitespace-nowrap max-w-[180px] truncate transition-all duration-200 ${selectedCategory === category.name
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                      }`}
                    title={getCategoryTranslation(category, i18n.language)}
                  >
                    {getCategoryTranslation(category, i18n.language)}
                  </button>
                ))}
              </div>
            </div>

            {/* Products */}
            <div className="space-y-4">
              {filteredProducts.map((product) => {
                const itemInCart = selectedItems.find(item => item.product.id === product.id);

                const tr = getProductTranslation(product, i18n.language);
                return (
                  <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg flex-shrink-0 bg-gray-200 flex items-center justify-center overflow-hidden aspect-square">
                          {product.image ? (
                            <ProductImage
                              src={product.image}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-center text-gray-400 p-2">
                              <div className="text-xs font-medium">📷</div>
                              <div className="text-xs">Sem imagem</div>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-1 line-clamp-2" title={tr.name}>
                            {tr.name}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                            {tr.description}
                          </p>
                          <p className="text-lg sm:text-xl font-bold text-amber-600 whitespace-nowrap">
                            R$ {product.price.toFixed(2)}
                          </p>
                        </div>

                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          {itemInCart ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => updateQuantity(product.id, itemInCart.quantity - 1)}
                                className="min-w-[44px] min-h-[44px] w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300"
                                aria-label="Diminuir quantidade"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="font-bold min-w-[1.5rem] text-center">{itemInCart.quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(product.id, itemInCart.quantity + 1)}
                                className="min-w-[44px] min-h-[44px] w-10 h-10 bg-amber-600 text-white rounded-full flex items-center justify-center hover:bg-amber-700"
                                aria-label="Aumentar quantidade"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => addToCart(product)}
                              className="bg-amber-600 text-white min-h-[44px] px-4 py-2 rounded-lg hover:bg-amber-700 font-semibold flex items-center gap-2"
                              aria-label={`Adicionar ${tr.name}`}
                            >
                              <Plus className="w-4 h-4 flex-shrink-0" />
                              <span>Adicionar</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {itemInCart && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <input
                            type="text"
                            placeholder="Observações (ex: sem cebola)"
                            value={itemInCart.observations}
                            onChange={(e) => updateObservations(product.id, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cart Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg border border-stone-100 p-6 sticky top-4">
              <h2 className="text-xl font-bold text-stone-800 mb-4 flex items-center">
                <span className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center mr-3">
                  <ShoppingCart className="w-5 h-5 text-amber-600" />
                </span>
                Seu Pedido
              </h2>

              {selectedItems.length === 0 ? (
                <p className="text-stone-500 text-center py-8">Carrinho vazio</p>
              ) : (
                <>
                  <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                    {selectedItems.map((item) => (
                      <div key={item.product.id} className="flex justify-between items-start text-sm">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-stone-700">{item.quantity}x {item.product.name}</p>
                          {item.observations && (
                            <p className="text-xs text-stone-500 mt-1">Obs: {item.observations}</p>
                          )}
                        </div>
                        <p className="font-semibold text-stone-800 ml-2 shrink-0">R$ {(item.product.price * item.quantity).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-stone-200 pt-4 space-y-2">
                    <div className="flex justify-between text-sm text-stone-600">
                      <span>Subtotal</span>
                      <span>R$ {(calculateTotal() - deliveryFee).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-stone-600">
                      <span className="flex items-center">
                        <Bike className="w-4 h-4 mr-1.5 text-stone-500" />
                        Taxa de entrega
                      </span>
                      <span>R$ {deliveryFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center font-bold text-lg pt-3 mt-3 border-t-2 border-amber-100 bg-amber-50/80 rounded-lg px-3 py-2.5">
                      <span className="text-stone-700">Total</span>
                      <span className="text-amber-700">R$ {calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowCheckout(true)}
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white py-3.5 rounded-xl font-bold shadow-md hover:from-amber-600 hover:to-amber-700 active:scale-[0.98] transition-all mt-4"
                  >
                    Finalizar Pedido
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Finalizar Pedido</h2>
                <button
                  onClick={() => setShowCheckout(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {user && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
                  ✓ Suas informações foram preenchidas automaticamente. Você pode editá-las se necessário.
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4 inline mr-2" />
                    Nome completo
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-gray-900 placeholder:text-gray-500 bg-white"
                    placeholder="Seu nome"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone className="w-4 h-4 inline mr-2" />
                    Telefone
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-gray-900 placeholder:text-gray-500 bg-white"
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="w-4 h-4 inline mr-2" />
                    Endereço de entrega
                  </label>
                  <textarea
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-gray-900 placeholder:text-gray-500 bg-white"
                    rows={3}
                    placeholder="Rua, número, complemento, bairro, cidade"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <CreditCard className="w-4 h-4 inline mr-2" />
                    Forma de pagamento
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-gray-900 bg-white"
                  >
                    <option value="money">Dinheiro</option>
                    <option value="credit">Cartão de Crédito</option>
                    <option value="debit">Cartão de Débito</option>
                    <option value="pix">PIX</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observações (opcional)
                  </label>
                  <textarea
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-gray-900 placeholder:text-gray-500 bg-white"
                    rows={2}
                    placeholder="Informações adicionais para o restaurante"
                  />
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Resumo do pedido</h3>
                  <div className="space-y-1 text-sm text-gray-700">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>R$ {(calculateTotal() - deliveryFee).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Taxa de entrega</span>
                      <span>R$ {deliveryFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-300 text-gray-900">
                      <span>Total</span>
                      <span className="text-amber-600">R$ {calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowCheckout(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmitOrder}
                  disabled={isSubmitting || !customerName || !customerPhone || !customerAddress}
                  className={`flex-1 px-6 py-3 rounded-lg font-bold ${isSubmitting || !customerName || !customerPhone || !customerAddress
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-amber-600 text-white hover:bg-amber-700'
                    }`}
                >
                  {isSubmitting ? 'Enviando...' : 'Confirmar Pedido'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

