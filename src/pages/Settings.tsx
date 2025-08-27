import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Settings as SettingsIcon, Table as TableIcon, ArrowLeft, Plus, Trash2, Download, Eye, X, Utensils, Edit, Search, Palette, Save } from 'lucide-react';
import { addTable, getTables, deleteTable, generateTableUrl } from '../services/tableService';
import { addProduct, getProducts, updateProduct, deleteProduct } from '../services/productService';
import { addCategory, getCategories, updateCategory, deleteCategory as deleteCategoryService } from '../services/categoryService';
import { useSettings } from '../contexts/SettingsContext';
import { testAllCollections } from '../services/firestoreTest';
import { uploadImage, deleteImage } from '../services/storageService';
import { db } from '../../firebase';
import qrcode from 'qrcode';
import AdvancedTranslations from '../components/AdvancedTranslations';
import type { Table } from '../services/tableService';
import type { Product } from '../types/product';
import type { Category } from '../services/categoryService';

export default function Settings() {
  const { settings, updateSettings } = useSettings();
  const [activeTab, setActiveTab] = useState('mesas');
  const [mesas, setMesas] = useState<Table[]>([]);
  const [novaMesa, setNovaMesa] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Estados para produtos
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPrice, setFilterPrice] = useState<string>('all');
  const [filterTime, setFilterTime] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados para categorias
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState('');
  
  // Estados para personalização
  const [personalizationForm, setPersonalizationForm] = useState({
    restaurantName: '',
    primaryColor: '',
    secondaryColor: '',
    bannerUrl: ''
  });
  
  // Formulário de produto
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    preparationTime: '',
    available: true,
    image: '',
    allergens: [] as string[],
    tags: [] as string[]
  });
  
  // Estados para traduções
  const [productTranslations, setProductTranslations] = useState<{
    name?: { 'en-US': string; 'es-ES': string; 'fr-FR': string };
    description?: { 'en-US': string; 'es-ES': string; 'fr-FR': string };
  }>({});
  
  const [categoryTranslations, setCategoryTranslations] = useState<{
    name?: { 'en-US': string; 'es-ES': string; 'fr-FR': string };
  }>({});
  
  const [qrCodeModal, setQrCodeModal] = useState<{ show: boolean; url: string; numero: string }>({
    show: false,
    url: '',
    numero: ''
  });

  // Verificar se o Firebase está inicializado
  useEffect(() => {
    console.log('Firebase db inicializado:', !!db);
    if (!db) {
      console.error('Firebase não está inicializado!');
      alert('Erro: Firebase não está inicializado. Verifique a configuração.');
    } else {
      // Testar conectividade com o Firestore
      testFirestoreConnection();
    }
  }, []);

  // Atualizar título da aba do navegador
  useEffect(() => {
    if (settings?.restaurantName) {
      document.title = `${settings.restaurantName} - Configurações`;
    } else {
      document.title = '221 Gourmet - Configurações';
    }
  }, [settings?.restaurantName]);

  // Função para testar a conectividade com o Firestore
  const testFirestoreConnection = async () => {
    try {
      console.log('Testando conectividade com Firestore...');
      const success = await testAllCollections();
      if (success) {
        console.log('✅ Todos os testes de conectividade passaram');
      } else {
        console.error('❌ Alguns testes de conectividade falharam');
        alert('Problemas detectados na conectividade com o banco de dados. Verifique o console para mais detalhes.');
      }
    } catch (error) {
      console.error('Erro na conectividade com Firestore:', error);
      alert('Erro na conectividade com o banco de dados. Verifique as regras de segurança do Firestore.');
    }
  };

  // Carregar mesas do Firestore
  useEffect(() => {
    loadTables();
  }, []);

  // Carregar produtos do Firestore
  useEffect(() => {
    loadProducts();
  }, []);

  // Carregar configurações no formulário
  useEffect(() => {
    if (settings) {
      setPersonalizationForm({
        restaurantName: settings.restaurantName,
        primaryColor: settings.primaryColor,
        secondaryColor: settings.secondaryColor,
        bannerUrl: settings.bannerUrl || ''
      });
    }
  }, [settings]);

  const loadTables = async () => {
    try {
      setLoading(true);
      console.log('Carregando mesas...');
      const tables = await getTables();
      console.log('Mesas carregadas:', tables);
      setMesas(tables);
    } catch (error) {
      console.error('Erro ao carregar mesas:', error);
      alert('Erro ao carregar mesas. Verifique o console para mais detalhes.');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      console.log('Carregando produtos e categorias...');
      const productsData = await getProducts();
      const categoriesData = await getCategories();
      console.log('Produtos carregados:', productsData);
      console.log('Categorias carregadas:', categoriesData);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Erro ao carregar produtos/categorias:', error);
      alert('Erro ao carregar dados. Verifique o console para mais detalhes.');
    } finally {
      setLoadingProducts(false);
    }
  };

  const adicionarMesa = async () => {
    if (!novaMesa.trim()) {
      alert('Por favor, digite um número de mesa');
      return;
    }
    
    if (mesas.find(m => m.numero === novaMesa)) {
      alert('Mesa já existe!');
      return;
    }
    
    try {
      const novaMesaObj = await addTable(novaMesa);
      setMesas(prev => [...prev, novaMesaObj]);
      setNovaMesa('');
      setShowAddModal(false);
      alert(`Mesa ${novaMesa} adicionada com sucesso!`);
    } catch (error) {
      alert('Erro ao adicionar mesa. Tente novamente.');
    }
  };

  const removerMesa = async (id: string) => {
    try {
      await deleteTable(id);
      setMesas(prev => prev.filter(m => m.id !== id));
      alert('Mesa removida com sucesso!');
    } catch (error) {
      alert('Erro ao remover mesa. Tente novamente.');
    }
  };

  const visualizarQRCode = async (numeroMesa: string) => {
    try {
      const url = generateTableUrl(numeroMesa);
      const qrDataUrl = await qrcode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      setQrCodeModal({
        show: true,
        url: qrDataUrl,
        numero: numeroMesa
      });
    } catch (error) {
      alert('Erro ao gerar QR Code. Verifique se a biblioteca qrcode está instalada.');
    }
  };

  const baixarQRCode = async (numeroMesa: string) => {
    try {
      const url = generateTableUrl(numeroMesa);
      const qrDataUrl = await qrcode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      const link = document.createElement('a');
      link.href = qrDataUrl;
      link.download = `mesa-${numeroMesa}-qrcode.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      alert('Erro ao baixar QR Code. Verifique se a biblioteca qrcode está instalada.');
    }
  };

  // Funções para gerenciar produtos
  const openProductModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name,
        description: product.description,
        price: product.price.toString(),
        category: product.category,
        preparationTime: product.preparationTime?.toString() || '',
        available: product.available,
        image: product.image || '',
        allergens: product.allergens || [],
        tags: product.tags || []
      });
      setProductTranslations(product.translations || {});
    } else {
      setEditingProduct(null);
      setProductForm({
        name: '',
        description: '',
        price: '',
        category: '',
        preparationTime: '',
        available: true,
        image: '',
        allergens: [],
        tags: []
      });
      setProductTranslations({});
    }
    setShowProductModal(true);
  };

  const saveProduct = async () => {
    if (!productForm.name.trim() || !productForm.description.trim() || !productForm.price || !productForm.category) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    try {
      const productData = {
        name: productForm.name.trim(),
        description: productForm.description.trim(),
        price: parseFloat(productForm.price),
        category: productForm.category,
        preparationTime: productForm.preparationTime ? parseInt(productForm.preparationTime) : 0,
        available: productForm.available,
        image: productForm.image,
        allergens: productForm.allergens,
        tags: productForm.tags,
        translations: Object.keys(productTranslations).length > 0 ? productTranslations : undefined
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, productData);
        setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, ...productData } : p));
        alert(`Produto "${productData.name}" atualizado com sucesso!`);
      } else {
        const newProduct = await addProduct(productData);
        setProducts(prev => [...prev, newProduct]);
        alert(`Produto "${productData.name}" adicionado com sucesso!`);
      }

      setShowProductModal(false);
      loadProducts(); // Recarregar para atualizar categorias
    } catch (error) {
      alert('Erro ao salvar produto. Tente novamente.');
    }
  };

  const deleteProductItem = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este produto?')) {
      try {
        await deleteProduct(id);
        setProducts(prev => prev.filter(p => p.id !== id));
        alert('Produto excluído com sucesso!');
      } catch (error) {
        alert('Erro ao excluir produto. Tente novamente.');
      }
    }
  };

  // Funções para gerenciar categorias
  const openCategoryModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category.name);
      setCategoryForm(category.name);
      setCategoryTranslations(category.translations || {});
    } else {
      setEditingCategory(null);
      setCategoryForm('');
      setCategoryTranslations({});
    }
    setShowCategoryModal(true);
  };

  const saveCategory = async () => {
    if (!categoryForm.trim()) {
      alert('Por favor, digite um nome para a categoria');
      return;
    }

    try {
      if (editingCategory) {
        // Encontrar a categoria no array
        const categoryToUpdate = categories.find(c => c.name === editingCategory);
        if (categoryToUpdate) {
          await updateCategory(categoryToUpdate.id, categoryForm.trim(), Object.keys(categoryTranslations).length > 0 ? categoryTranslations : undefined);
          
          // Atualizar produtos que usam a categoria antiga
          const productsToUpdate = products.filter(p => p.category === editingCategory);
          for (const product of productsToUpdate) {
            await updateProduct(product.id, { category: categoryForm.trim() });
          }
          setProducts(prev => prev.map(p => 
            p.category === editingCategory ? { ...p, category: categoryForm.trim() } : p
          ));
        }
        alert('Categoria atualizada com sucesso!');
      } else {
        // Nova categoria
        const newCategory = await addCategory(categoryForm.trim(), Object.keys(categoryTranslations).length > 0 ? categoryTranslations : undefined);
        setCategories(prev => [...prev, newCategory]);
        alert('Categoria criada com sucesso!');
      }
      
      setShowCategoryModal(false);
      loadProducts(); // Recarregar para atualizar categorias
    } catch (error) {
      alert('Erro ao salvar categoria. Tente novamente.');
    }
  };

  const deleteCategory = async (category: Category) => {
    const productsInCategory = products.filter(p => p.category === category.name);
    
    if (productsInCategory.length > 0) {
      alert(`Não é possível excluir a categoria "${category.name}" pois existem ${productsInCategory.length} produto(s) associado(s). Remova ou altere os produtos primeiro.`);
      return;
    }

    if (window.confirm(`Tem certeza que deseja excluir a categoria "${category.name}"?`)) {
      try {
        await deleteCategoryService(category.id);
        setCategories(prev => prev.filter(c => c.id !== category.id));
        alert('Categoria excluída com sucesso!');
      } catch (error) {
        alert('Erro ao excluir categoria. Tente novamente.');
      }
    }
  };

  // Função para salvar personalização
  // Função para fazer upload do banner
  const handleBannerUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione apenas arquivos de imagem');
        return;
      }

      // Validar tamanho (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Arquivo muito grande. Máximo 5MB permitido.');
        return;
      }

      // Fazer upload para o Firebase Storage
      const result = await uploadImage(file, 'banners', 'restaurant-banner');
      
      if (result.success) {
        // Atualizar o formulário com a nova URL
        setPersonalizationForm(prev => ({
          ...prev,
          bannerUrl: result.url
        }));
        alert(`Banner enviado com sucesso! URL: ${result.url.substring(0, 50)}...`);
      } else {
        alert(`Erro ao enviar banner: ${result.error}`);
      }
    } catch (error) {
      console.error('Erro no upload do banner:', error);
      alert('Erro ao enviar banner. Tente novamente.');
    }
  };

  // Função para remover o banner
  const handleBannerRemove = async () => {
    if (!personalizationForm.bannerUrl) return;

    try {
      // Extrair o path da URL para deletar do Storage
      const url = new URL(personalizationForm.bannerUrl);
      const pathMatch = url.pathname.match(/\/o\/(.+?)\?/);
      
      if (pathMatch) {
        const imagePath = decodeURIComponent(pathMatch[1]);
        await deleteImage(imagePath);
      }

      // Limpar o formulário
      setPersonalizationForm(prev => ({
        ...prev,
        bannerUrl: ''
      }));
      
      alert('Banner removido com sucesso!');
    } catch (error) {
      console.error('Erro ao remover banner:', error);
      alert('Erro ao remover banner. Tente novamente.');
    }
  };

  // Função para fazer upload da imagem do produto
  const handleProductImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione apenas arquivos de imagem');
        return;
      }

      // Validar tamanho (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Arquivo muito grande. Máximo 5MB permitido.');
        return;
      }

      // Fazer upload para o Firebase Storage
      const result = await uploadImage(file, 'products', 'product-image');
      
      if (result.success) {
        // Atualizar o formulário com a nova URL
        setProductForm(prev => ({
          ...prev,
          image: result.url
        }));
        alert(`Imagem enviada com sucesso! URL: ${result.url.substring(0, 50)}...`);
      } else {
        alert(`Erro ao enviar imagem: ${result.error}`);
      }
    } catch (error) {
      console.error('Erro no upload da imagem:', error);
      alert('Erro ao enviar imagem. Tente novamente.');
    }
  };

  // Função para remover a imagem do produto
  const handleProductImageRemove = async () => {
    if (!productForm.image) return;

    try {
      // Extrair o path da URL para deletar do Storage
      const url = new URL(productForm.image);
      const pathMatch = url.pathname.match(/\/o\/(.+?)\?/);
      
      if (pathMatch) {
        const imagePath = decodeURIComponent(pathMatch[1]);
        await deleteImage(imagePath);
      }

      // Limpar o formulário
      setProductForm(prev => ({
        ...prev,
        image: ''
      }));
      
      alert('Imagem removida com sucesso!');
    } catch (error) {
      console.error('Erro ao remover imagem:', error);
      alert('Erro ao remover imagem. Tente novamente.');
    }
  };

  const savePersonalization = async () => {
    if (!personalizationForm.restaurantName.trim()) {
      alert('Por favor, digite o nome do restaurante');
      return;
    }

    try {
      await updateSettings({
        restaurantName: personalizationForm.restaurantName.trim(),
        primaryColor: personalizationForm.primaryColor,
        secondaryColor: personalizationForm.secondaryColor,
        bannerUrl: personalizationForm.bannerUrl
      });
      alert('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      alert('Erro ao salvar configurações. Tente novamente.');
    }
  };

  // Filtrar produtos
  const filteredProducts = products.filter(product => {
    // Filtro por categoria
    if (filterCategory !== 'all' && product.category !== filterCategory) return false;
    
    // Filtro por preço
    if (filterPrice !== 'all') {
      const price = product.price;
      switch (filterPrice) {
        case 'low': if (price > 20) return false; break;
        case 'medium': if (price < 20 || price > 50) return false; break;
        case 'high': if (price < 50) return false; break;
      }
    }
    
    // Filtro por tempo de preparo
    if (filterTime !== 'all') {
      const time = product.preparationTime || 0;
      switch (filterTime) {
        case 'fast': if (time > 15) return false; break;
        case 'medium': if (time < 15 || time > 30) return false; break;
        case 'slow': if (time < 30) return false; break;
      }
    }
    
    // Filtro por busca
    if (searchTerm && !product.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !product.description.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <SettingsIcon className="w-8 h-8 text-gray-600" />
            <h1 className="text-3xl font-bold">Configurações</h1>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={testFirestoreConnection}
              className="bg-yellow-500 text-white px-4 py-2 rounded flex items-center space-x-2 hover:bg-yellow-600"
            >
              <SettingsIcon className="w-4 h-4" />
              <span>Testar Conexão</span>
            </button>
            <Link 
              to="/staff" 
              className="flex items-center space-x-2 bg-gray-500 text-white px-4 py-2 rounded"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar para Cozinha</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r min-h-screen">
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">Configurações</h2>
            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab('mesas')}
                className={`w-full text-left p-3 rounded flex items-center space-x-3 ${
                  activeTab === 'mesas' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <TableIcon className="w-5 h-5" />
                <span>Gerenciar Mesas</span>
              </button>
              <button
                onClick={() => setActiveTab('cardapio')}
                className={`w-full text-left p-3 rounded flex items-center space-x-3 ${
                  activeTab === 'cardapio' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Utensils className="w-5 h-5" />
                <span>Gerenciar Cardápio</span>
              </button>
              <button
                onClick={() => setActiveTab('personalizacao')}
                className={`w-full text-left p-3 rounded flex items-center space-x-3 ${
                  activeTab === 'personalizacao' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Palette className="w-5 h-5" />
                <span>Personalização</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Conteúdo Principal */}
        <div className="flex-1 p-8">
          {activeTab === 'mesas' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Gerenciar Mesas</h2>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-blue-500 text-white px-4 py-2 rounded flex items-center space-x-2 hover:bg-blue-600"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar Mesa</span>
                </button>
              </div>

              <div className="bg-white rounded shadow">
                <div className="p-6 border-b">
                  <h3 className="text-lg font-semibold">Mesas Configuradas</h3>
                </div>
                {loading ? (
                  <div className="p-6 text-center text-gray-500">
                    Carregando mesas...
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-4 font-medium">Mesa</th>
                          <th className="text-left p-4 font-medium">URL</th>
                          <th className="text-left p-4 font-medium">QR Code</th>
                          <th className="text-left p-4 font-medium">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {mesas.map((mesa) => (
                          <tr key={mesa.id} className="hover:bg-gray-50">
                            <td className="p-4 font-medium">Mesa {mesa.numero}</td>
                            <td className="p-4 text-sm text-gray-600 font-mono">
                              {generateTableUrl(mesa.numero)}
                            </td>
                            <td className="p-4">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => visualizarQRCode(mesa.numero)}
                                  className="bg-blue-500 text-white px-3 py-1 rounded text-sm flex items-center space-x-1 hover:bg-blue-600"
                                >
                                  <Eye className="w-4 h-4" />
                                  <span>Visualizar</span>
                                </button>
                                <button
                                  onClick={() => baixarQRCode(mesa.numero)}
                                  className="bg-green-500 text-white px-3 py-1 rounded text-sm flex items-center space-x-1 hover:bg-green-600"
                                >
                                  <Download className="w-4 h-4" />
                                  <span>Baixar</span>
                                </button>
                              </div>
                            </td>
                            <td className="p-4">
                              <button
                                onClick={() => removerMesa(mesa.id)}
                                className="bg-red-500 text-white px-3 py-1 rounded text-sm flex items-center space-x-1 hover:bg-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Remover</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'cardapio' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Gerenciar Cardápio</h2>
                <button
                  onClick={() => openProductModal()}
                  className="bg-green-500 text-white px-4 py-2 rounded flex items-center space-x-2 hover:bg-green-600"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar Produto</span>
                </button>
              </div>

              {/* Filtros */}
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Busca */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Nome ou descrição..."
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>

                  {/* Filtro por categoria */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="all">Todas as categorias</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.name}>{category.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Filtro por preço */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Preço</label>
                    <select
                      value={filterPrice}
                      onChange={(e) => setFilterPrice(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="all">Todos os preços</option>
                      <option value="low">Até R$ 20,00</option>
                      <option value="medium">R$ 20,00 - R$ 50,00</option>
                      <option value="high">Acima de R$ 50,00</option>
                    </select>
                  </div>

                  {/* Filtro por tempo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tempo de Preparo</label>
                    <select
                      value={filterTime}
                      onChange={(e) => setFilterTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="all">Todos os tempos</option>
                      <option value="fast">Até 15 min</option>
                      <option value="medium">15 - 30 min</option>
                      <option value="slow">Acima de 30 min</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Lista de Produtos */}
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Produtos do Cardápio</h3>
                    <span className="text-sm text-gray-500">
                      {filteredProducts.length} produto{filteredProducts.length !== 1 ? 's' : ''} encontrado{filteredProducts.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                {loadingProducts ? (
                  <div className="p-6 text-center text-gray-500">
                    Carregando produtos...
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    Nenhum produto encontrado
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-4 font-medium">Produto</th>
                          <th className="text-left p-4 font-medium">Categoria</th>
                          <th className="text-left p-4 font-medium">Preço</th>
                          <th className="text-left p-4 font-medium">Tempo</th>
                          <th className="text-left p-4 font-medium">Status</th>
                          <th className="text-left p-4 font-medium">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredProducts.map((product) => (
                          <tr key={product.id} className="hover:bg-gray-50">
                            <td className="p-4">
                              <div className="flex items-center space-x-3">
                                {/* Imagem do Produto */}
                                <div className="flex-shrink-0">
                                  {product.image ? (
                                    <img 
                                      src={product.image} 
                                      alt={product.name}
                                      className="w-12 h-12 object-cover rounded-lg border"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                                      <span className="text-gray-400 text-xs">📷</span>
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900">{product.name}</div>
                                  <div className="text-sm text-gray-500">{product.description}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {product.category}
                              </span>
                            </td>
                            <td className="p-4 font-medium text-green-600">
                              R$ {product.price.toFixed(2)}
                            </td>
                            <td className="p-4 text-sm text-gray-600">
                              {product.preparationTime || 0} min
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                product.available 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {product.available ? 'Disponível' : 'Indisponível'}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => openProductModal(product)}
                                  className="bg-blue-500 text-white px-3 py-1 rounded text-sm flex items-center space-x-1 hover:bg-blue-600 transition-colors"
                                  title={`Editar ${product.name}`}
                                >
                                  <Edit className="w-4 h-4" />
                                  <span>Editar</span>
                                </button>
                                <button
                                  onClick={() => deleteProductItem(product.id)}
                                  className="bg-red-500 text-white px-3 py-1 rounded text-sm flex items-center space-x-1 hover:bg-red-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span>Excluir</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Gerenciamento de Categorias */}
              <div className="bg-white rounded-lg shadow mt-6">
                <div className="p-6 border-b">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Gerenciar Categorias</h3>
                    <button
                      onClick={() => openCategoryModal()}
                      className="bg-blue-500 text-white px-3 py-1 rounded text-sm flex items-center space-x-1 hover:bg-blue-600"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Nova Categoria</span>
                    </button>
                  </div>
                </div>
                {categories.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    Nenhuma categoria cadastrada
                  </div>
                ) : (
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {categories.map((category) => {
                        const productsInCategory = products.filter(p => p.category === category.name);
                        return (
                          <div key={category.id} className="border rounded-lg p-4 hover:bg-gray-50">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-medium text-gray-900">{category.name}</h4>
                              <div className="flex space-x-1">
                                <button
                                  onClick={() => openCategoryModal(category)}
                                  className="text-blue-600 hover:text-blue-800 text-sm"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => deleteCategory(category)}
                                  className="text-red-600 hover:text-red-800 text-sm"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            <div className="text-sm text-gray-500">
                              {productsInCategory.length} produto(s)
                            </div>
                            {productsInCategory.length > 0 && (
                              <div className="mt-2 text-xs text-gray-400">
                                {productsInCategory.slice(0, 3).map(p => p.name).join(', ')}
                                {productsInCategory.length > 3 && '...'}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

          {activeTab === 'personalizacao' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Personalização</h2>
                <button
                  onClick={savePersonalization}
                  className="bg-green-500 text-white px-4 py-2 rounded flex items-center space-x-2 hover:bg-green-600"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Configurações</span>
                </button>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-6">Configurações do Restaurante</h3>
                
                <div className="space-y-6">
                  {/* Nome do Restaurante */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome do Restaurante
                    </label>
                    <input
                      type="text"
                      value={personalizationForm.restaurantName}
                      onChange={(e) => setPersonalizationForm(prev => ({ ...prev, restaurantName: e.target.value }))}
                      placeholder="Ex: 221 Gourmet"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Este nome aparecerá no cabeçalho do cardápio
                    </p>
                  </div>

                  {/* Cores */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Cor Primária */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cor Primária
                      </label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="color"
                          value={personalizationForm.primaryColor}
                          onChange={(e) => setPersonalizationForm(prev => ({ ...prev, primaryColor: e.target.value }))}
                          className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={personalizationForm.primaryColor}
                          onChange={(e) => setPersonalizationForm(prev => ({ ...prev, primaryColor: e.target.value }))}
                          placeholder="#92400e"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Cor principal para headers, botões e destaques
                      </p>
                    </div>

                    {/* Cor Secundária */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cor Secundária
                      </label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="color"
                          value={personalizationForm.secondaryColor}
                          onChange={(e) => setPersonalizationForm(prev => ({ ...prev, secondaryColor: e.target.value }))}
                          className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={personalizationForm.secondaryColor}
                          onChange={(e) => setPersonalizationForm(prev => ({ ...prev, secondaryColor: e.target.value }))}
                          placeholder="#fffbeb"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Cor de fundo e elementos secundários
                      </p>
                    </div>
                  </div>

                  {/* Banner do Restaurante */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Banner do Restaurante
                    </label>
                    <div className="space-y-4">
                      {/* Banner atual */}
                      {personalizationForm.bannerUrl && (
                        <div className="relative">
                          <img 
                            src={personalizationForm.bannerUrl} 
                            alt="Banner atual" 
                            className="w-full h-32 object-cover rounded-lg border"
                          />
                          <button
                            onClick={handleBannerRemove}
                            className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                            title="Remover banner"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      
                      {/* Upload de novo banner */}
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleBannerUpload}
                          className="hidden"
                          id="banner-upload"
                        />
                        <label 
                          htmlFor="banner-upload"
                          className="cursor-pointer flex flex-col items-center space-y-2"
                        >
                          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                            <Plus className="w-6 h-6 text-gray-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700">
                              {personalizationForm.bannerUrl ? 'Alterar Banner' : 'Adicionar Banner'}
                            </p>
                            <p className="text-xs text-gray-500">
                              Clique para selecionar uma imagem (máx. 5MB)
                            </p>
                          </div>
                        </label>
                      </div>
                      <p className="text-sm text-gray-500">
                        O banner aparecerá no topo do cardápio dos clientes
                      </p>
                    </div>
                  </div>

                  {/* Preview */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prévia do Cardápio
                    </label>
                    <div 
                      className="border rounded-lg p-0 overflow-hidden"
                      style={{ backgroundColor: personalizationForm.secondaryColor }}
                    >
                      {/* Banner */}
                      {personalizationForm.bannerUrl && (
                        <div className="w-full h-20 overflow-hidden">
                          <img 
                            src={personalizationForm.bannerUrl} 
                            alt="Banner" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      
                      {/* Header */}
                      <div 
                        className="text-white p-4 text-center font-serif text-xl font-bold"
                        style={{ backgroundColor: personalizationForm.primaryColor }}
                      >
                        {personalizationForm.restaurantName || 'Nome do Restaurante'}
                      </div>
                      
                      {/* Categorias */}
                      <div className="p-4">
                        <div className="flex gap-2 mb-4">
                          <span 
                            className="px-3 py-1 rounded-full text-sm font-medium text-white"
                            style={{ backgroundColor: personalizationForm.primaryColor }}
                          >
                            Lanches
                          </span>
                          <span 
                            className="px-3 py-1 rounded-full text-sm font-medium"
                            style={{ 
                              backgroundColor: `${personalizationForm.secondaryColor}dd`,
                              color: personalizationForm.primaryColor 
                            }}
                          >
                            Bebidas
                          </span>
                        </div>
                        
                        {/* Produto */}
                        <div className="bg-white p-3 rounded border-l-4" style={{ borderLeftColor: personalizationForm.primaryColor }}>
                          <div className="flex justify-between items-center">
                            <span className="font-medium" style={{ color: personalizationForm.primaryColor }}>
                              X-Burger Especial
                            </span>
                            <span className="font-bold" style={{ color: personalizationForm.primaryColor }}>
                              R$ 25,90
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            Hambúrguer artesanal com queijo, alface e tomate
                          </p>
                          <div className="mt-2">
                            <span 
                              className="text-xs px-2 py-1 rounded-full" 
                              style={{ 
                                backgroundColor: `${personalizationForm.secondaryColor}aa`,
                                color: personalizationForm.primaryColor 
                              }}
                            >
                              15 min
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Modal para Adicionar Mesa */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Adicionar Nova Mesa</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNovaMesa('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número da Mesa
                </label>
                <input
                  type="text"
                  value={novaMesa}
                  onChange={(e) => setNovaMesa(e.target.value)}
                  placeholder="Ex: 15"
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && adicionarMesa()}
                  autoFocus
                />
              </div>
              <div className="flex space-x-2 justify-end">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setNovaMesa('');
                  }}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={adicionarMesa}
                  disabled={!novaMesa.trim()}
                  className={`px-4 py-2 rounded ${
                    novaMesa.trim() 
                      ? 'bg-blue-500 text-white hover:bg-blue-600' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Adicionar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Adicionar/Editar Produto */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold">
                  {editingProduct ? 'Editar Produto' : 'Adicionar Novo Produto'}
                </h3>
                {editingProduct && (
                  <p className="text-sm text-gray-500 mt-1">
                    Editando: {editingProduct.name}
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowProductModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome do Produto *
                  </label>
                  <input
                    type="text"
                    value={productForm.name}
                    onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Hambúrguer Clássico"
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoria *
                  </label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Selecione uma categoria</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.name}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição *
                </label>
                <textarea
                  value={productForm.description}
                  onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva o produto..."
                  rows={3}
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Campo de Imagem */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Imagem do Produto
                </label>
                <div className="w-full">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProductImageUpload}
                    className="hidden"
                    id="product-image-upload"
                  />
                  <label 
                    htmlFor="product-image-upload"
                    className="cursor-pointer"
                  >
                    <div className="w-32 h-32 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-gray-400 transition-colors">
                      {productForm.image ? (
                        <div className="relative w-full h-full">
                          <img 
                            src={productForm.image} 
                            alt="Preview"
                            className="w-full h-full object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleProductImageRemove();
                            }}
                            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                            title="Remover imagem"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="text-center text-gray-500">
                          <div className="text-2xl mb-1">📷</div>
                          <p className="text-xs">Clique para adicionar</p>
                          <p className="text-xs">imagem</p>
                        </div>
                      )}
                    </div>
                  </label>
                  <p className="text-xs text-gray-500 mt-2">
                    Clique no espaço acima para fazer upload de uma imagem (máx. 5MB)
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preço (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={productForm.price}
                    onChange={(e) => setProductForm(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="0.00"
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tempo de Preparo (min)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={productForm.preparationTime}
                    onChange={(e) => setProductForm(prev => ({ ...prev, preparationTime: e.target.value }))}
                    placeholder="0"
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <div className="flex items-center mt-2">
                    <input
                      type="checkbox"
                      checked={productForm.available}
                      onChange={(e) => setProductForm(prev => ({ ...prev, available: e.target.checked }))}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 text-sm text-gray-700">
                      Disponível
                    </label>
                  </div>
                </div>
              </div>
              
              {/* Configurações Avançadas - Traduções */}
              <AdvancedTranslations
                type="product"
                translations={productTranslations}
                onTranslationsChange={setProductTranslations}
              />
              
              <div className="flex space-x-2 justify-end">
                <button
                  onClick={() => setShowProductModal(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveProduct}
                  disabled={!productForm.name.trim() || !productForm.description.trim() || !productForm.price || !productForm.category}
                  className={`px-4 py-2 rounded ${
                    productForm.name.trim() && productForm.description.trim() && productForm.price && productForm.category
                      ? 'bg-green-500 text-white hover:bg-green-600' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {editingProduct ? 'Atualizar' : 'Adicionar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Adicionar/Editar Categoria */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
              </h3>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome da Categoria
                </label>
                <input
                  type="text"
                  value={categoryForm}
                  onChange={(e) => setCategoryForm(e.target.value)}
                  placeholder="Ex: Lanches"
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && saveCategory()}
                  autoFocus
                />
              </div>
              {editingCategory && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Atenção:</strong> Alterar o nome da categoria irá atualizar todos os produtos que a utilizam.
                  </p>
                </div>
              )}
              
              {/* Configurações Avançadas - Traduções */}
              <AdvancedTranslations
                type="category"
                translations={categoryTranslations}
                onTranslationsChange={setCategoryTranslations}
              />
              
              <div className="flex space-x-2 justify-end">
                <button
                  onClick={() => setShowCategoryModal(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveCategory}
                  disabled={!categoryForm.trim()}
                  className={`px-4 py-2 rounded ${
                    categoryForm.trim() 
                      ? 'bg-blue-500 text-white hover:bg-blue-600' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {editingCategory ? 'Atualizar' : 'Criar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal do QR Code */}
      {qrCodeModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">QR Code - Mesa {qrCodeModal.numero}</h3>
              <button
                onClick={() => setQrCodeModal({ show: false, url: '', numero: '' })}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="text-center">
              <img 
                src={qrCodeModal.url} 
                alt={`QR Code Mesa ${qrCodeModal.numero}`}
                className="mx-auto mb-4"
              />
              <p className="text-sm text-gray-600 mb-4">
                URL: {generateTableUrl(qrCodeModal.numero)}
              </p>
              <div className="flex space-x-2 justify-center">
                <button
                  onClick={() => baixarQRCode(qrCodeModal.numero)}
                  className="bg-green-500 text-white px-4 py-2 rounded flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar</span>
                </button>
                <button
                  onClick={() => setQrCodeModal({ show: false, url: '', numero: '' })}
                  className="bg-gray-500 text-white px-4 py-2 rounded"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 