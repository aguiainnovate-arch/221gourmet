import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getProducts } from '../services/productService';
import { getCategories } from '../services/categoryService';
import { getProductTranslation, getCategoryTranslation } from '../utils/translationUtils';
import { ChevronDown, ChevronRight, Clock, Tag } from 'lucide-react';
import type { Product } from '../types/product';
import type { Category } from '../services/categoryService';
import ProductImage from './ProductImage';
import LanguageSelector from './LanguageSelector';

interface MenuPreviewProps {
  restaurantName?: string;
  primaryColor?: string;
  secondaryColor?: string;
  bannerUrl?: string;
  className?: string;
}

export default function MenuPreview({ 
  restaurantName = '221 Gourmet', 
  primaryColor = '#1e3a8a', 
  secondaryColor = '#f3f4f6',
  bannerUrl,
  className = ''
}: MenuPreviewProps) {
  const { t, i18n } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [productsData, categoriesData] = await Promise.all([
          getProducts(),
          getCategories()
        ]);
        
        // Mostrar apenas produtos disponíveis e limitar a 5 para a prévia
        setProducts(productsData.filter(p => p.available).slice(0, 5));
        setCategories(categoriesData);
      } catch (error) {
        console.error('Erro ao carregar dados para prévia:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Aplicar cores personalizadas na prévia
  useEffect(() => {
    const root = document.documentElement;
    
    if (primaryColor) {
      root.style.setProperty('--preview-primary', primaryColor);
    }
    if (secondaryColor) {
      root.style.setProperty('--preview-secondary', secondaryColor);
    }

    return () => {
      root.style.removeProperty('--preview-primary');
      root.style.removeProperty('--preview-secondary');
    };
  }, [primaryColor, secondaryColor]);

  const handleProductClick = (product: Product) => {
    if (expandedProduct === product.id) {
      setExpandedProduct(null);
      setExpandedImage(null);
    } else {
      setExpandedProduct(product.id);
      setExpandedImage(product.id);
    }
  };

  // Agrupar produtos por categoria quando "Todos" estiver selecionado
  const getGroupedProducts = () => {
    if (selectedCategory === 'todos') {
      const grouped = products.reduce((acc, product) => {
        const category = product.category || 'Sem Categoria';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(product);
        return acc;
      }, {} as Record<string, Product[]>);
      
      return Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([category, products]) => ({ category, products }));
    } else {
      const filtered = products.filter(product => product.category === selectedCategory);
      return [{ category: selectedCategory, products: filtered }];
    }
  };

  const groupedProducts = getGroupedProducts();

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border overflow-hidden ${className}`}>
        <div className="p-8 text-center text-gray-500">
          Carregando prévia do cardápio...
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border overflow-hidden mx-auto ${className}`} style={{ backgroundColor: secondaryColor, maxWidth: '375px' }}>
      {/* Header */}
      <div 
        className="text-white py-3 px-3"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="flex justify-between items-center">
          <div className="flex-1"></div>
          <div className="text-center">
            <h1 className="text-xl font-serif font-bold mb-1">{restaurantName}</h1>
            <p className="text-xs opacity-90">{t('menu.table', { number: '01' })}</p>
          </div>
          <div className="flex-1 flex justify-end">
            <div className="scale-75">
              <LanguageSelector />
            </div>
          </div>
        </div>
      </div>

      {/* Banner */}
      {bannerUrl && (
        <div className="bg-gray-50 py-3 px-3">
          <div className="w-full h-16 rounded-lg overflow-hidden shadow-md">
            <img 
              src={bannerUrl} 
              alt="Banner do restaurante" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}

      <div className="p-3">
        {/* Barra de Categorias */}
        <div className="mb-4">
          <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory('todos')}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full font-medium transition-all text-xs ${
                selectedCategory === 'todos'
                  ? 'text-white shadow-md'
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
              style={{ 
                backgroundColor: selectedCategory === 'todos' ? primaryColor : undefined,
                color: selectedCategory === 'todos' ? 'white' : primaryColor
              }}
            >
              {t('menu.all')}
            </button>
            {categories.slice(0, 2).map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.name)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full font-medium transition-all text-xs ${
                  selectedCategory === category.name
                    ? 'text-white shadow-md'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
                style={{ 
                  backgroundColor: selectedCategory === category.name ? primaryColor : undefined,
                  color: selectedCategory === category.name ? 'white' : primaryColor
                }}
              >
                {getCategoryTranslation(category, i18n.language)}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de Produtos */}
        {products.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-500 text-sm">
              {t('menu.noProducts')}
            </div>
          </div>
        ) : (
          <div className="space-y-4 mb-4">
            {groupedProducts.map((group) => (
              <div key={group.category} className="space-y-2">
                {/* Cabeçalho da Categoria */}
                <div className="border-b pb-1" style={{ borderColor: primaryColor + '33' }}>
                  <h2 className="text-sm font-serif font-bold" style={{ color: primaryColor }}>
                    {(() => {
                      const category = categories.find(c => c.name === group.category);
                      return category ? getCategoryTranslation(category, i18n.language) : group.category;
                    })()}
                  </h2>
                </div>
                
                {/* Produtos da Categoria */}
                <div className="space-y-2">
                  {group.products.slice(0, 2).map((product) => {
                    const translatedProduct = getProductTranslation(product, i18n.language);
                    const isImageExpanded = expandedImage === product.id;
                    
                    return (
                      <div key={product.id} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200">
                        {/* Item Principal */}
                        <div 
                          className="p-3 hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => handleProductClick(product)}
                        >
                          <div className={`flex gap-2.5 ${isImageExpanded ? 'flex-col' : ''}`}>
                            {/* Imagem do Produto */}
                            <div className={`flex-shrink-0 ${isImageExpanded ? 'w-full' : ''}`}>
                              <div 
                                className={`${isImageExpanded ? 'w-full h-24' : 'w-12 h-12'} bg-gray-200 rounded-md flex items-center justify-center overflow-hidden transition-all duration-300`}
                              >
                                {product.image ? (
                                  <ProductImage 
                                    src={product.image} 
                                    alt={translatedProduct.name}
                                    className="w-full h-full"
                                    containerClassName={isImageExpanded ? 'w-full h-24' : 'w-12 h-12'}
                                  />
                                ) : (
                                  <div className="text-center text-gray-400">
                                    <p className="text-xs">Img</p>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Conteúdo do Produto */}
                            <div className={`flex-1 ${isImageExpanded ? 'mt-2' : ''}`}>
                              <div className="flex justify-between items-start mb-1">
                                <h3 className="text-sm font-serif font-semibold" style={{ color: primaryColor }}>
                                  {translatedProduct.name}
                                </h3>
                                <span className="text-xs font-bold ml-2" style={{ color: primaryColor }}>
                                  R$ {product.price.toFixed(2)}
                                </span>
                              </div>
                              <p className="text-gray-600 text-xs leading-relaxed mb-1.5">
                                {translatedProduct.description}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                {product.preparationTime && product.preparationTime > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Clock size={8} />
                                    {product.preparationTime} {t('menu.min')}
                                  </span>
                                )}
                                {product.category && (
                                  <span className="bg-gray-200 px-1.5 py-0.5 rounded-full flex items-center gap-1 text-xs">
                                    <Tag size={8} />
                                    {(() => {
                                      const category = categories.find(c => c.name === product.category);
                                      return category ? getCategoryTranslation(category, i18n.language) : product.category;
                                    })()}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="ml-1">
                              {expandedProduct === product.id ? (
                                <ChevronDown size={14} className="text-gray-400" />
                              ) : (
                                <ChevronRight size={14} className="text-gray-400" />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Seção Expandida */}
                        {expandedProduct === product.id && (
                          <div className="bg-gray-50 px-3 py-3 border-t border-gray-200">
                            <div className="space-y-2.5">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                  {t('menu.quantity')}
                                </label>
                                <div className="flex items-center gap-2">
                                  <button className="w-6 h-6 bg-gray-300 text-gray-700 rounded-full flex items-center justify-center text-xs">
                                    -
                                  </button>
                                  <span className="text-xs font-semibold text-gray-900 min-w-[1.5rem] text-center">
                                    1
                                  </span>
                                  <button className="w-6 h-6 bg-gray-300 text-gray-700 rounded-full flex items-center justify-center text-xs">
                                    +
                                  </button>
                                </div>
                              </div>
                              
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                  {t('menu.observations')}
                                </label>
                                <textarea
                                  placeholder={t('menu.observationsPlaceholder')}
                                  className="w-full p-2 border border-gray-300 rounded text-xs resize-none"
                                  rows={2}
                                />
                              </div>

                              <div className="flex gap-2 pt-1">
                                <button
                                  className="flex-1 text-white py-1.5 px-3 rounded text-xs font-medium flex items-center justify-center gap-1 shadow-sm"
                                  style={{ backgroundColor: primaryColor }}
                                >
                                  + {t('menu.addToOrder')}
                                </button>
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
        <div 
          className="rounded-lg shadow-md p-3 mt-4"
          style={{ backgroundColor: primaryColor }}
        >
          <button
            className="w-full py-2.5 px-3 rounded-lg text-xs font-serif font-semibold transition-all duration-200 border-2 flex items-center justify-center gap-1 bg-white"
            style={{ 
              color: primaryColor,
              borderColor: primaryColor + '40'
            }}
          >
            {t('menu.selectAtLeastOne')}
          </button>
        </div>
      </div>
    </div>
  );
}
