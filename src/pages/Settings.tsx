import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRestaurantAuth } from '../contexts/RestaurantAuthContext';
import RestaurantLoginModal from '../components/RestaurantLoginModal';
import PasswordInput from '../components/PasswordInput';
import { Link, useSearchParams } from 'react-router-dom';
import { Settings as SettingsIcon, Table as TableIcon, ArrowLeft, Plus, Trash2, Download, X, Utensils, Edit, Search, Palette, Save, Sparkles, Upload, FileText, Music, Volume2, BarChart3, TrendingUp, Users, Calendar, ChefHat, Clock, CheckCircle, AlertCircle, RefreshCw, Package, Timer, Truck, MapPin, Phone, CreditCard, Menu, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  getTables,
  updateTable,
  deleteTable,
  generateTableUrl,
  canOpenTable,
  type Table
} from '../services/tableService';
import {
  getAreas,
  addArea,
  deleteArea,
  type Area
} from '../services/areaService';
import { openSession } from '../services/tableSessionService';
import {
  logTableEvent,
  getTableAuditEvents,
  type TableAuditEvent
} from '../services/tableAuditService';
import { getMaxTablesForRestaurant } from '../services/planService';
import { addProduct, updateProduct, deleteProduct } from '../services/productService';
import { addCategory, updateCategory, deleteCategory as deleteCategoryService } from '../services/categoryService';
import { useSettings } from '../contexts/SettingsContext';
import { useOrders } from '../contexts/OrderContext';
import { useRestaurantData } from '../hooks/useRestaurantData';
import { testAllCollections } from '../services/firestoreTest';
import {
  uploadImage,
  deleteImage,
  uploadAudio,
  deleteAudio,
  uploadProductImage,
  extractStoragePathFromUrl,
  uploadMenuPdfForExtraction
} from '../services/storageService';
import { extractMenuPdfTextFromStorage } from '../services/menuPdfExtractService';
import { importMenuFromClaudeText as runClaudeMenuImport } from '../services/menuClaudeImportService';
import type { ImportMenuFromClaudeResponse } from '../services/menuClaudeImportService';
import { importProductsFromCSV, generateCSVTemplate } from '../services/csvImportService';
import { getStatistics, type GeneralStats } from '../services/statisticsService';
import { hasRestaurantPermission } from '../services/permissionService';
import { translateProduct } from '../services/openaiService';
import { getDeliveryOrdersByRestaurant, updateDeliveryOrderStatus, cancelDeliveryOrder, subscribeDeliveryOrdersByRestaurant } from '../services/deliveryService';
import {
  startRestaurantStripeConnectOnboarding,
  syncRestaurantStripeConnectFromStripe,
} from '../services/restaurantStripeConnectService';
import { playNotificationSound, getNotificationSoundEnabled, setNotificationSoundEnabled } from '../utils/notificationSound';
import { getRestaurants } from '../services/restaurantService';
import type { DeliveryOrder } from '../types/delivery';
import { db } from '../../firebase';
import qrcode from 'qrcode';
import AdvancedTranslations from '../components/AdvancedTranslations';
import VisaoSalao from '../components/mesas/VisaoSalao';
import HistoricoAuditoria from '../components/mesas/HistoricoAuditoria';
import DetalheMesaModal from '../components/mesas/DetalheMesaModal';
import SidebarLogoutButton from '../components/SidebarLogoutButton';
import { extractColorsFromImage } from '../utils/colorExtractor';
import type { Product } from '../types/product';
import type { Category } from '../services/categoryService';
import ProductImage from '../components/ProductImage';
import MenuPreview from '../components/MenuPreview';
import ThemeColorsPanel from '../components/ThemeColorsPanel';
import {
  PanelPage,
  PanelPageHeader,
  PanelCard,
  PanelCardHeader,
  PanelButton,
  PanelTabGroup,
  PanelTab,
  PanelEmptyState,
  PanelStatCard,
  panelInputClass,
  panelLabelClass,
  panelSelectClass,
} from '../components/panel';

export default function Settings() {
  const { settings, updateSettings } = useSettings();
  const { orders, updateOrderStatus, deleteOrder, refreshOrders, setRestaurantId } = useOrders();
  const { products, categories, restaurantId, reload: reloadRestaurantData } = useRestaurantData();
  const { isAuthenticated, currentRestaurantId, logout, isLoading: authLoading } = useRestaurantAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('mesas');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [mesas, setMesas] = useState<Table[]>([]);
  const [mesaToast, setMesaToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [mesasSubTab, setMesasSubTab] = useState<'salao' | 'historico'>('salao');
  const [areas, setAreas] = useState<Area[]>([]);
  const [maxTables, setMaxTables] = useState<number>(999);
  const [selectedMesaDetail, setSelectedMesaDetail] = useState<Table | null>(null);
  const [auditEvents, setAuditEvents] = useState<TableAuditEvent[]>([]);
  const [auditFilters, setAuditFilters] = useState<{ mesaId?: string; since?: string }>({});
  const [loading, setLoading] = useState(true);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPrice, setFilterPrice] = useState<string>('all');
  const [filterTime, setFilterTime] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para permissões
  const [hasAutomaticTranslation, setHasAutomaticTranslation] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [hasImageMenuTransfer, setHasImageMenuTransfer] = useState(false);

  // Estados para importação por imagem
  const [showImageImportModal, setShowImageImportModal] = useState(false);
  const [imageImportFile, setImageImportFile] = useState<File | null>(null);
  const [imageImportPreview, setImageImportPreview] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [autoTranslateOnImport, setAutoTranslateOnImport] = useState(false);
  const [imageImportResult, setImageImportResult] = useState<{
    success: boolean;
    message: string;
    imported?: number;
    errors?: string[];
  } | null>(null);

  // Estados para categorias
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState('');

  // Estados para personalização
  const [personalizationForm, setPersonalizationForm] = useState({
    restaurantName: '',
    primaryColor: '',
    secondaryColor: '',
    bannerUrl: '',
    audioUrl: ''
  });

  // Estados para extração de cores
  const [extractedColors, setExtractedColors] = useState<{
    primaryColor: string;
    secondaryColor: string;
    palette: string[];
  } | null>(null);
  const [isExtractingColors, setIsExtractingColors] = useState(false);
  const [isSavingPersonalization, setIsSavingPersonalization] = useState(false);
  const [personalizationToast, setPersonalizationToast] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const lastSettingsSyncRef = useRef<number | null>(null);

  // Estados para relatórios
  const [statistics, setStatistics] = useState<GeneralStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'all'>('week');

  // Estados para delivery
  const [deliveryEnabled, setDeliveryEnabled] = useState(false);
  const [deliveryDescription, setDeliveryDescription] = useState('');
  const [productDeliverySettings, setProductDeliverySettings] = useState<Record<string, boolean>>({});
  const [isSavingDelivery, setIsSavingDelivery] = useState(false);

  // Estados para gerenciamento de pedidos de delivery na cozinha
  const [kitchenSubTab, setKitchenSubTab] = useState<'mesa' | 'delivery'>('mesa');
  const [deliveryOrders, setDeliveryOrders] = useState<DeliveryOrder[]>([]);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<DeliveryOrder | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [deliveryToast, setDeliveryToast] = useState<{ message: string; orderId: string } | null>(null);
  const [deliveryPendingCount, setDeliveryPendingCount] = useState(0);

  const [stripeConnectBanner, setStripeConnectBanner] = useState<string | null>(null);
  const [restaurantAccountEmail, setRestaurantAccountEmail] = useState('');
  const [stripeConnectAccountId, setStripeConnectAccountId] = useState<string | undefined>(undefined);
  const [stripeConnectChargesEnabled, setStripeConnectChargesEnabled] = useState<boolean | undefined>(
    undefined
  );
  const [stripeConnectDetailsSubmitted, setStripeConnectDetailsSubmitted] = useState<boolean | undefined>(
    undefined
  );
  const [stripeConnectDisabledReason, setStripeConnectDisabledReason] = useState<string | null>(null);
  const [stripeConnectRequirementsSummary, setStripeConnectRequirementsSummary] = useState<string | null>(
    null
  );
  const [stripeModalOpen, setStripeModalOpen] = useState(false);
  const [stripeModalAction, setStripeModalAction] = useState<'onboard' | 'sync'>('onboard');
  const [stripeModalPassword, setStripeModalPassword] = useState('');
  const [stripeModalBusy, setStripeModalBusy] = useState(false);
  const [stripeModalError, setStripeModalError] = useState<string | null>(null);
  const [notificationSoundEnabled, setNotificationSoundEnabledState] = useState(true);
  const [selectedDeliveryOrder, setSelectedDeliveryOrder] = useState<DeliveryOrder | null>(null);
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState<string>('all');
  const [deliverySearch, setDeliverySearch] = useState('');
  const deliveryOrderIdsRef = useRef<Set<string>>(new Set());

  // Nome da loja (exibido no header após login)
  const [restaurantDisplayName, setRestaurantDisplayName] = useState<string>('');
  
  // Formulário de produto
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    preparationTime: '',
    available: true,
    image: ''
  });

  /** Loading do upload de foto do produto (evita múltiplos envios e dá feedback visual) */
  const [isUploadingProductImage, setIsUploadingProductImage] = useState(false);

  // Estados para traduções
  const [productTranslations, setProductTranslations] = useState<{
    name?: { 'en-US': string; 'fr-FR': string };
    description?: { 'en-US': string; 'fr-FR': string };
  }>({});

  const [categoryTranslations, setCategoryTranslations] = useState<{
    name?: { 'en-US': string; 'fr-FR': string };
  }>({});

  const [qrCodeModal, setQrCodeModal] = useState<{ show: boolean; url: string; numero: string }>({
    show: false,
    url: '',
    numero: ''
  });
  const [urlCopied, setUrlCopied] = useState(false);

  // Estados para importação CSV
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    importedProducts: number;
    createdCategories: number;
    errors: string[];
  } | null>(null);

  // Extração de texto de PDF do cardápio (upload binário → Storage → Cloud Function)
  const [showPdfExtractModal, setShowPdfExtractModal] = useState(false);
  const [pdfExtractLoading, setPdfExtractLoading] = useState(false);
  const [pdfExtractError, setPdfExtractError] = useState<string | null>(null);
  const [pdfExtractedText, setPdfExtractedText] = useState('');
  const [pdfExtractMeta, setPdfExtractMeta] = useState<{
    pageCount: number;
    charCount: number;
    truncated: boolean;
  } | null>(null);
  const [pdfClaudeLoading, setPdfClaudeLoading] = useState(false);
  const [pdfClaudeResult, setPdfClaudeResult] = useState<ImportMenuFromClaudeResponse | null>(null);

  // Extração do path da URL do Firebase Storage (deletar imagens antigas) — centralizada no storageService
  const extractImagePathFromUrl = extractStoragePathFromUrl;

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

  // Verificar autenticação
  const hasAccess = Boolean(
    isAuthenticated &&
    restaurantId &&
    currentRestaurantId === restaurantId
  );

  useEffect(() => {
    if (authLoading) return;
    if (!hasAccess) {
      setShowLoginModal(true);
    } else {
      setShowLoginModal(false);
    }
  }, [authLoading, hasAccess]);

  // Carregar nome da loja para exibir no header (pós-login)
  useEffect(() => {
    if (!restaurantId) return;
    let cancelled = false;
    getRestaurants()
      .then((restaurants) => {
        if (cancelled) return;
        const restaurant = restaurants.find((r) => r.id === restaurantId);
        if (restaurant?.name) {
          setRestaurantDisplayName(restaurant.name);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [restaurantId]);

  // Atualizar título da aba do navegador
  useEffect(() => {
    const titleName = restaurantDisplayName || settings?.restaurantName;
    if (titleName) {
      document.title = `${titleName} - Gerenciamento`;
    } else {
      document.title = 'Noctis - Gerenciamento';
    }
  }, [settings?.restaurantName, restaurantDisplayName]);

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

  // Carregar mesas e áreas do Firestore
  useEffect(() => {
    loadTables();
    loadAreas();
  }, [restaurantId]);

  // Carregar produtos do Firestore
  useEffect(() => {
    loadProducts();
  }, []);

  // Conectar OrderContext ao restaurantId
  useEffect(() => {
    if (restaurantId) {
      setRestaurantId(restaurantId);
    }
  }, [restaurantId, setRestaurantId]);

  // Verificar permissões
  useEffect(() => {
    const checkPermissions = async () => {
      if (restaurantId) {
        try {
          const [translationPermission, imageMenuPermission] = await Promise.all([
            hasRestaurantPermission(restaurantId, 'automaticTranslation'),
            hasRestaurantPermission(restaurantId, 'imageMenuTransfer')
          ]);
          setHasAutomaticTranslation(translationPermission);
          setHasImageMenuTransfer(imageMenuPermission);
        } catch (error) {
          console.error('Erro ao verificar permissões:', error);
          setHasAutomaticTranslation(false);
          setHasImageMenuTransfer(false);
        }
      }
    };

    checkPermissions();
  }, [restaurantId]);

  // Carregar configurações de delivery
  useEffect(() => {
    const loadDeliverySettings = async () => {
      if (restaurantId) {
        try {
          const { getRestaurants } = await import('../services/restaurantService');
          const restaurants = await getRestaurants();
          const restaurant = restaurants.find(r => r.id === restaurantId);

          setRestaurantAccountEmail(restaurant?.email?.trim() ?? '');
          setStripeConnectAccountId(restaurant?.stripeConnectAccountId);
          setStripeConnectChargesEnabled(restaurant?.stripeConnectChargesEnabled);
          setStripeConnectDetailsSubmitted(restaurant?.stripeConnectDetailsSubmitted);
          setStripeConnectDisabledReason(restaurant?.stripeConnectDisabledReason ?? null);
          setStripeConnectRequirementsSummary(restaurant?.stripeConnectRequirementsSummary ?? null);
          
          console.log('📖 Carregando configurações de delivery...');
          console.log('   Restaurante encontrado:', restaurant?.name);
          console.log('   deliverySettings:', restaurant?.deliverySettings);
          
          if (restaurant?.deliverySettings) {
            setDeliveryEnabled(restaurant.deliverySettings.enabled);
            setDeliveryDescription(restaurant.deliverySettings.aiDescription || '');
            console.log('   ✅ Configurações do restaurante carregadas:', {
              enabled: restaurant.deliverySettings.enabled,
              description: restaurant.deliverySettings.aiDescription?.substring(0, 50)
            });
          } else {
            // Se não tem deliverySettings, usar valores padrão
            setDeliveryEnabled(true);
            setDeliveryDescription('');
            console.log('   ⚠️  Sem deliverySettings, usando padrões (enabled: true)');
          }

          // Carregar configurações de delivery dos produtos
          const productSettings: Record<string, boolean> = {};
          products.forEach(product => {
            // Se availableForDelivery não está definido, usar true como padrão
            const isAvailable = product.availableForDelivery ?? true;
            productSettings[product.id] = isAvailable;
          });
          setProductDeliverySettings(productSettings);
          console.log('   ✅ Configurações de produtos carregadas:', Object.keys(productSettings).length, 'produtos');
        } catch (error) {
          console.error('❌ Erro ao carregar configurações de delivery:', error);
        }
      }
    };

    loadDeliverySettings();
  }, [restaurantId, products]);

  // Atualizar checkbox de tradução automática quando o modal abrir ou a permissão mudar
  useEffect(() => {
    if (showImageImportModal) {
      setAutoTranslateOnImport(hasAutomaticTranslation);
    }
  }, [showImageImportModal, hasAutomaticTranslation]);

  const handleAutoTranslateProduct = async () => {
    if (!hasAutomaticTranslation || !productForm.name.trim() || !productForm.description.trim()) {
      return;
    }

    setIsTranslating(true);
    try {
      const result = await translateProduct(productForm.name, productForm.description);

      if (result.success && result.translations) {
        // Aplicar as traduções aos campos corretos
        setProductTranslations(prev => ({
          ...prev,
          name: {
            'en-US': result.translations!['en-US'].name,
            'fr-FR': result.translations!['fr-FR'].name
          },
          description: {
            'en-US': result.translations!['en-US'].description,
            'fr-FR': result.translations!['fr-FR'].description
          }
        }));

        alert('Tradução automática concluída com sucesso!');
      } else {
        alert(`Erro na tradução: ${result.error || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Erro na tradução:', error);
      alert('Erro ao traduzir produto. Tente novamente.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleImageImport = async () => {
    if (!imageImportFile || !hasImageMenuTransfer) {
      return;
    }

    setIsProcessingImage(true);
    setImageImportResult(null);

    try {
      // Converter imagem para base64
      const reader = new FileReader();
      reader.readAsDataURL(imageImportFile);

      await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
      });

      const base64Image = reader.result as string;

      // Importar função de processamento de imagem
      const openaiService = await import('../services/openaiService');

      const result = await openaiService.processMenuImage(base64Image);

      if (result.success && result.products) {
        // Importar produtos extraídos
        let importedCount = 0;
        const errors: string[] = [];
        const createdCategories = new Set<string>();

        // Primeiro, criar todas as categorias necessárias
        for (const product of result.products) {
          if (product.category.trim() && !createdCategories.has(product.category.toLowerCase())) {
            const categoryExists = categories.some(c =>
              c.name.toLowerCase() === product.category.toLowerCase()
            );

            if (!categoryExists) {
              try {
                await addCategory(
                  product.category,
                  restaurantId!,
                  {
                    name: {
                      'en-US': product.category,
                      'fr-FR': product.category
                    }
                  }
                );
                createdCategories.add(product.category.toLowerCase());
              } catch (error) {
                console.error('Erro ao criar categoria:', error);
              }
            }
          }
        }

        // Recarregar categorias se alguma foi criada
        if (createdCategories.size > 0) {
          await reloadRestaurantData();
        }

        // Agora importar todos os produtos
        for (const product of result.products) {
          try {
            let productTranslations = {
              name: {
                'en-US': product.name,
                'fr-FR': product.name
              },
              description: {
                'en-US': product.description || '',
                'fr-FR': product.description || ''
              }
            };

            // Se a opção de tradução automática estiver ativada, traduzir o produto
            if (autoTranslateOnImport) {
              try {
                const translationResult = await translateProduct(product.name, product.description || '');

                if (translationResult.success && translationResult.translations) {
                  productTranslations = {
                    name: {
                      'en-US': translationResult.translations['en-US'].name,
                      'fr-FR': translationResult.translations['fr-FR'].name
                    },
                    description: {
                      'en-US': translationResult.translations['en-US'].description,
                      'fr-FR': translationResult.translations['fr-FR'].description
                    }
                  };
                } else {
                  console.warn(`Não foi possível traduzir o produto "${product.name}":`, translationResult.error);
                }
              } catch (translationError) {
                console.error(`Erro ao traduzir produto "${product.name}":`, translationError);
                // Continuar com traduções padrão
              }
            }

            await addProduct(
              {
                name: product.name,
                description: product.description || '',
                price: product.price,
                category: product.category,
                available: true,
                image: '',
                preparationTime: 0,
                translations: productTranslations
              },
              restaurantId! // Segundo parâmetro
            );

            importedCount++;
          } catch (error) {
            console.error('Erro ao importar produto:', error);
            errors.push(`Erro ao importar "${product.name}": ${error}`);
          }
        }

        setImageImportResult({
          success: true,
          message: `Importação concluída! ${importedCount} produtos importados${createdCategories.size > 0 ? ` e ${createdCategories.size} ${createdCategories.size === 1 ? 'categoria criada' : 'categorias criadas'}` : ''}.`,
          imported: importedCount,
          errors: errors.length > 0 ? errors : undefined
        });

        // Recarregar produtos e categorias
        await loadProducts();
        await reloadRestaurantData();
      } else {
        setImageImportResult({
          success: false,
          message: result.error || 'Erro ao processar imagem'
        });
      }
    } catch (error) {
      console.error('Erro ao processar imagem:', error);
      setImageImportResult({
        success: false,
        message: error instanceof Error ? error.message : 'Erro desconhecido ao processar imagem'
      });
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageImportFile(file);

      // Criar preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageImportPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAutoTranslateCategory = async () => {
    if (!hasAutomaticTranslation || !categoryForm.trim()) {
      return;
    }

    setIsTranslating(true);
    try {
      // Para categorias, usamos o nome como descrição também
      const result = await translateProduct(categoryForm, categoryForm);

      if (result.success && result.translations) {
        // Aplicar as traduções aos campos corretos
        setCategoryTranslations(prev => ({
          ...prev,
          name: {
            'en-US': result.translations!['en-US'].name,
            'fr-FR': result.translations!['fr-FR'].name
          }
        }));

        alert('Tradução automática da categoria concluída com sucesso!');
      } else {
        alert(`Erro na tradução: ${result.error || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Erro na tradução:', error);
      alert('Erro ao traduzir categoria. Tente novamente.');
    } finally {
      setIsTranslating(false);
    }
  };

  // Carregar configurações no formulário (só quando os dados do servidor mudam)
  useEffect(() => {
    lastSettingsSyncRef.current = null;
  }, [restaurantId]);

  useEffect(() => {
    if (!settings) return;

    const syncKey =
      settings.updatedAt instanceof Date ? settings.updatedAt.getTime() : 0;
    if (lastSettingsSyncRef.current === syncKey) return;

    lastSettingsSyncRef.current = syncKey;
    setPersonalizationForm({
      restaurantName: settings.restaurantName,
      primaryColor: settings.primaryColor,
      secondaryColor: settings.secondaryColor,
      bannerUrl: settings.bannerUrl || '',
      audioUrl: settings.audioUrl || '',
    });
  }, [settings]);

  // Pré-visualização das cores enquanto edita a personalização
  useEffect(() => {
    if (!personalizationForm.primaryColor || !personalizationForm.secondaryColor) return;
    import('../utils/colorUtils').then(({ applyCustomColors }) => {
      applyCustomColors(personalizationForm.primaryColor, personalizationForm.secondaryColor);
    });
  }, [personalizationForm.primaryColor, personalizationForm.secondaryColor]);

  // Auto-esconder toast de personalização após 4s
  useEffect(() => {
    if (!personalizationToast) return;
    const t = setTimeout(() => setPersonalizationToast(null), 4000);
    return () => clearTimeout(t);
  }, [personalizationToast]);

  // Auto-esconder toast de mesa após 4s
  useEffect(() => {
    if (!mesaToast) return;
    const t = setTimeout(() => setMesaToast(null), 4000);
    return () => clearTimeout(t);
  }, [mesaToast]);

  const loadTables = async () => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [tablesData, max] = await Promise.all([
        getTables(restaurantId),
        getMaxTablesForRestaurant(restaurantId)
      ]);
      setMesas(tablesData);
      setMaxTables(max);
    } catch (error) {
      console.error('Erro ao carregar mesas:', error);
      alert('Erro ao carregar mesas. Verifique o console para mais detalhes.');
    } finally {
      setLoading(false);
    }
  };

  const loadAreas = async () => {
    if (!restaurantId) return;
    try {
      const areasData = await getAreas(restaurantId);
      setAreas(areasData);
    } catch (error) {
      console.error('Erro ao carregar áreas:', error);
    }
  };

  const loadAuditEvents = async (filters?: { mesaId?: string; since?: string }) => {
    if (!restaurantId) return;
    const f = filters ?? auditFilters;
    try {
      const since = f.since
        ? new Date(f.since)
        : (() => {
            const d = new Date();
            d.setDate(d.getDate() - 7);
            return d;
          })();
      const events = await getTableAuditEvents(restaurantId, {
        mesaId: f.mesaId,
        since,
        limitCount: 200
      });
      setAuditEvents(events);
    } catch (error) {
      console.error('Erro ao carregar auditoria:', error);
    }
  };

  const loadProducts = async () => {
    try {
      console.log('Recarregando dados do restaurante...');
      // Usar o hook para recarregar dados
      reloadRestaurantData();
    } catch (error) {
      console.error('Erro ao carregar produtos/categorias:', error);
      alert('Erro ao carregar dados. Verifique o console para mais detalhes.');
    }
  };


  const removerMesa = async (id: string) => {
    const mesa = mesas.find((m) => m.id === id);
    if (!mesa) return;
    if (!window.confirm(`Remover a mesa ${mesa.numero}? Esta ação não pode ser desfeita.`)) {
      return;
    }
    try {
      await deleteTable(id);
      setMesas((prev) => prev.filter((m) => m.id !== id));
      alert('Mesa removida com sucesso!');
    } catch (error) {
      alert('Erro ao remover mesa. Tente novamente.');
    }
  };

  const handleOpenMesa = async (mesa: Table, responsavel?: string, observacao?: string) => {
    if (!restaurantId || !canOpenTable(mesa.status)) return;
    try {
      await openSession(restaurantId, mesa.id, mesa.numero, 'gerente', responsavel ?? null);
      await updateTable(mesa.id, { status: 'ocupada', responsavel: responsavel ?? null, observacao: observacao ?? null });
      await logTableEvent(restaurantId, mesa.id, 'mesa_aberta', 'gerente', { mesaNumero: mesa.numero, detalhe: responsavel ?? undefined });
      await loadTables();
    } catch (e) {
      console.error(e);
      alert('Erro ao abrir mesa.');
    }
  };

  const handleAtribuirResponsavel = async (mesa: Table, responsavel: string) => {
    if (!restaurantId) return;
    try {
      await updateTable(mesa.id, { responsavel });
      await logTableEvent(restaurantId, mesa.id, 'responsavel_alterado', 'gerente', { mesaNumero: mesa.numero, detalhe: responsavel });
      await loadTables();
    } catch (e) {
      console.error(e);
      alert('Erro ao atribuir responsável.');
    }
  };

  const handleAddArea = async (nome: string) => {
    if (!restaurantId) return;
    try {
      const newArea = await addArea(restaurantId, nome, areas.length);
      setAreas((prev) => [...prev, newArea]);
    } catch (e) {
      console.error(e);
      alert('Erro ao adicionar área.');
    }
  };

  const handleRemoveArea = async (id: string) => {
    try {
      await deleteArea(id);
      setAreas((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      console.error(e);
      alert('Erro ao remover área.');
    }
  };

  const visualizarQRCode = async (numeroMesa: string) => {
    try {
      const url = generateTableUrl(restaurantId ?? '', numeroMesa);
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
      const url = generateTableUrl(restaurantId ?? '', numeroMesa);
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
        image: product.image || ''
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
        image: ''
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
        preparationTime: productForm.preparationTime.trim() ? parseInt(productForm.preparationTime) : undefined,
        available: productForm.available,
        image: productForm.image,

        translations: Object.keys(productTranslations).length > 0 ? productTranslations : undefined
      };

      if (editingProduct) {
        // Armazenar a URL da imagem antiga para deletar depois
        const oldImageUrl = editingProduct.image;

        await updateProduct(editingProduct.id, productData);
        reloadRestaurantData(); // Recarregar dados do restaurante

        // Deletar a imagem antiga se foi alterada
        if (oldImageUrl && oldImageUrl !== productForm.image) {
          try {
            const imagePath = extractImagePathFromUrl(oldImageUrl);
            if (imagePath) {
              await deleteImage(imagePath);
              console.log('Imagem antiga do produto deletada com sucesso');
            }
          } catch (deleteError) {
            console.warn('Erro ao deletar imagem antiga do produto:', deleteError);
            // Não mostrar erro para o usuário, pois o produto foi atualizado com sucesso
          }
        }

        alert(`Produto "${productData.name}" atualizado com sucesso!`);
      } else {
        await addProduct(productData, restaurantId);
        reloadRestaurantData(); // Recarregar dados do restaurante
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
        // Encontrar o produto para obter a URL da imagem
        const productToDelete = products.find(p => p.id === id);

        // Deletar o produto do Firestore
        await deleteProduct(id);
        reloadRestaurantData(); // Recarregar dados do restaurante

        // Deletar a imagem do Storage se existir
        if (productToDelete?.image) {
          try {
            const imagePath = extractImagePathFromUrl(productToDelete.image);
            if (imagePath) {
              await deleteImage(imagePath);
              console.log('Imagem do produto deletada com sucesso');
            }
          } catch (deleteError) {
            console.warn('Erro ao deletar imagem do produto:', deleteError);
            // Não mostrar erro para o usuário, pois o produto foi deletado com sucesso
          }
        }

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
          reloadRestaurantData(); // Recarregar dados do restaurante
        }
        alert('Categoria atualizada com sucesso!');
      } else {
        // Nova categoria
        await addCategory(categoryForm.trim(), restaurantId, Object.keys(categoryTranslations).length > 0 ? categoryTranslations : undefined);
        reloadRestaurantData(); // Recarregar dados do restaurante
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
        reloadRestaurantData(); // Recarregar dados do restaurante
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

      // Armazenar URL da imagem antiga para deletar depois
      const oldBannerUrl = personalizationForm.bannerUrl;

      // Fazer upload para o Firebase Storage
      const result = await uploadImage(file, 'banners', 'restaurant-banner');

      if (result.success) {
        // Atualizar o formulário com a nova URL
        setPersonalizationForm(prev => ({
          ...prev,
          bannerUrl: result.url
        }));
        alert(`Banner enviado com sucesso! URL: ${result.url.substring(0, 50)}...`);


        if (oldBannerUrl) {
          try {
            const imagePath = extractImagePathFromUrl(oldBannerUrl);
            if (imagePath) {
              await deleteImage(imagePath);
              console.log('Imagem antiga do banner deletada com sucesso');
            }
          } catch (deleteError) {
            console.warn('Erro ao deletar imagem antiga do banner:', deleteError);

          }
        }

        // Não extrair cores automaticamente para evitar loops infinitos
        // O usuário pode usar o botão "Extrair Cores" quando desejar
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
      const imagePath = extractImagePathFromUrl(personalizationForm.bannerUrl);
      if (imagePath) {
        await deleteImage(imagePath);
      }

      // Limpar o formulário
      setPersonalizationForm(prev => ({
        ...prev,
        bannerUrl: ''
      }));

      // Limpar cores extraídas
      setExtractedColors(null);

      alert('Banner removido com sucesso!');
    } catch (error) {
      console.error('Erro ao remover banner:', error);
      alert('Erro ao remover banner. Tente novamente.');
    }
  };

  // Função para fazer upload do áudio
  const handleAudioUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Validar tipo de arquivo
      if (file.type !== 'audio/mpeg' && file.type !== 'audio/mp3') {
        alert('Por favor, selecione apenas arquivos MP3');
        return;
      }

      // Validar tamanho (máximo 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('Arquivo muito grande. Máximo 10MB permitido.');
        return;
      }

      // Armazenar URL do áudio antigo para deletar depois
      const oldAudioUrl = personalizationForm.audioUrl;

      // Fazer upload para o Firebase Storage
      const result = await uploadAudio(file, 'audio', 'restaurant-audio');

      if (result.success) {
        // Atualizar o formulário com a nova URL
        setPersonalizationForm(prev => ({
          ...prev,
          audioUrl: result.url
        }));
        alert(`Áudio enviado com sucesso! URL: ${result.url.substring(0, 50)}...`);

        // Deletar o áudio antigo se existir
        if (oldAudioUrl) {
          try {
            const audioPath = extractImagePathFromUrl(oldAudioUrl);
            if (audioPath) {
              await deleteAudio(audioPath);
              console.log('Áudio antigo deletado com sucesso');
            }
          } catch (deleteError) {
            console.warn('Erro ao deletar áudio antigo:', deleteError);
          }
        }
      } else {
        alert(`Erro ao enviar áudio: ${result.error}`);
      }
    } catch (error) {
      console.error('Erro no upload do áudio:', error);
      alert('Erro ao enviar áudio. Tente novamente.');
    }
  };

  // Função para remover o áudio
  const handleAudioRemove = async () => {
    if (!personalizationForm.audioUrl) return;

    try {
      const audioPath = extractImagePathFromUrl(personalizationForm.audioUrl);
      if (audioPath) {
        await deleteAudio(audioPath);
      }

      // Limpar o formulário
      setPersonalizationForm(prev => ({
        ...prev,
        audioUrl: ''
      }));

      alert('Áudio removido com sucesso!');
    } catch (error) {
      console.error('Erro ao remover áudio:', error);
      alert('Erro ao remover áudio. Tente novamente.');
    }
  };

  // Função para extrair cores do banner
  const handleExtractColors = async () => {
    if (!personalizationForm.bannerUrl) {
      alert('Primeiro faça upload de um banner para extrair as cores.');
      return;
    }

    setIsExtractingColors(true);
    try {
      const colors = await extractColorsFromImage(personalizationForm.bannerUrl);
      setExtractedColors(colors);

      // Atualizar o formulário com as cores extraídas
      setPersonalizationForm(prev => ({
        ...prev,
        primaryColor: colors.primaryColor,
        secondaryColor: colors.secondaryColor
      }));

      setPersonalizationToast({
        type: 'success',
        message: 'Cores extraídas do banner e aplicadas automaticamente.',
      });
    } catch (error) {
      console.error('Erro ao extrair cores:', error);
      alert('Erro ao extrair cores. Verifique se a imagem é válida e tente novamente.');
    } finally {
      setIsExtractingColors(false);
    }
  };

  // Funções para importação CSV
  const handleCSVFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      alert('Por favor, selecione um arquivo CSV válido.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvContent(content);
    };
    reader.readAsText(file);
  };

  const handleImportCSV = async () => {
    if (!csvContent.trim()) {
      alert('Por favor, cole ou faça upload do conteúdo CSV.');
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      const result = await importProductsFromCSV(csvContent);
      setImportResult(result);

      if (result.success) {
        // Recarregar produtos e categorias
        await loadProducts();
      }
    } catch (error) {
      setImportResult({
        success: false,
        message: `Erro inesperado: ${error}`,
        importedProducts: 0,
        createdCategories: 0,
        errors: [`Erro inesperado: ${error}`]
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const template = generateCSVTemplate();
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template-produtos.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const resetCSVModal = () => {
    setCsvContent('');
    setImportResult(null);
    setShowCSVModal(false);
  };

  const resetPdfExtractModal = () => {
    setShowPdfExtractModal(false);
    setPdfExtractLoading(false);
    setPdfExtractError(null);
    setPdfExtractedText('');
    setPdfExtractMeta(null);
    setPdfClaudeLoading(false);
    setPdfClaudeResult(null);
  };

  const handlePdfMenuFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !restaurantId) return;

    setPdfExtractError(null);
    setPdfExtractedText('');
    setPdfExtractMeta(null);
    setPdfExtractLoading(true);

    try {
      const up = await uploadMenuPdfForExtraction(file, restaurantId);
      if (!up.success || !up.path) {
        throw new Error(up.error || 'Falha no upload do PDF.');
      }
      const extracted = await extractMenuPdfTextFromStorage(up.path);
      setPdfExtractedText(extracted.text);
      setPdfExtractMeta({
        pageCount: extracted.pageCount,
        charCount: extracted.charCount,
        truncated: extracted.truncated
      });
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message: unknown }).message)
          : 'Não foi possível extrair o texto deste PDF.';
      setPdfExtractError(msg);
    } finally {
      setPdfExtractLoading(false);
    }
  };

  const handlePdfClaudeImport = async () => {
    if (!restaurantId || !pdfExtractedText.trim()) return;
    setPdfClaudeLoading(true);
    setPdfClaudeResult(null);
    setPdfExtractError(null);
    try {
      const result = await runClaudeMenuImport(restaurantId, pdfExtractedText);
      setPdfClaudeResult(result);
      if (result.productsCreated > 0 || result.categoriesCreated > 0) {
        loadProducts();
      }
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message: unknown }).message)
          : 'Falha ao importar com IA.';
      setPdfExtractError(msg);
    } finally {
      setPdfClaudeLoading(false);
    }
  };

  // Função para fazer upload da imagem do produto (Firebase Storage: restaurants/{id}/items/{productId}/...)
  const handleProductImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !restaurantId) return;
    if (isUploadingProductImage) return;

    try {
      setIsUploadingProductImage(true);
      const oldProductImageUrl = productForm.image;

      const result = await uploadProductImage(file, restaurantId, editingProduct?.id);

      if (result.success) {
        setProductForm(prev => ({ ...prev, image: result.url! }));

        // Remover imagem antiga do Storage para não deixar órfã (só se for do nosso bucket)
        if (oldProductImageUrl) {
          const imagePath = extractImagePathFromUrl(oldProductImageUrl);
          if (imagePath) {
            try {
              await deleteImage(imagePath);
            } catch (deleteError) {
              console.warn('Erro ao deletar imagem antiga do produto:', deleteError);
            }
          }
        }
      } else {
        alert(result.error || 'Erro ao enviar imagem.');
      }
    } catch (error) {
      console.error('Erro no upload da imagem:', error);
      alert('Erro ao enviar imagem. Tente novamente.');
    } finally {
      setIsUploadingProductImage(false);
      event.target.value = '';
    }
  };

  // Função para remover a imagem do produto
  const handleProductImageRemove = async () => {
    if (!productForm.image) return;

    try {
      const imagePath = extractImagePathFromUrl(productForm.image);
      if (imagePath) {
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

    if (!personalizationForm.primaryColor || !personalizationForm.secondaryColor) {
      alert('Por favor, defina as cores primária e secundária');
      return;
    }

    if (!restaurantId) {
      alert('Restaurante não identificado.');
      return;
    }

    try {
      setIsSavingPersonalization(true);

      await updateSettings({
        restaurantName: personalizationForm.restaurantName.trim(),
        primaryColor: personalizationForm.primaryColor,
        secondaryColor: personalizationForm.secondaryColor,
        bannerUrl: personalizationForm.bannerUrl,
        audioUrl: personalizationForm.audioUrl
      });

      const { updateRestaurant, getRestaurantById } = await import('../services/restaurantService');
      const currentRestaurant = await getRestaurantById(restaurantId);

      const theme: {
        primaryColor: string;
        secondaryColor: string;
        logo?: string;
      } = {
        primaryColor: personalizationForm.primaryColor,
        secondaryColor: personalizationForm.secondaryColor,
      };

      if (currentRestaurant?.theme?.logo) {
        theme.logo = currentRestaurant.theme.logo;
      }

      await updateRestaurant(restaurantId, {
        name: personalizationForm.restaurantName.trim(),
        theme,
      });

      const { applyCustomColors } = await import('../utils/colorUtils');
      applyCustomColors(
        personalizationForm.primaryColor,
        personalizationForm.secondaryColor
      );

      setRestaurantDisplayName(personalizationForm.restaurantName.trim());
      setPersonalizationToast({
        type: 'success',
        message: 'Configurações salvas! As cores já estão aplicadas no cardápio.',
      });
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      setPersonalizationToast({
        type: 'error',
        message: 'Não foi possível salvar. Tente novamente.',
      });
    } finally {
      setIsSavingPersonalization(false);
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

  // Função para carregar estatísticas
  // Salvar configurações de delivery
  const handleSaveDeliverySettings = async () => {
    if (!restaurantId) return;

    try {
      setIsSavingDelivery(true);
      const { updateRestaurantDeliverySettings } = await import('../services/restaurantService');
      
      console.log('💾 Salvando configurações de delivery...');
      console.log('   Restaurante habilitado:', deliveryEnabled);
      console.log('   Descrição IA:', deliveryDescription.substring(0, 50) + '...');
      console.log('   Produtos:', productDeliverySettings);
      
      // Salvar configurações gerais do restaurante
      await updateRestaurantDeliverySettings(restaurantId, {
        enabled: deliveryEnabled,
        aiDescription: deliveryDescription
      });
      console.log('   ✅ Configurações do restaurante salvas');

      // Salvar configurações de cada produto
      const updatePromises = Object.entries(productDeliverySettings).map(([productId, enabled]) => {
        console.log(`   📦 Atualizando produto ${productId}: ${enabled}`);
        return updateProduct(productId, { availableForDelivery: enabled });
      });

      await Promise.all(updatePromises);
      console.log('   ✅ Todos os produtos atualizados');

      alert('Configurações de delivery salvas com sucesso!');
      await reloadRestaurantData();
      console.log('   ✅ Dados recarregados');
    } catch (error) {
      console.error('❌ Erro ao salvar configurações de delivery:', error);
      alert('Erro ao salvar configurações de delivery. Tente novamente.');
    } finally {
      setIsSavingDelivery(false);
    }
  };

  const toggleProductDelivery = (productId: string) => {
    setProductDeliverySettings(prev => {
      const currentValue = prev[productId] ?? true; // Padrão é true se undefined
      const newValue = !currentValue;
      console.log(`🔄 Toggle produto ${productId}: ${currentValue} → ${newValue}`);
      return {
        ...prev,
        [productId]: newValue
      };
    });
  };

  const loadStatistics = async () => {
    setLoadingStats(true);
    try {
      let period;
      const now = new Date();

      switch (selectedPeriod) {
        case 'today':
          period = {
            start: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
          };
          break;
        case 'week':
          period = {
            start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
            end: now
          };
          break;
        case 'month':
          period = {
            start: new Date(now.getFullYear(), now.getMonth(), 1),
            end: new Date(now.getFullYear(), now.getMonth() + 1, 0)
          };
          break;
        case 'all':
        default:
          period = undefined;
          break;
      }

      const stats = await getStatistics(period);
      setStatistics(stats);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  // Detectar parâmetro tab na URL
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (
      tabParam &&
      ['mesas', 'cardapio', 'personalizacao', 'relatorios', 'cozinha', 'delivery'].includes(tabParam)
    ) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => {
    const sc = searchParams.get('stripe_connect');
    if (sc === 'return') {
      setStripeConnectBanner(
        'Você voltou do cadastro na Stripe. Clique em «Atualizar status» abaixo para confirmar se o recebimento online já está ativo.'
      );
      setActiveTab('delivery');
    } else if (sc === 'refresh') {
      setStripeConnectBanner(
        'O link de cadastro expirou ou foi interrompido. Use «Conectar / continuar cadastro» novamente.'
      );
      setActiveTab('delivery');
    }
  }, [searchParams]);

  // Carregar estatísticas quando a aba for selecionada ou período mudado
  useEffect(() => {
    if (activeTab === 'relatorios') {
      loadStatistics();
    }
  }, [activeTab, selectedPeriod]);

  // Inicializar preferência de som a partir do localStorage
  useEffect(() => {
    if (restaurantId) {
      setNotificationSoundEnabledState(getNotificationSoundEnabled(restaurantId));
    }
  }, [restaurantId]);

  // Listener em tempo real dos pedidos de delivery + notificação de novo pedido
  useEffect(() => {
    if (!restaurantId) return;
    const unsubscribe = subscribeDeliveryOrdersByRestaurant(restaurantId, (orders) => {
      setDeliveryOrders(orders);
      const pending = orders.filter((o) => o.status === 'pending').length;
      setDeliveryPendingCount(pending);
      const currentIds = new Set(orders.map((o) => o.id));
      const prevIds = deliveryOrderIdsRef.current;
      const newOrders = orders.filter((o) => o.status === 'pending' && !prevIds.has(o.id));
      if (prevIds.size > 0 && newOrders.length > 0) {
        const first = newOrders[0];
        setDeliveryToast({ message: `Novo pedido de delivery #${first.id.substring(0, 8)}`, orderId: first.id });
        if (getNotificationSoundEnabled(restaurantId)) {
          playNotificationSound();
        }
      }
      deliveryOrderIdsRef.current = currentIds;
    });
    return () => unsubscribe();
  }, [restaurantId]);

  // Auto-esconder toast após 5s
  useEffect(() => {
    if (!deliveryToast) return;
    const t = setTimeout(() => setDeliveryToast(null), 5000);
    return () => clearTimeout(t);
  }, [deliveryToast]);

  // Polling fallback (a cada 30s) quando estiver na aba Pedidos Delivery
  useEffect(() => {
    if (activeTab !== 'cozinha' || kitchenSubTab !== 'delivery' || !restaurantId) return;
    const interval = setInterval(() => {
      getDeliveryOrdersByRestaurant(restaurantId).then((orders) => {
        setDeliveryOrders((prev) => {
          const prevIds = new Set(prev.map((o) => o.id));
          const newOnes = orders.filter((o) => !prevIds.has(o.id) && o.status === 'pending');
          if (newOnes.length > 0 && getNotificationSoundEnabled(restaurantId)) {
            playNotificationSound();
            setDeliveryToast({ message: `Novo pedido #${newOnes[0].id.substring(0, 8)}`, orderId: newOnes[0].id });
          }
          return orders;
        });
        setDeliveryPendingCount(orders.filter((o) => o.status === 'pending').length);
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [activeTab, kitchenSubTab, restaurantId]);

  // Carregar pedidos de delivery quando a aba da cozinha for selecionada (primeira carga)
  useEffect(() => {
    if (activeTab === 'cozinha' && kitchenSubTab === 'delivery') {
      loadDeliveryOrders();
    }
  }, [activeTab, kitchenSubTab, restaurantId]);

  // Funções para funcionalidade de cozinha
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'novo':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'preparando':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'pronto':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'novo':
        return 'bg-red-50 border-red-200 shadow-sm';
      case 'preparando':
        return 'bg-yellow-50 border-yellow-200 shadow-sm';
      case 'pronto':
        return 'bg-green-50 border-green-200 shadow-sm';
      default:
        return 'bg-gray-50 border-gray-200 shadow-sm';
    }
  };

  const handleStatusChange = async (orderId: string, currentStatus: string) => {
    let newStatus: 'novo' | 'preparando' | 'pronto';

    switch (currentStatus) {
      case 'novo':
        newStatus = 'preparando';
        break;
      case 'preparando':
        newStatus = 'pronto';
        break;
      default:
        return;
    }

    await updateOrderStatus(orderId, newStatus);
  };

  const handleFinalizeOrder = async (orderId: string) => {
    if (window.confirm('Tem certeza que deseja finalizar este pedido? Esta ação não pode ser desfeita.')) {
      await deleteOrder(orderId);
    }
  };

  // Funções para gerenciar pedidos de delivery
  const loadDeliveryOrders = async () => {
    if (!restaurantId) return;

    try {
      setDeliveryLoading(true);
      const orders = await getDeliveryOrdersByRestaurant(restaurantId);
      setDeliveryOrders(orders);
    } catch (error) {
      console.error('Erro ao carregar pedidos de delivery:', error);
    } finally {
      setDeliveryLoading(false);
    }
  };

  const handleDeliveryStatusChange = async (orderId: string, newStatus: DeliveryOrder['status']) => {
    try {
      await updateDeliveryOrderStatus(orderId, newStatus);
      await loadDeliveryOrders(); // Recarregar pedidos
    } catch (error) {
      console.error('Erro ao atualizar status do pedido:', error);
    }
  };

  const getDeliveryStatusInfo = (status: DeliveryOrder['status']) => {
    switch (status) {
      case 'pending':
        return { label: 'Aguardando', color: 'text-yellow-600', bgColor: 'bg-yellow-100', nextStatus: 'confirmed' as const };
      case 'confirmed':
        return { label: 'Confirmado', color: 'text-blue-600', bgColor: 'bg-blue-100', nextStatus: 'preparing' as const };
      case 'preparing':
        return { label: 'Preparando', color: 'text-orange-600', bgColor: 'bg-orange-100', nextStatus: 'delivering' as const };
      case 'delivering':
        return { label: 'Saindo', color: 'text-purple-600', bgColor: 'bg-purple-100', nextStatus: 'delivered' as const };
      case 'delivered':
        return { label: 'Entregue', color: 'text-green-600', bgColor: 'bg-green-100', nextStatus: null };
      case 'cancelled':
        return { label: 'Cancelado', color: 'text-red-600', bgColor: 'bg-red-100', nextStatus: null };
      default:
        return { label: 'Desconhecido', color: 'text-gray-600', bgColor: 'bg-gray-100', nextStatus: null };
    }
  };

  const getDeliveryStatusButtonText = (status: DeliveryOrder['status']) => {
    switch (status) {
      case 'pending':
        return 'Confirmar Pedido';
      case 'confirmed':
        return 'Iniciar Preparo';
      case 'preparing':
        return 'Sair para Entrega';
      case 'delivering':
        return 'Marcar como Entregue';
      default:
        return '';
    }
  };

  // Funções para cancelar pedidos
  const handleCancelOrder = (order: DeliveryOrder) => {
    setOrderToCancel(order);
    setCancelReason('');
    setShowCancelModal(true);
  };

  const confirmCancelOrder = async () => {
    if (!orderToCancel) return;

    try {
      await cancelDeliveryOrder(orderToCancel.id, cancelReason);
      await loadDeliveryOrders(); // Recarregar pedidos
      setShowCancelModal(false);
      setOrderToCancel(null);
      setCancelReason('');
    } catch (error) {
      console.error('Erro ao cancelar pedido:', error);
      alert('Erro ao cancelar pedido. Tente novamente.');
    }
  };

  const closeCancelModal = () => {
    setShowCancelModal(false);
    setOrderToCancel(null);
    setCancelReason('');
  };

  const submitStripeConnectModal = async () => {
    if (!restaurantId || !restaurantAccountEmail.trim()) {
      setStripeModalError('Email do restaurante não carregado. Recarregue a página.');
      return;
    }
    if (!stripeModalPassword.trim()) {
      setStripeModalError('Informe a senha do restaurante.');
      return;
    }
    setStripeModalBusy(true);
    setStripeModalError(null);
    try {
      if (stripeModalAction === 'onboard') {
        const { url } = await startRestaurantStripeConnectOnboarding({
          restaurantId,
          email: restaurantAccountEmail.trim(),
          password: stripeModalPassword,
        });
        window.location.href = url;
        return;
      }
      await syncRestaurantStripeConnectFromStripe({
        restaurantId,
        email: restaurantAccountEmail.trim(),
        password: stripeModalPassword,
      });
      const restaurants = await getRestaurants();
      const r = restaurants.find((x) => x.id === restaurantId);
      setStripeConnectAccountId(r?.stripeConnectAccountId);
      setStripeConnectChargesEnabled(r?.stripeConnectChargesEnabled);
      setStripeConnectDetailsSubmitted(r?.stripeConnectDetailsSubmitted);
      setStripeConnectDisabledReason(r?.stripeConnectDisabledReason ?? null);
      setStripeConnectRequirementsSummary(r?.stripeConnectRequirementsSummary ?? null);
      setStripeModalPassword('');
      setStripeModalOpen(false);
      setStripeConnectBanner(null);
    } catch (e: unknown) {
      let msg = 'Não foi possível concluir. Tente novamente.';
      if (e && typeof e === 'object') {
        const err = e as { code?: string; message?: unknown };
        const code = typeof err.code === 'string' ? err.code : '';
        const rawMsg = typeof err.message === 'string' ? err.message : '';
        if (code === 'functions/internal' || rawMsg === 'internal') {
          msg =
            'Erro no servidor (functions). Faça deploy das Cloud Functions com `firebase deploy --only functions` e confira STRIPE_SECRET_KEY / secrets.';
        } else if (rawMsg) {
          msg = rawMsg;
        }
      }
      setStripeModalError(msg);
    } finally {
      setStripeModalBusy(false);
    }
  };

  const getStatusButtonText = (status: string) => {
    switch (status) {
      case 'novo':
        return 'Iniciar Preparo';
      case 'preparando':
        return 'Marcar como Pronto';
      default:
        return '';
    }
  };

  const groupedOrders = orders.reduce((acc, order) => {
    if (!acc[order.status]) {
      acc[order.status] = [];
    }
    acc[order.status].push(order);
    return acc;
  }, {} as Record<string, typeof orders>);

  const statusOrder = ['novo', 'preparando', 'pronto'];


  // Renderizar apenas o modal de login se não estiver autenticado
  if (!hasAccess) {
    return (
      <>
        <RestaurantLoginModal
          isOpen={showLoginModal}
          onClose={() => navigate(-1)}
          onSuccess={() => setShowLoginModal(false)}
        />
        {authLoading && (
          <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Verificando autenticação...</p>
            </div>
          </div>
        )}
      </>
    );
  }

  const closeSidebar = () => setSidebarOpen(false);
  const openSidebar = () => setSidebarOpen(true);

  const navButton = (tab: string, icon: React.ReactNode, label: string, badge?: number) => (
    <button
      key={tab}
      onClick={() => { setActiveTab(tab); closeSidebar(); }}
      title={sidebarCollapsed ? label : undefined}
      className={`w-full text-left p-3 rounded-lg flex items-center transition-colors duration-200 ${
        sidebarCollapsed ? 'md:justify-center md:px-2' : 'space-x-3'
      } ${
        activeTab === tab
          ? 'bg-blue-50 text-blue-700 border border-blue-100'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
      }`}
    >
      <span className="relative shrink-0">
        {icon}
        {badge !== undefined && badge > 0 && sidebarCollapsed && (
          <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[1rem] h-4 px-1 rounded-full bg-amber-500 text-white text-[10px] font-semibold">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </span>
      <span
        className={`flex-1 overflow-hidden whitespace-nowrap transition-all duration-200 ${
          sidebarCollapsed
            ? 'md:max-w-0 md:opacity-0 md:delay-0'
            : 'max-w-[12rem] opacity-100 delay-150'
        }`}
      >
        {label}
      </span>
      {badge !== undefined && badge > 0 && !sidebarCollapsed && (
        <span className="flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-amber-500 text-white text-xs font-semibold shrink-0">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );

  const mesaPendentesCount = orders.filter((o) => o.orderType === 'mesa' && o.status === 'novo').length;
  const deliveryPendentesCount = deliveryOrders.filter(
    (o) => o.status === 'pending' || o.status === 'confirmed'
  ).length;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Toast: mesa criada */}
      {mesaToast && (
        <div
          className={`fixed top-4 right-4 z-[100] max-w-sm rounded-lg px-4 py-3 shadow-lg flex items-center gap-3 ${
            mesaToast.type === 'success'
              ? 'bg-amber-500 text-white'
              : 'bg-red-600 text-white'
          }`}
          role="alert"
        >
          {mesaToast.type === 'success' ? (
            <CheckCircle className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span className="font-medium">{mesaToast.message}</span>
          <button
            onClick={() => setMesaToast(null)}
            className={`p-1 rounded ${
              mesaToast.type === 'success' ? 'hover:bg-amber-600' : 'hover:bg-red-700'
            }`}
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Toast: personalização salva */}
      {personalizationToast && (
        <div
          className={`fixed top-4 right-4 z-[100] max-w-sm animate-in fade-in slide-in-from-top-2 rounded-lg px-4 py-3 shadow-lg flex items-center gap-3 ${
            personalizationToast.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          }`}
          role="alert"
        >
          {personalizationToast.type === 'success' ? (
            <CheckCircle className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span className="font-medium">{personalizationToast.message}</span>
          <button
            onClick={() => setPersonalizationToast(null)}
            className={`p-1 rounded ${
              personalizationToast.type === 'success'
                ? 'hover:bg-green-700'
                : 'hover:bg-red-700'
            }`}
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Toast: novo pedido de delivery */}
      {deliveryToast && (
        <div
          className="fixed top-4 right-4 z-[100] max-w-sm animate-in fade-in slide-in-from-top-2 rounded-lg bg-amber-500 text-white px-4 py-3 shadow-lg flex items-center gap-3"
          role="alert"
        >
          <Truck className="w-5 h-5 shrink-0" />
          <span className="font-medium">{deliveryToast.message}</span>
          <button
            onClick={() => setDeliveryToast(null)}
            className="p-1 rounded hover:bg-amber-600"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header — safe-area para não ficar sob a barra de status (Capacitor/mobile) */}
      <div
        className="bg-white border-b border-gray-200 p-3 sm:px-6 sm:py-4 shrink-0 z-30"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0.75rem))' }}
      >
        <div className="flex justify-between items-center gap-2 max-w-[1600px] mx-auto w-full">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={openSidebar}
              className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 shrink-0"
              aria-label="Abrir menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden sm:flex p-2 rounded-xl bg-gray-100 text-gray-600 shrink-0">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900 leading-tight truncate">
                {restaurantDisplayName || 'Gerenciamento'}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5 hidden sm:block">
                Painel de gerenciamento
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <PanelButton
              variant="secondary"
              onClick={testFirestoreConnection}
              icon={<SettingsIcon className="w-4 h-4" />}
              className="p-2 sm:px-4"
              title="Testar Conexão"
            >
              <span className="hidden sm:inline">Testar Conexão</span>
            </PanelButton>
            <Link
              to="/settings?tab=cozinha"
              className="inline-flex items-center gap-1.5 p-2 sm:px-4 sm:py-2 rounded-lg text-sm font-medium bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors"
              title="Ir para Cozinha"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Ir para Cozinha</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Overlay mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar: drawer no mobile, altura fixa abaixo da navbar no desktop */}
        <aside
          className={`
            fixed md:relative inset-y-0 left-0 z-50 shrink-0 bg-white border-r flex flex-col md:h-full
            w-64 ${sidebarCollapsed ? 'md:w-[4.5rem]' : 'md:w-64'}
            transform transition-[width,transform] duration-300 ease-in-out md:delay-75
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}
        >
          <div
            className={`p-4 flex items-center border-b md:border-b-0 shrink-0 w-full ${
              sidebarCollapsed ? 'md:justify-center md:px-2 md:py-3' : 'justify-between'
            }`}
          >
            <h2
              className={`text-lg font-semibold text-black overflow-hidden whitespace-nowrap transition-all duration-200 ${
                sidebarCollapsed ? 'md:max-w-0 md:opacity-0 md:delay-0' : 'max-w-full opacity-100 delay-150'
              }`}
            >
              Configurações
            </h2>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setSidebarCollapsed((prev) => !prev)}
                className="hidden md:flex p-2 rounded-lg text-gray-500 hover:bg-gray-100"
                aria-label={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="w-5 h-5" />
                ) : (
                  <ChevronLeft className="w-5 h-5" />
                )}
              </button>
              <button
                type="button"
                onClick={closeSidebar}
                className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
                aria-label="Fechar menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <nav
            className={`p-4 space-y-1 flex-1 overflow-y-auto overflow-x-hidden transition-[padding] duration-300 ease-in-out ${
              sidebarCollapsed ? 'md:px-2' : ''
            }`}
          >
            {navButton('mesas', <TableIcon className="w-5 h-5 shrink-0" />, 'Gerenciar Mesas')}
            {navButton('cardapio', <Utensils className="w-5 h-5 shrink-0" />, 'Gerenciar Cardápio')}
            {navButton('personalizacao', <Palette className="w-5 h-5 shrink-0" />, 'Personalização')}
            {navButton('relatorios', <BarChart3 className="w-5 h-5 shrink-0" />, 'Relatórios')}
            {navButton('cozinha', <ChefHat className="w-5 h-5 shrink-0" />, 'Cozinha', deliveryPendingCount)}
            {navButton('delivery', <Truck className="w-5 h-5 shrink-0" />, 'Delivery')}
          </nav>
          <div
            className={`p-4 border-t border-gray-200 shrink-0 transition-[padding] duration-300 ease-in-out ${
              sidebarCollapsed ? 'md:px-2' : ''
            }`}
          >
            <SidebarLogoutButton
              collapsed={sidebarCollapsed}
              onConfirm={() => {
                logout();
                navigate('/restaurant/auth', { replace: true });
              }}
            />
          </div>
        </aside>

        {/* Conteúdo Principal */}
        <div className="flex-1 min-h-0 min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-gray-50">
          <div className="max-w-[1600px] mx-auto w-full">
          {activeTab === 'mesas' && (
            <PanelPage>
              <PanelPageHeader
                title="Gerenciar Mesas"
                description="Organize o salão, acompanhe mesas abertas e consulte o histórico de operações."
                icon={<TableIcon className="w-5 h-5" />}
                tabs={
                  <PanelTabGroup>
                    <PanelTab
                      active={mesasSubTab === 'salao'}
                      onClick={() => { setMesasSubTab('salao'); setSelectedMesaDetail(null); }}
                    >
                      Visão do Salão
                    </PanelTab>
                    <PanelTab
                      active={mesasSubTab === 'historico'}
                      onClick={() => { setMesasSubTab('historico'); loadAuditEvents(); }}
                    >
                      Histórico e Auditoria
                    </PanelTab>
                  </PanelTabGroup>
                }
              />

              {mesasSubTab === 'salao' && (
                <VisaoSalao
                  restaurantId={restaurantId ?? ''}
                  mesas={mesas}
                  areas={areas}
                  maxTables={maxTables}
                  loading={loading}
                  onOpenMesa={handleOpenMesa}
                  onVerDetalhe={setSelectedMesaDetail}
                  onAtribuirResponsavel={handleAtribuirResponsavel}
                  onRemoveTable={removerMesa}
                  onAddArea={handleAddArea}
                  onRemoveArea={handleRemoveArea}
                  visualizarQRCode={visualizarQRCode}
                  baixarQRCode={baixarQRCode}
                  onMesaCreated={(mesa) => {
                    setMesas((prev) => [...prev, mesa]);
                    setMesaToast({
                      type: 'success',
                      message: `Mesa ${mesa.numero} adicionada com sucesso!`,
                    });
                  }}
                  onMesaCreateError={() => {
                    setMesaToast({
                      type: 'error',
                      message: 'Erro ao adicionar mesa. Tente novamente.',
                    });
                  }}
                />
              )}

              {mesasSubTab === 'historico' && (
                <HistoricoAuditoria
                  events={auditEvents}
                  mesas={mesas}
                  filters={auditFilters}
                  onFilterChange={(f) => {
                    setAuditFilters(f);
                    loadAuditEvents(f);
                  }}
                  onRefresh={() => loadAuditEvents(auditFilters)}
                />
              )}

              {selectedMesaDetail && (
                <DetalheMesaModal
                  mesa={selectedMesaDetail}
                  onClose={() => setSelectedMesaDetail(null)}
                  restaurantId={restaurantId ?? ''}
                  onMesaUpdated={loadTables}
                  onOpenMesa={handleOpenMesa}
                />
              )}
            </PanelPage>
          )}

          {activeTab === 'cardapio' && (
            <PanelPage>
              <PanelPageHeader
                title="Gerenciar Cardápio"
                description="Cadastre produtos, organize categorias e importe itens em lote."
                icon={<Utensils className="w-5 h-5" />}
                actions={
                  <>
                    <PanelButton
                      variant="secondary"
                      onClick={() => setShowCSVModal(true)}
                      icon={<Upload className="w-4 h-4" />}
                    >
                      Importar CSV
                    </PanelButton>
                    <PanelButton
                      variant="secondary"
                      onClick={() => {
                        setShowPdfExtractModal(true);
                        setPdfExtractError(null);
                        setPdfExtractedText('');
                        setPdfExtractMeta(null);
                        setPdfClaudeResult(null);
                      }}
                      icon={<FileText className="w-4 h-4" />}
                      title="Envia o PDF para o servidor e extrai o texto (PDF com texto selecionável)"
                    >
                      Extrair PDF
                    </PanelButton>
                    <div className="relative group">
                      <PanelButton
                        variant={hasImageMenuTransfer ? 'primary' : 'secondary'}
                        onClick={() => hasImageMenuTransfer && setShowImageImportModal(true)}
                        disabled={!hasImageMenuTransfer}
                        icon={<Sparkles className="w-4 h-4" />}
                        title={
                          !hasImageMenuTransfer
                            ? 'Você não possui permissão para importar cardápio por imagem'
                            : 'Importar cardápio a partir de uma foto usando IA'
                        }
                      >
                        Importar por Imagem
                      </PanelButton>
                      {!hasImageMenuTransfer && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                          Você não possui permissão para esta funcionalidade
                        </div>
                      )}
                    </div>
                    <PanelButton onClick={() => openProductModal()} icon={<Plus className="w-4 h-4" />}>
                      Adicionar Produto
                    </PanelButton>
                  </>
                }
              />

              {/* Filtros */}
              <PanelCard>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className={panelLabelClass}>Buscar</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Nome ou descrição..."
                        className={`${panelInputClass} pl-10`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={panelLabelClass}>Categoria</label>
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className={panelSelectClass}
                    >
                      <option value="all">Todas as categorias</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.name}>{category.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={panelLabelClass}>Preço</label>
                    <select
                      value={filterPrice}
                      onChange={(e) => setFilterPrice(e.target.value)}
                      className={panelSelectClass}
                    >
                      <option value="all">Todos os preços</option>
                      <option value="low">Até R$ 20,00</option>
                      <option value="medium">R$ 20,00 - R$ 50,00</option>
                      <option value="high">Acima de R$ 50,00</option>
                    </select>
                  </div>

                  <div>
                    <label className={panelLabelClass}>Tempo de Preparo</label>
                    <select
                      value={filterTime}
                      onChange={(e) => setFilterTime(e.target.value)}
                      className={panelSelectClass}
                    >
                      <option value="all">Todos os tempos</option>
                      <option value="fast">Até 15 min</option>
                      <option value="medium">15 - 30 min</option>
                      <option value="slow">Acima de 30 min</option>
                    </select>
                  </div>
                </div>
              </PanelCard>

              {/* Lista de Produtos */}
              <PanelCard padding="none">
                <div className="p-5 sm:p-6 border-b border-gray-100">
                  <div className="flex justify-between items-center gap-3">
                    <h3 className="text-base font-semibold text-gray-900">Produtos do Cardápio</h3>
                    <span className="text-sm text-gray-500">
                      {filteredProducts.length} produto{filteredProducts.length !== 1 ? 's' : ''} encontrado{filteredProducts.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                {loading ? (
                  <div className="p-6 text-center text-black">
                    Carregando produtos...
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="p-6 text-center text-black">
                    Nenhum produto encontrado
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-4 font-medium text-black">Produto</th>
                          <th className="text-left p-4 font-medium text-black">Categoria</th>
                          <th className="text-left p-4 font-medium text-black">Preço</th>
                          <th className="text-left p-4 font-medium text-black">Tempo</th>
                          <th className="text-left p-4 font-medium text-black">Status</th>
                          <th className="text-left p-4 font-medium text-black">Ações</th>
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
                                    <ProductImage
                                      src={product.image}
                                      alt={product.name}
                                      className="w-12 h-12"
                                      containerClassName="w-12 h-12"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                                      <span className="text-gray-400 text-xs">📷</span>
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div className="font-medium text-black">{product.name}</div>
                                  <div className="text-sm text-black">{product.description}</div>
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
                            <td className="p-4 text-sm text-black">
                              {product.preparationTime ? `${product.preparationTime} min` : '-'}
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${product.available
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
              </PanelCard>

              {/* Gerenciamento de Categorias */}
              <PanelCard padding="none">
                <div className="p-5 sm:p-6 border-b border-gray-100">
                  <PanelCardHeader
                    title="Gerenciar Categorias"
                    bordered={false}
                    actions={
                      <PanelButton
                        onClick={() => openCategoryModal()}
                        icon={<Plus className="w-4 h-4" />}
                        className="text-sm"
                      >
                        Nova Categoria
                      </PanelButton>
                    }
                  />
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
              </PanelCard>
            </PanelPage>
          )}

          {activeTab === 'personalizacao' && (
            <PanelPage>
              <PanelPageHeader
                title="Personalização"
                description="Configure a identidade visual e o conteúdo exibido no cardápio digital."
                icon={<Palette className="w-5 h-5" />}
                actions={
                  <PanelButton
                    onClick={savePersonalization}
                    disabled={isSavingPersonalization}
                    icon={<Save className="w-4 h-4" />}
                  >
                    {isSavingPersonalization ? 'Salvando...' : 'Salvar Configurações'}
                  </PanelButton>
                }
              />

              <PanelCard>
                <PanelCardHeader
                  title="Configurações do Restaurante"
                  description="Nome, cores, banner e áudio exibidos aos clientes."
                  bordered={false}
                />

                <div className="space-y-6">
                  {/* Nome do Restaurante */}
                  <div>
                    <label className={panelLabelClass}>
                      Nome do Restaurante
                    </label>
                    <input
                      type="text"
                      value={personalizationForm.restaurantName}
                      onChange={(e) => setPersonalizationForm(prev => ({ ...prev, restaurantName: e.target.value }))}
                      placeholder="Ex: Noctis"
                      className={panelInputClass}
                    />
                    <p className="text-sm text-gray-500 mt-1.5">
                      Este nome aparecerá no cabeçalho do cardápio
                    </p>
                  </div>

                  {/* Cores */}
                  <ThemeColorsPanel
                    primaryColor={personalizationForm.primaryColor}
                    secondaryColor={personalizationForm.secondaryColor}
                    onPrimaryChange={(color) =>
                      setPersonalizationForm((prev) => ({ ...prev, primaryColor: color }))
                    }
                    onSecondaryChange={(color) =>
                      setPersonalizationForm((prev) => ({ ...prev, secondaryColor: color }))
                    }
                    extractedColors={extractedColors}
                    bannerUrl={personalizationForm.bannerUrl}
                    onExtractColors={handleExtractColors}
                    isExtractingColors={isExtractingColors}
                  />

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

                  {/* Áudio do Restaurante */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Áudio de Boas-vindas
                    </label>
                    <div className="space-y-4">
                      {/* Áudio atual */}
                      {personalizationForm.audioUrl && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <Music className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">Áudio de Boas-vindas</p>
                                <p className="text-xs text-gray-500">Arquivo MP3 carregado</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <audio controls className="h-8">
                                <source src={personalizationForm.audioUrl} type="audio/mpeg" />
                                Seu navegador não suporta o elemento de áudio.
                              </audio>
                              <button
                                onClick={handleAudioRemove}
                                className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                                title="Remover áudio"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Upload de novo áudio */}
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                        <input
                          type="file"
                          accept="audio/mpeg,audio/mp3"
                          onChange={handleAudioUpload}
                          className="hidden"
                          id="audio-upload"
                        />
                        <label
                          htmlFor="audio-upload"
                          className="cursor-pointer flex flex-col items-center space-y-2"
                        >
                          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                            <Volume2 className="w-6 h-6 text-gray-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700">
                              {personalizationForm.audioUrl ? 'Alterar Áudio' : 'Adicionar Áudio'}
                            </p>
                            <p className="text-xs text-gray-500">
                              Clique para selecionar um arquivo MP3 (máx. 10MB)
                            </p>
                          </div>
                        </label>
                      </div>
                      <p className="text-sm text-gray-500">
                        Este áudio será reproduzido automaticamente quando o cliente escanear o QR code
                      </p>
                    </div>
                  </div>

                  {/* Preview */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Exemplo de cardápio
                    </label>
                    <div className="max-h-[500px] overflow-y-auto bg-gray-100 p-4 rounded-lg">
                      <MenuPreview
                        key={`${personalizationForm.primaryColor}-${personalizationForm.secondaryColor}-${personalizationForm.bannerUrl}`}
                        restaurantName={personalizationForm.restaurantName || 'Nome do Restaurante'}
                        primaryColor={personalizationForm.primaryColor || '#4B0082'}
                        secondaryColor={personalizationForm.secondaryColor || '#F7F4FC'}
                        bannerUrl={personalizationForm.bannerUrl}
                        className="shadow-xl"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      📱 Esta é uma prévia em tamanho mobile de como o cardápio aparecerá para os clientes. As personalizações de cor e banner são aplicadas em tempo real.
                    </p>
                  </div>
                </div>
              </PanelCard>
            </PanelPage>
          )}

          {activeTab === 'relatorios' && (
            <PanelPage>
              <PanelPageHeader
                title="Relatórios"
                description="Acompanhe pedidos, receita e desempenho do restaurante."
                icon={<BarChart3 className="w-5 h-5" />}
                actions={
                  <>
                    <select
                      value={selectedPeriod}
                      onChange={(e) => setSelectedPeriod(e.target.value as 'today' | 'week' | 'month' | 'all')}
                      className={panelSelectClass}
                    >
                      <option value="today">Hoje</option>
                      <option value="week">Última Semana</option>
                      <option value="month">Este Mês</option>
                      <option value="all">Todos os Períodos</option>
                    </select>
                    <PanelButton
                      onClick={loadStatistics}
                      disabled={loadingStats}
                      icon={<TrendingUp className="w-4 h-4" />}
                    >
                      {loadingStats ? 'Carregando...' : 'Atualizar'}
                    </PanelButton>
                  </>
                }
              />

              {loadingStats ? (
                <PanelCard padding="lg" className="text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-500 text-sm">Carregando estatísticas...</p>
                </PanelCard>
              ) : statistics ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <PanelStatCard
                      label="Total de Pedidos"
                      value={statistics.totalOrders}
                      icon={<Users className="w-5 h-5" />}
                    />
                    <PanelStatCard
                      label="Receita Total"
                      value={`R$ ${statistics.totalRevenue.toFixed(2)}`}
                      icon={<TrendingUp className="w-5 h-5" />}
                      iconClassName="bg-emerald-50 text-emerald-600"
                    />
                    <PanelStatCard
                      label="Pedidos Hoje"
                      value={statistics.ordersToday}
                      icon={<Calendar className="w-5 h-5" />}
                      iconClassName="bg-amber-50 text-amber-600"
                    />
                    <PanelStatCard
                      label="Ticket Médio"
                      value={`R$ ${statistics.averageOrderValue.toFixed(2)}`}
                      icon={<BarChart3 className="w-5 h-5" />}
                      iconClassName="bg-violet-50 text-violet-600"
                    />
                  </div>

                  {/* Produtos Mais Pedidos */}
                  <PanelCard padding="none">
                    <div className="p-5 sm:p-6 border-b border-gray-100">
                      <h3 className="text-base font-semibold text-gray-900">Top 10 Produtos Mais Pedidos</h3>
                    </div>
                    <div className="p-5 sm:p-6">
                      {statistics.topProducts.length > 0 ? (
                        <div className="space-y-4">
                          {statistics.topProducts.map((product, index) => (
                            <div key={product.productId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                                  {index + 1}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{product.productName}</p>
                                  <p className="text-sm text-gray-600">{product.categoryName}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-gray-900">{product.totalOrders} pedidos</p>
                                <p className="text-sm text-gray-600">
                                  {product.totalQuantity} itens • R$ {product.totalRevenue.toFixed(2)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-8">Nenhum produto encontrado no período selecionado</p>
                      )}
                    </div>
                  </PanelCard>

                  {/* Categorias Mais Populares */}
                  <PanelCard padding="none">
                    <div className="p-5 sm:p-6 border-b border-gray-100">
                      <h3 className="text-base font-semibold text-gray-900">Categorias Mais Populares</h3>
                    </div>
                    <div className="p-5 sm:p-6">
                      {statistics.topCategories.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {statistics.topCategories.map((category, index) => (
                            <div key={category.categoryId} className="p-4 border border-gray-200 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-gray-900">{category.categoryName}</h4>
                                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
                                  #{index + 1}
                                </span>
                              </div>
                              <div className="space-y-1 text-sm text-gray-600">
                                <p>{category.totalOrders} pedidos</p>
                                <p>{category.totalQuantity} itens vendidos</p>
                                <p className="font-semibold text-green-600">R$ {category.totalRevenue.toFixed(2)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-8">Nenhuma categoria encontrada no período selecionado</p>
                      )}
                    </div>
                  </PanelCard>

                  {/* Vendas por Dia */}
                  <PanelCard padding="none">
                    <div className="p-5 sm:p-6 border-b border-gray-100">
                      <h3 className="text-base font-semibold text-gray-900">Vendas dos Últimos 7 Dias</h3>
                    </div>
                    <div className="p-5 sm:p-6">
                      <div className="space-y-3">
                        {statistics.ordersByDay.map((day, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                            <div>
                              <p className="font-medium text-gray-900">{day.date}</p>
                              <p className="text-sm text-gray-600">{day.count} pedidos</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-green-600">R$ {day.revenue.toFixed(2)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </PanelCard>

                  {/* Vendas por Hora (Hoje) */}
                  {selectedPeriod === 'today' && (
                    <PanelCard padding="none">
                      <div className="p-5 sm:p-6 border-b border-gray-100">
                        <h3 className="text-base font-semibold text-gray-900">Pedidos por Hora (Hoje)</h3>
                      </div>
                      <div className="p-5 sm:p-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                          {statistics.ordersByHour.filter(hour => hour.count > 0).map((hour, index) => (
                            <div key={index} className="text-center p-3 border border-gray-200 rounded-lg">
                              <p className="text-sm font-medium text-gray-900">{hour.hour}</p>
                              <p className="text-lg font-bold text-blue-600">{hour.count}</p>
                            </div>
                          ))}
                        </div>
                        {statistics.ordersByHour.filter(hour => hour.count > 0).length === 0 && (
                          <p className="text-gray-500 text-center py-8">Nenhum pedido hoje</p>
                        )}
                      </div>
                    </PanelCard>
                  )}
                </div>
              ) : (
                <PanelEmptyState
                  icon={<BarChart3 className="w-12 h-12" />}
                  title="Nenhum dado carregado"
                  description='Clique em "Atualizar" para carregar as estatísticas do período selecionado.'
                />
              )}
            </PanelPage>
          )}

          {activeTab === 'cozinha' && (
            <PanelPage>
              <PanelPageHeader
                title="Cozinha"
                description="Gerencie pedidos de mesa e delivery em tempo real."
                icon={<ChefHat className="w-5 h-5" />}
                actions={
                  <PanelButton
                    variant="secondary"
                    onClick={() => {
                      if (kitchenSubTab === 'mesa') {
                        refreshOrders();
                      } else {
                        loadDeliveryOrders();
                      }
                    }}
                    icon={<RefreshCw className="w-4 h-4" />}
                  >
                    Atualizar
                  </PanelButton>
                }
                tabs={
                  <PanelTabGroup>
                    <PanelTab
                      active={kitchenSubTab === 'mesa'}
                      onClick={() => setKitchenSubTab('mesa')}
                      badge={mesaPendentesCount}
                    >
                      <Users className="w-4 h-4" />
                      Pedidos Mesa
                    </PanelTab>
                    <PanelTab
                      active={kitchenSubTab === 'delivery'}
                      onClick={() => setKitchenSubTab('delivery')}
                      badge={deliveryPendentesCount}
                    >
                      <Truck className="w-4 h-4" />
                      Pedidos Delivery
                    </PanelTab>
                  </PanelTabGroup>
                }
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <PanelStatCard
                  label="Pedidos Mesa"
                  value={orders.filter((o) => o.orderType === 'mesa').length}
                  icon={<Users className="w-5 h-5" />}
                  iconClassName="bg-blue-50 text-blue-600"
                />
                <PanelStatCard
                  label="Pedidos Delivery"
                  value={deliveryOrders.length}
                  icon={<Truck className="w-5 h-5" />}
                  iconClassName="bg-sky-50 text-sky-600"
                />
                <PanelStatCard
                  label="Total de Pedidos"
                  value={orders.length + deliveryOrders.length}
                  icon={<Package className="w-5 h-5" />}
                  iconClassName="bg-gray-100 text-gray-600"
                />
              </div>

              {/* Conteúdo das Sub-abas */}
              {kitchenSubTab === 'mesa' && (
                <div>
                  {orders.length === 0 ? (
                    <PanelEmptyState
                      icon={<Package className="w-12 h-12" />}
                      title="Nenhum pedido de mesa no momento"
                      description="Os pedidos de mesa aparecerão aqui quando forem enviados pelos clientes."
                    />
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {statusOrder.map((status) => (
                        <div key={status} className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              {getStatusIcon(status)}
                              <h3 className="text-lg font-semibold text-gray-900 capitalize">
                                {status === 'novo' && 'Novos Pedidos'}
                                {status === 'preparando' && 'Em Preparo'}
                                {status === 'pronto' && 'Prontos'}
                              </h3>
                            </div>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {groupedOrders[status]?.filter(o => o.orderType === 'mesa').length || 0}
                            </span>
                          </div>

                          <div className="space-y-4">
                            {groupedOrders[status]?.filter(o => o.orderType === 'mesa').map((order) => (
                              <div
                                key={order.id}
                                className={`p-6 rounded-lg border ${getStatusColor(status)}`}
                              >
                                <div className="flex justify-between items-start mb-4">
                                  <div className="flex items-center space-x-3">
                                    <div className="p-2 rounded-lg shadow-sm bg-white">
                                      <Users className="w-4 h-4 text-gray-600" />
                                    </div>
                                    <div>
                                      <h4 className="font-semibold text-gray-900">
                                        Mesa {order.mesaNumero}
                                      </h4>
                                      <p className="text-sm text-gray-500">{order.timestamp}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-1 text-sm text-gray-500">
                                    <Timer className="w-4 h-4" />
                                    <span>{order.tempoEspera}</span>
                                  </div>
                                </div>

                                <div className="mb-6">
                                  <h5 className="font-medium text-gray-900 mb-3 flex items-center">
                                    <Package className="w-4 h-4 mr-2 text-gray-500" />
                                    Itens do Pedido
                                  </h5>
                                  <ul className="space-y-2">
                                    {order.itens.map((item, index) => (
                                      <li key={index} className="text-sm text-gray-700 bg-white px-3 py-2 rounded border border-gray-100">
                                        {item}
                                      </li>
                                    ))}
                                  </ul>
                                </div>

                                <div className="space-y-2">
                                  {status !== 'pronto' && (
                                    <button
                                      onClick={() => handleStatusChange(order.id, status)}
                                      className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
                                    >
                                      {getStatusButtonText(status)}
                                    </button>
                                  )}

                                  {status === 'pronto' && (
                                    <button
                                      onClick={() => handleFinalizeOrder(order.id)}
                                      className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Finalizar Pedido
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {kitchenSubTab === 'delivery' && (
                <div>
                  {/* Barra: filtros, busca, som e atualizar */}
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    <select
                      value={deliveryStatusFilter}
                      onChange={(e) => setDeliveryStatusFilter(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-black"
                    >
                      <option value="all">Todos os status</option>
                      <option value="pending">Aguardando</option>
                      <option value="confirmed">Confirmado</option>
                      <option value="preparing">Preparando</option>
                      <option value="delivering">Saindo</option>
                      <option value="delivered">Entregue</option>
                      <option value="cancelled">Cancelado</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Buscar por cliente, telefone ou ID"
                      value={deliverySearch}
                      onChange={(e) => setDeliverySearch(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px] text-black"
                    />
                    <button
                      onClick={() => loadDeliveryOrders()}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-100 text-black hover:bg-gray-200 text-sm"
                      title="Atualizar lista"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Atualizar
                    </button>
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationSoundEnabled}
                        onChange={(e) => {
                          const v = e.target.checked;
                          setNotificationSoundEnabledState(v);
                          if (restaurantId) setNotificationSoundEnabled(restaurantId, v);
                        }}
                        className="rounded border-gray-300"
                      />
                      Som ao receber novo pedido
                    </label>
                  </div>

                  {deliveryLoading ? (
                    <PanelCard padding="lg" className="text-center">
                      <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-500 text-sm">Carregando pedidos de delivery...</p>
                    </PanelCard>
                  ) : deliveryOrders.length === 0 ? (
                    <PanelEmptyState
                      icon={<Truck className="w-12 h-12" />}
                      title="Nenhum pedido de delivery no momento"
                      description="Os pedidos de delivery aparecerão aqui quando forem enviados pelos clientes."
                    />
                  ) : (() => {
                    const searchLower = deliverySearch.trim().toLowerCase();
                    const filteredOrders = deliveryOrders.filter((order) => {
                      if (deliveryStatusFilter !== 'all' && order.status !== deliveryStatusFilter) return false;
                      if (searchLower) {
                        const matchName = order.customerName?.toLowerCase().includes(searchLower);
                        const matchPhone = order.customerPhone?.includes(deliverySearch.trim());
                        const matchId = order.id.toLowerCase().includes(searchLower);
                        if (!matchName && !matchPhone && !matchId) return false;
                      }
                      return true;
                    });
                    return (
                    <div className="overflow-x-auto pb-2">
                      <div className="grid gap-6 min-w-0" style={{ gridTemplateColumns: 'repeat(6, minmax(300px, 1fr))' }}>
                      {['pending', 'confirmed', 'preparing', 'delivering', 'delivered', 'cancelled'].map((status) => {
                        const statusInfo = getDeliveryStatusInfo(status as DeliveryOrder['status']);
                        const ordersInStatus = filteredOrders.filter(order => order.status === status);

                        return (
                          <div key={status} className="space-y-4 min-w-0">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className={`p-2 rounded-lg ${statusInfo.bgColor}`}>
                                  <Truck className={`w-5 h-5 ${statusInfo.color}`} />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {statusInfo.label}
                                </h3>
                              </div>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {ordersInStatus.length}
                              </span>
                            </div>

                            <div className="space-y-4">
                              {ordersInStatus.map((order) => (
                                <div
                                  key={order.id}
                                  className="p-4 sm:p-5 rounded-lg border border-gray-200 bg-white shadow-sm min-w-0 w-full"
                                >
                                  <div className="flex justify-between items-start gap-2 mb-4">
                                    <div className="flex items-center space-x-2 min-w-0">
                                      <div className="p-1.5 rounded-lg shadow-sm bg-blue-100 shrink-0">
                                        <Truck className="w-4 h-4 text-blue-600" />
                                      </div>
                                      <div className="min-w-0">
                                        <h4 className="font-semibold text-gray-900 truncate">
                                          #{order.id.substring(0, 8)}
                                        </h4>
                                        <p className="text-xs text-gray-500 whitespace-nowrap">
                                          {new Date(order.createdAt).toLocaleString('pt-BR')}
                                        </p>
                                      </div>
                                    </div>
                                    <span className={`shrink-0 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusInfo.bgColor} ${statusInfo.color}`}>
                                      {statusInfo.label}
                                    </span>
                                  </div>

                                  {/* Informações do Cliente */}
                                  <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100 min-w-0">
                                    <h5 className="font-medium text-gray-900 mb-2 text-sm flex items-center shrink-0">
                                      <Users className="w-4 h-4 mr-2 text-blue-600 shrink-0" />
                                      Cliente
                                    </h5>
                                    <div className="space-y-1 text-sm min-w-0">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span className="font-medium shrink-0">Nome:</span>
                                        <span className="truncate">{order.customerName}</span>
                                      </div>
                                      <div className="flex items-center gap-2 min-w-0">
                                        <Phone className="w-3 h-3 shrink-0" />
                                        <span className="break-all">{order.customerPhone}</span>
                                      </div>
                                      <div className="flex items-start gap-2 min-w-0">
                                        <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                        <span className="break-words">{order.customerAddress}</span>
                                      </div>
                                      <div className="flex items-center gap-2 min-w-0">
                                        <CreditCard className="w-3 h-3 shrink-0" />
                                        <span className="shrink-0">{order.paymentMethod === 'money' ? 'Dinheiro' :
                                          order.paymentMethod === 'credit' ? 'Cartão de Crédito' :
                                            order.paymentMethod === 'debit' ? 'Cartão de Débito' :
                                              order.paymentMethod === 'stripe' ? 'Cartão online (Stripe)' : 'PIX'}</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="mb-4 min-w-0">
                                    <h5 className="font-medium text-gray-900 mb-2 text-sm flex items-center shrink-0">
                                      <Package className="w-4 h-4 mr-2 text-gray-500 shrink-0" />
                                      Itens do Pedido
                                    </h5>
                                    <ul className="space-y-2">
                                      {order.items.map((item, index) => (
                                        <li key={index} className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded border border-gray-100 min-w-0">
                                          <div className="flex justify-between items-start gap-2">
                                            <span className="font-medium min-w-0 break-words">{item.quantity}x {item.productName}</span>
                                            <span className="font-semibold text-gray-900 shrink-0 whitespace-nowrap">R$ {(item.price * item.quantity).toFixed(2)}</span>
                                          </div>
                                          {item.observations && (
                                            <p className="text-xs text-gray-500 italic mt-1 break-words">
                                              Obs: {item.observations}
                                            </p>
                                          )}
                                        </li>
                                      ))}
                                    </ul>
                                    <div className="mt-3 pt-3 border-t border-gray-200 space-y-1">
                                      <div className="flex justify-between items-center text-sm gap-2">
                                        <span className="text-gray-600">Subtotal:</span>
                                        <span className="font-semibold whitespace-nowrap">R$ {order.total.toFixed(2)}</span>
                                      </div>
                                      <div className="flex justify-between items-center text-sm gap-2">
                                        <span className="text-gray-600">Taxa de entrega:</span>
                                        <span className="font-semibold whitespace-nowrap">R$ {order.deliveryFee.toFixed(2)}</span>
                                      </div>
                                      <div className="flex justify-between items-center text-lg font-bold text-gray-900 pt-2 border-t border-gray-200 gap-2">
                                        <span>Total:</span>
                                        <span className="whitespace-nowrap">R$ {(order.total + order.deliveryFee).toFixed(2)}</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    {statusInfo.nextStatus && (
                                      <button
                                        onClick={() => handleDeliveryStatusChange(order.id, statusInfo.nextStatus!)}
                                        className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                                      >
                                        {getDeliveryStatusButtonText(order.status)}
                                      </button>
                                    )}

                                    {order.status === 'delivered' && (
                                      <div className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600">
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Pedido Entregue
                                      </div>
                                    )}

                                    {/* Botão de cancelar para pedidos que podem ser cancelados */}
                                    {['pending', 'confirmed', 'preparing'].includes(order.status) && (
                                      <button
                                        onClick={() => handleCancelOrder(order)}
                                        className="w-full inline-flex items-center justify-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                                      >
                                        <X className="w-4 h-4 mr-2" />
                                        Recusar Pedido
                                      </button>
                                    )}

                                    {order.status === 'cancelled' && (
                                      <div className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600">
                                        <X className="w-4 h-4 mr-2" />
                                        Pedido Cancelado
                                      </div>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => setSelectedDeliveryOrder(order)}
                                      className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                    >
                                      Ver detalhes
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      </div>
                    </div>
                    );
                  })()}
                </div>
              )}

              {/* Modal de detalhes do pedido de delivery */}
              {selectedDeliveryOrder && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedDeliveryOrder(null)}>
                  <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                    <div className="p-6 border-b flex justify-between items-center">
                      <h3 className="text-xl font-semibold">Pedido #{selectedDeliveryOrder.id.substring(0, 8)}</h3>
                      <button type="button" onClick={() => setSelectedDeliveryOrder(null)} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
                    </div>
                    <div className="p-6 space-y-4">
                      <p className="text-sm text-gray-500">{new Date(selectedDeliveryOrder.createdAt).toLocaleString('pt-BR')} · {getDeliveryStatusInfo(selectedDeliveryOrder.status).label}</p>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Cliente</h4>
                        <p className="text-sm text-gray-700">{selectedDeliveryOrder.customerName}</p>
                        <p className="text-sm text-gray-700 flex items-center gap-1"><Phone className="w-3 h-3" /> {selectedDeliveryOrder.customerPhone}</p>
                        <p className="text-sm text-gray-700 flex items-start gap-1"><MapPin className="w-3 h-3 mt-0.5 shrink-0" /> {selectedDeliveryOrder.customerAddress}</p>
                        <p className="text-sm text-gray-600">Pagamento: {selectedDeliveryOrder.paymentMethod === 'money' ? 'Dinheiro' : selectedDeliveryOrder.paymentMethod === 'credit' ? 'Crédito' : selectedDeliveryOrder.paymentMethod === 'debit' ? 'Débito' : selectedDeliveryOrder.paymentMethod === 'stripe' ? 'Cartão online (Stripe)' : 'PIX'}</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Itens</h4>
                        <ul className="space-y-1 text-sm">
                          {selectedDeliveryOrder.items.map((item, i) => (
                            <li key={i} className="flex justify-between">{item.quantity}x {item.productName} <span>R$ {(item.price * item.quantity).toFixed(2)}</span></li>
                          ))}
                        </ul>
                        <div className="mt-2 pt-2 border-t text-sm flex justify-between"><span>Subtotal</span><span>R$ {selectedDeliveryOrder.total.toFixed(2)}</span></div>
                        <div className="flex justify-between text-sm"><span>Taxa de entrega</span><span>R$ {selectedDeliveryOrder.deliveryFee.toFixed(2)}</span></div>
                        <div className="flex justify-between font-semibold"><span>Total</span><span>R$ {(selectedDeliveryOrder.total + selectedDeliveryOrder.deliveryFee).toFixed(2)}</span></div>
                      </div>
                      {selectedDeliveryOrder.observations && <p className="text-sm text-gray-600"><strong>Obs.:</strong> {selectedDeliveryOrder.observations}</p>}
                      {selectedDeliveryOrder.status === 'cancelled' && selectedDeliveryOrder.cancellationReason && <p className="text-sm text-red-600"><strong>Motivo do cancelamento:</strong> {selectedDeliveryOrder.cancellationReason}</p>}
                      <div className="flex flex-wrap gap-2 pt-2">
                        {getDeliveryStatusInfo(selectedDeliveryOrder.status).nextStatus && (
                          <button
                            onClick={async () => {
                              await handleDeliveryStatusChange(selectedDeliveryOrder.id, getDeliveryStatusInfo(selectedDeliveryOrder.status).nextStatus!);
                              setSelectedDeliveryOrder(null);
                            }}
                            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
                          >
                            {getDeliveryStatusButtonText(selectedDeliveryOrder.status)}
                          </button>
                        )}
                        {['pending', 'confirmed', 'preparing'].includes(selectedDeliveryOrder.status) && (
                          <button
                            onClick={() => { setOrderToCancel(selectedDeliveryOrder); setShowCancelModal(true); setSelectedDeliveryOrder(null); }}
                            className="px-4 py-2 rounded-lg border border-red-300 text-red-700 text-sm hover:bg-red-50"
                          >
                            Recusar / Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </PanelPage>
          )}

          {activeTab === 'delivery' && (
            <PanelPage>
              <PanelPageHeader
                title="Configurações de Delivery"
                description="Gerencie sua presença no serviço de delivery e os produtos disponíveis."
                icon={<Truck className="w-5 h-5" />}
              />

              <div className="space-y-6">
                {/* Stripe Connect — recebimento online */}
                <PanelCard className="border-emerald-200 bg-gradient-to-br from-emerald-50/80 via-white to-white">
                    <div className="flex items-start gap-4">
                      <div className="rounded-2xl bg-emerald-600 p-3 shadow-lg shadow-emerald-600/25">
                        <CreditCard className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                            Etapa obrigatória
                          </span>
                          <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
                            Libera pagamento pelo app
                          </span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-950">
                          Ative o recebimento online para seus clientes pagarem no aplicativo
                        </h3>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-700">
                          Para aceitar cartão e PIX online no delivery, conecte o restaurante à Stripe e conclua
                          o cadastro. Enquanto as cobranças estiverem inativas, os clientes só verão dinheiro,
                          PIX ou cartão na entrega.
                        </p>

                        <div className="mt-4 grid gap-2 sm:grid-cols-3">
                          <div className="rounded-xl border border-emerald-100 bg-white/85 p-3">
                            <p className="text-xs font-bold text-emerald-800">1. Conectar</p>
                            <p className="mt-1 text-xs text-gray-600">Abra o cadastro seguro da Stripe.</p>
                          </div>
                          <div className="rounded-xl border border-emerald-100 bg-white/85 p-3">
                            <p className="text-xs font-bold text-emerald-800">2. Concluir dados</p>
                            <p className="mt-1 text-xs text-gray-600">Envie dados bancários e responsáveis.</p>
                          </div>
                          <div className="rounded-xl border border-emerald-100 bg-white/85 p-3">
                            <p className="text-xs font-bold text-emerald-800">3. Atualizar status</p>
                            <p className="mt-1 text-xs text-gray-600">Confirme quando “Cobranças” ficar ativa.</p>
                          </div>
                        </div>
                      </div>
                    </div>

                  <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50/80 p-4">
                    {stripeConnectBanner && (
                      <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                        {stripeConnectBanner}
                      </div>
                    )}
                    <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                            Status da solicitação Stripe
                          </p>
                          <h4 className="mt-1 text-base font-bold text-slate-950">
                            {stripeConnectChargesEnabled === true
                              ? 'Pagamento pelo app liberado'
                              : stripeConnectDetailsSubmitted === true
                                ? 'Aguardando liberação de cobranças pela Stripe'
                                : stripeConnectAccountId
                                  ? 'Cadastro Stripe iniciado'
                                  : 'Conexão Stripe ainda não iniciada'}
                          </h4>
                          <p className="mt-1 text-sm text-slate-600">
                            {stripeConnectChargesEnabled === true
                              ? 'Os clientes já podem pagar cartão e PIX online pelo aplicativo.'
                              : stripeConnectDetailsSubmitted === true
                                ? 'O cadastro foi enviado, mas a Stripe ainda não autorizou esta conta a receber pagamentos.'
                                : stripeConnectAccountId
                                  ? 'Continue o cadastro para enviar os dados exigidos pela Stripe.'
                                  : 'Conecte o restaurante para iniciar a análise e liberar pagamento online.'}
                          </p>
                        </div>
                        <span
                          className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-2 text-xs font-bold ${
                            stripeConnectChargesEnabled === true
                              ? 'bg-emerald-100 text-emerald-800'
                              : stripeConnectDetailsSubmitted === true
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {stripeConnectChargesEnabled === true ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : stripeConnectDetailsSubmitted === true ? (
                            <RefreshCw className="h-4 w-4" />
                          ) : (
                            <AlertCircle className="h-4 w-4" />
                          )}
                          {stripeConnectChargesEnabled === true
                            ? 'Ativo'
                            : stripeConnectDetailsSubmitted === true
                              ? 'Em análise'
                              : 'Pendente'}
                        </span>
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <div
                          className={`rounded-xl border p-3 ${
                            stripeConnectAccountId
                              ? 'border-emerald-200 bg-emerald-50'
                              : 'border-slate-200 bg-white'
                          }`}
                        >
                          <div className="mb-2 flex items-center gap-2">
                            {stripeConnectAccountId ? (
                              <CheckCircle className="h-4 w-4 text-emerald-700" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-slate-500" />
                            )}
                            <p className="text-xs font-bold text-slate-900">1. Conta conectada</p>
                          </div>
                          <p className="text-xs leading-5 text-slate-600">
                            {stripeConnectAccountId
                              ? 'A subconta Stripe do restaurante já foi criada.'
                              : 'Ainda falta iniciar a conexão com a Stripe.'}
                          </p>
                        </div>

                        <div
                          className={`rounded-xl border p-3 ${
                            stripeConnectDetailsSubmitted === true
                              ? 'border-blue-200 bg-blue-50'
                              : 'border-slate-200 bg-white'
                          }`}
                        >
                          <div className="mb-2 flex items-center gap-2">
                            {stripeConnectDetailsSubmitted === true ? (
                              <CheckCircle className="h-4 w-4 text-blue-700" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-slate-500" />
                            )}
                            <p className="text-xs font-bold text-slate-900">2. Cadastro enviado</p>
                          </div>
                          <p className="text-xs leading-5 text-slate-600">
                            {stripeConnectDetailsSubmitted === true
                              ? 'Os dados obrigatórios foram enviados para análise.'
                              : 'Complete os dados bancários e do responsável.'}
                          </p>
                        </div>

                        <div
                          className={`rounded-xl border p-3 ${
                            stripeConnectChargesEnabled === true
                              ? 'border-emerald-200 bg-emerald-50'
                              : 'border-amber-200 bg-amber-50'
                          }`}
                        >
                          <div className="mb-2 flex items-center gap-2">
                            {stripeConnectChargesEnabled === true ? (
                              <CheckCircle className="h-4 w-4 text-emerald-700" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-amber-700" />
                            )}
                            <p className="text-xs font-bold text-slate-900">3. Pagamento no app</p>
                          </div>
                          <p className="text-xs leading-5 text-slate-600">
                            {stripeConnectChargesEnabled === true
                              ? 'Liberado para os clientes pagarem pelo aplicativo.'
                              : 'Ainda bloqueado no checkout até a Stripe ativar cobranças.'}
                          </p>
                        </div>
                      </div>
                    </div>
                    {stripeConnectChargesEnabled === false &&
                      (stripeConnectDisabledReason || stripeConnectRequirementsSummary) && (
                        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                          <p className="font-semibold">Motivo informado pela Stripe:</p>
                          {stripeConnectDisabledReason && (
                            <p className="mt-1">Status: {stripeConnectDisabledReason}</p>
                          )}
                          {stripeConnectRequirementsSummary && (
                            <p className="mt-1 break-words">
                              Pendências: {stripeConnectRequirementsSummary}
                            </p>
                          )}
                        </div>
                      )}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setStripeModalAction('onboard');
                          setStripeModalPassword('');
                          setStripeModalError(null);
                          setStripeModalOpen(true);
                        }}
                        className="inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:-translate-y-0.5 hover:bg-emerald-700"
                      >
                        Conectar / continuar cadastro Stripe
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStripeModalAction('sync');
                          setStripeModalPassword('');
                          setStripeModalError(null);
                          setStripeModalOpen(true);
                        }}
                        className="inline-flex items-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-800 transition hover:-translate-y-0.5 hover:bg-gray-50"
                      >
                        Atualizar status
                      </button>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-gray-500">
                      Por segurança, vamos pedir a senha do restaurante antes de falar com a Stripe. O pagamento
                      pelo app só aparece para os clientes quando a Stripe confirmar cobranças ativas.
                    </p>
                  </div>
                </PanelCard>

                {/* Card: Habilitar/Desabilitar Delivery */}
                <PanelCard>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-gray-900 mb-2">
                        Aparecer no Delivery
                      </h3>
                      <p className="text-sm text-gray-500 mb-4">
                        Controle se seu restaurante aparece na plataforma de delivery. 
                        Quando desabilitado, os clientes não conseguirão ver seu restaurante na lista.
                      </p>
                    </div>
                    <div className="ml-4">
                      <button
                        onClick={() => {
                          const newValue = !deliveryEnabled;
                          console.log(`🔄 Toggle restaurante no delivery: ${deliveryEnabled} → ${newValue}`);
                          setDeliveryEnabled(newValue);
                        }}
                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          deliveryEnabled ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                            deliveryEnabled ? 'translate-x-7' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center space-x-2">
                    {deliveryEnabled ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="text-sm font-medium text-green-700">
                          Seu restaurante está visível no delivery
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-5 h-5 text-amber-500" />
                        <span className="text-sm font-medium text-amber-700">
                          Seu restaurante está oculto no delivery
                        </span>
                      </>
                    )}
                  </div>
                </PanelCard>

                {/* Card: Descrição para IA */}
                <PanelCard>
                  <div className="flex items-start gap-3 mb-4">
                    <div className="bg-blue-50 p-2 rounded-lg text-blue-600 border border-blue-100">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-gray-900 mb-2">
                        Descrição para Assistente de IA
                      </h3>
                      <p className="text-sm text-gray-500 mb-4">
                        Esta descrição será usada pelo chatbot de IA para fornecer informações mais precisas 
                        sobre seu restaurante aos clientes. Inclua detalhes sobre especialidades, horários especiais, 
                        promoções, ou qualquer informação relevante.
                      </p>
                    </div>
                  </div>
                  <textarea
                    value={deliveryDescription}
                    onChange={(e) => setDeliveryDescription(e.target.value)}
                    placeholder="Ex: Somos especializados em comida italiana autêntica. Trabalhamos com massas frescas feitas diariamente. Temos opções vegetarianas e veganas. Horário de funcionamento: 11h às 23h de terça a domingo."
                    rows={6}
                    className={`${panelInputClass} resize-none`}
                  />
                  <p className="mt-2 text-xs text-gray-400">
                    {deliveryDescription.length} caracteres • Quanto mais detalhado, melhor para a IA
                  </p>
                </PanelCard>

                {/* Card: Produtos Disponíveis para Delivery */}
                <PanelCard>
                  <div className="flex items-start gap-3 mb-4">
                    <div className="bg-blue-50 p-2 rounded-lg text-blue-600 border border-blue-100">
                      <Utensils className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-gray-900 mb-2">
                        Produtos Disponíveis para Delivery
                      </h3>
                      <p className="text-sm text-gray-500 mb-4">
                        Escolha quais produtos do seu cardápio estarão disponíveis para pedidos de delivery. 
                        Produtos desabilitados não aparecerão no menu de delivery.
                      </p>
                    </div>
                  </div>

                  {products.length === 0 ? (
                    <div className="text-center py-12">
                      <Utensils className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">
                        Nenhum produto cadastrado ainda
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {categories.map(category => {
                        const categoryProducts = products.filter(p => p.category === category.name);
                        if (categoryProducts.length === 0) return null;

                        return (
                          <div key={category.id} className="border border-gray-200 rounded-lg overflow-hidden">
                            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                              <h4 className="font-semibold text-gray-900">{category.name}</h4>
                            </div>
                            <div className="divide-y divide-gray-200">
                              {categoryProducts.map(product => (
                                <div
                                  key={product.id}
                                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                                >
                                  <div className="flex items-center space-x-3 flex-1">
                                    {product.image && (
                                      <ProductImage
                                        src={product.image}
                                        alt={product.name}
                                        className="w-12 h-12 rounded-lg object-cover"
                                      />
                                    )}
                                    <div className="flex-1">
                                      <p className="font-medium text-gray-900">{product.name}</p>
                                      <p className="text-sm text-gray-500">
                                        R$ {product.price.toFixed(2)}
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => toggleProductDelivery(product.id)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                      (productDeliverySettings[product.id] ?? true)
                                        ? 'bg-blue-600'
                                        : 'bg-gray-200'
                                    }`}
                                  >
                                    <span
                                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                        (productDeliverySettings[product.id] ?? true)
                                          ? 'translate-x-6'
                                          : 'translate-x-1'
                                      }`}
                                    />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </PanelCard>

                <div className="flex justify-end">
                  <PanelButton
                    onClick={handleSaveDeliverySettings}
                    disabled={isSavingDelivery}
                    icon={<Save className="w-4 h-4" />}
                    className="px-6 py-3"
                  >
                    {isSavingDelivery ? 'Salvando...' : 'Salvar Todas as Configurações'}
                  </PanelButton>
                </div>
              </div>
            </PanelPage>
          )}

          </div>
        </div>
      </div>

      {/* Modal Stripe Connect — confirma senha do restaurante */}
      {stripeModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {stripeModalAction === 'onboard'
                ? 'Conectar recebimento Stripe'
                : 'Atualizar status Stripe'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Informe a senha deste restaurante (mesma usada para entrar em Configurações).
            </p>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Senha</label>
            <PasswordInput
              autoComplete="current-password"
              value={stripeModalPassword}
              onChange={(e) => setStripeModalPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black mb-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              disabled={stripeModalBusy}
            />
            {stripeModalError && (
              <p className="text-sm text-red-600 mb-3">{stripeModalError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setStripeModalOpen(false);
                  setStripeModalPassword('');
                  setStripeModalError(null);
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
                disabled={stripeModalBusy}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void submitStripeConnectModal()}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60"
                disabled={stripeModalBusy}
              >
                {stripeModalBusy ? 'Aguarde…' : stripeModalAction === 'onboard' ? 'Continuar' : 'Sincronizar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Cancelar Pedido */}
      {showCancelModal && orderToCancel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-red-600">Recusar Pedido</h3>
              <button
                onClick={closeCancelModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-black mb-2">
                Tem certeza que deseja recusar este pedido?
              </p>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-medium text-black">Pedido #{orderToCancel.id.substring(0, 8)}</p>
                <p className="text-sm text-black">Cliente: {orderToCancel.customerName}</p>
                <p className="text-sm text-black">Total: R$ {(orderToCancel.total + orderToCancel.deliveryFee).toFixed(2)}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Motivo da recusa (opcional)
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Ex: Produto indisponível, horário de funcionamento..."
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 text-black"
                  rows={3}
                />
              </div>

              <div className="flex space-x-2 justify-end">
                <button
                  onClick={closeCancelModal}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmCancelOrder}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  <X className="w-4 h-4 mr-2 inline" />
                  Recusar Pedido
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
                <h3 className="text-lg font-semibold text-black">
                  {editingProduct ? 'Editar Produto' : 'Adicionar Novo Produto'}
                </h3>
                {editingProduct && (
                  <p className="text-sm text-black mt-1">
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
                  <label className="block text-sm font-medium text-black mb-2">
                    Nome do Produto *
                  </label>
                  <input
                    type="text"
                    value={productForm.name}
                    onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Hambúrguer Clássico"
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Categoria *
                  </label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-black"
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
                <label className="block text-sm font-medium text-black mb-2">
                  Descrição *
                </label>
                <textarea
                  value={productForm.description}
                  onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva o produto..."
                  rows={3}
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-black"
                />
              </div>

              {/* Campo de Imagem */}
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Imagem do Produto
                </label>
                <div className="w-full">
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleProductImageUpload}
                    disabled={isUploadingProductImage}
                    className="hidden"
                    id="product-image-upload"
                  />
                  <label
                    htmlFor={isUploadingProductImage ? undefined : 'product-image-upload'}
                    className={`cursor-pointer block ${isUploadingProductImage ? 'cursor-wait pointer-events-none' : ''}`}
                  >
                    <div className="w-32 h-32 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-gray-400 transition-colors relative overflow-hidden">
                      {isUploadingProductImage && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10 rounded-lg">
                          <RefreshCw className="w-8 h-8 text-white animate-spin" />
                        </div>
                      )}
                      {productForm.image ? (
                        <div className="relative w-full h-full">
                          <ProductImage
                            src={productForm.image}
                            alt="Preview"
                            className="w-full h-full"
                            containerClassName="w-full h-full"
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
                        <div className="text-center text-black">
                          <div className="text-2xl mb-1">📷</div>
                          <p className="text-xs">Clique para adicionar</p>
                          <p className="text-xs">JPG, PNG ou WebP (máx. 5MB)</p>
                        </div>
                      )}
                    </div>
                  </label>
                  <p className="text-xs text-black mt-2">
                    {isUploadingProductImage ? 'Enviando imagem...' : 'Clique no espaço acima para fazer upload (máx. 5MB)'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Preço (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={productForm.price}
                    onChange={(e) => setProductForm(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="0.00"
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Tempo de Preparo (min)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={productForm.preparationTime}
                    onChange={(e) => setProductForm(prev => ({ ...prev, preparationTime: e.target.value }))}
                    placeholder="0"
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Status
                  </label>
                  <div className="flex items-center mt-2">
                    <input
                      type="checkbox"
                      checked={productForm.available}
                      onChange={(e) => setProductForm(prev => ({ ...prev, available: e.target.checked }))}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 text-sm text-black">
                      Disponível
                    </label>
                  </div>
                </div>
              </div>

              {/* Botão de Tradução Automática */}
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-black">Tradução Automática</h3>
                    <p className="text-sm text-black">Traduza automaticamente este produto usando IA</p>
                  </div>
                  <div className="relative">
                    <button
                      onClick={handleAutoTranslateProduct}
                      disabled={!hasAutomaticTranslation || isTranslating || !productForm.name.trim() || !productForm.description.trim()}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${hasAutomaticTranslation && !isTranslating && productForm.name.trim() && productForm.description.trim()
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      title={
                        !hasAutomaticTranslation
                          ? 'Você não possui permissão para tradução automática. Entre em contato com o administrador.'
                          : !productForm.name.trim() || !productForm.description.trim()
                            ? 'Preencha o nome e descrição do produto antes de traduzir'
                            : isTranslating
                              ? 'Traduzindo...'
                              : 'Traduzir automaticamente este produto para inglês, espanhol e francês'
                      }
                    >
                      {isTranslating ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      <span>{isTranslating ? 'Traduzindo...' : 'Traduzir Automaticamente'}</span>
                    </button>
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
                  className={`px-4 py-2 rounded ${productForm.name.trim() && productForm.description.trim() && productForm.price && productForm.category
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
              <h3 className="text-lg font-semibold text-black">
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
                <label className="block text-sm font-medium text-black mb-2">
                  Nome da Categoria
                </label>
                <input
                  type="text"
                  value={categoryForm}
                  onChange={(e) => setCategoryForm(e.target.value)}
                  placeholder="Ex: Lanches"
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
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

              {/* Botão de Tradução Automática */}
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Tradução Automática</h3>
                    <p className="text-sm text-gray-500">Traduza automaticamente esta categoria usando IA</p>
                  </div>
                  <div className="relative">
                    <button
                      onClick={handleAutoTranslateCategory}
                      disabled={!hasAutomaticTranslation || isTranslating || !categoryForm.trim()}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${hasAutomaticTranslation && !isTranslating && categoryForm.trim()
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      title={
                        !hasAutomaticTranslation
                          ? 'Você não possui permissão para tradução automática. Entre em contato com o administrador.'
                          : !categoryForm.trim()
                            ? 'Preencha o nome da categoria antes de traduzir'
                            : isTranslating
                              ? 'Traduzindo...'
                              : 'Traduzir automaticamente esta categoria para inglês, espanhol e francês'
                      }
                    >
                      {isTranslating ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      <span>{isTranslating ? 'Traduzindo...' : 'Traduzir Automaticamente'}</span>
                    </button>
                  </div>
                </div>
              </div>

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
                  className={`px-4 py-2 rounded ${categoryForm.trim()
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
              <div className="flex items-center justify-center gap-2 mb-4">
                <p className="text-sm text-gray-600 truncate max-w-xs">
                  {generateTableUrl(restaurantId ?? '', qrCodeModal.numero)}
                </p>
                <button
                  onClick={() => {
                    const url = generateTableUrl(restaurantId ?? '', qrCodeModal.numero);
                    void navigator.clipboard.writeText(url).then(() => {
                      setUrlCopied(true);
                      setTimeout(() => setUrlCopied(false), 2000);
                    });
                  }}
                  title="Copiar URL"
                  className="flex-shrink-0 flex items-center gap-1 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-medium px-2 py-1 rounded transition"
                >
                  {urlCopied ? (
                    <>
                      <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-green-600">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
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

      {/* Modal: extração de texto de PDF do cardápio */}
      {showPdfExtractModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Extrair texto do cardápio (PDF)</h3>
                <p className="text-sm text-gray-500 mt-1">
                  O arquivo é enviado ao Storage e processado no servidor. PDFs escaneados (só imagem) precisam de OCR em outra etapa.
                </p>
              </div>
              <button
                type="button"
                onClick={resetPdfExtractModal}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Arquivo PDF</label>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  disabled={pdfExtractLoading || !restaurantId}
                  onChange={(e) => void handlePdfMenuFile(e)}
                  className="w-full text-sm text-gray-800"
                />
              </div>
              {pdfExtractLoading && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Enviando e extraindo texto…
                </div>
              )}
              {pdfExtractError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {pdfExtractError}
                </div>
              )}
              {pdfExtractMeta && (
                <p className="text-xs text-gray-600">
                  Páginas: {pdfExtractMeta.pageCount} · Caracteres: {pdfExtractMeta.charCount}
                  {pdfExtractMeta.truncated ? ' · Texto truncado na resposta (limite de segurança).' : ''}
                </p>
              )}
              {pdfExtractedText ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Texto extraído</label>
                  <textarea
                    readOnly
                    value={pdfExtractedText}
                    rows={14}
                    className="w-full font-mono text-xs border border-gray-300 rounded-md p-2 bg-gray-50 text-gray-900"
                  />
                  <button
                    type="button"
                    className="mt-2 text-sm text-blue-600 hover:underline"
                    onClick={() => {
                      void navigator.clipboard.writeText(pdfExtractedText);
                    }}
                  >
                    Copiar texto
                  </button>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      disabled={pdfClaudeLoading || pdfExtractLoading || !restaurantId}
                      onClick={() => void handlePdfClaudeImport()}
                      className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:from-violet-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {pdfClaudeLoading ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      {pdfClaudeLoading ? 'Importando com IA…' : 'Importar cardápio com IA (Claude)'}
                    </button>
                    <p className="text-xs text-gray-500 max-w-md">
                      O Claude lê o texto, sugere categorias (Bebidas, Pratos, etc.), cria categorias que faltam e cadastra os produtos neste restaurante.
                    </p>
                  </div>
                  {pdfClaudeResult && (
                    <div
                      className={`mt-3 rounded-lg border p-3 text-sm ${
                        pdfClaudeResult.success && pdfClaudeResult.errors.length === 0
                          ? 'border-green-200 bg-green-50 text-green-900'
                          : 'border-amber-200 bg-amber-50 text-amber-900'
                      }`}
                    >
                      <p className="font-medium">
                        Categorias novas: {pdfClaudeResult.categoriesCreated} · Produtos criados:{' '}
                        {pdfClaudeResult.productsCreated}
                        {pdfClaudeResult.productsSkipped > 0
                          ? ` · Ignorados: ${pdfClaudeResult.productsSkipped}`
                          : ''}
                      </p>
                      {pdfClaudeResult.warnings.length > 0 && (
                        <ul className="mt-2 list-inside list-disc text-xs">
                          {pdfClaudeResult.warnings.slice(0, 12).map((w, i) => (
                            <li key={i}>{w}</li>
                          ))}
                          {pdfClaudeResult.warnings.length > 12 && (
                            <li>… e mais {pdfClaudeResult.warnings.length - 12} avisos</li>
                          )}
                        </ul>
                      )}
                      {pdfClaudeResult.errors.length > 0 && (
                        <ul className="mt-2 list-inside list-disc text-xs text-red-800">
                          {pdfClaudeResult.errors.map((er, i) => (
                            <li key={i}>{er}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
            <div className="p-4 border-t flex justify-end">
              <button
                type="button"
                onClick={resetPdfExtractModal}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Importação CSV */}
      {showCSVModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold">Importar Produtos via CSV</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Faça upload de um arquivo CSV ou cole o conteúdo diretamente
                </p>
              </div>
              <button
                onClick={resetCSVModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Informações sobre a estrutura do CSV */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-800 mb-2">
                  📋 Estrutura do CSV
                </h4>
                <div className="text-sm text-blue-700 space-y-1">
                  <p><strong>Campos obrigatórios:</strong> name, description, price, category</p>
                  <p><strong>Campos opcionais:</strong> preparationTime, available, traduções</p>
                  <p><strong>Formato:</strong> Use vírgulas para separar campos, aspas para valores com vírgulas</p>
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  className="mt-3 bg-blue-500 text-white px-3 py-1 rounded text-sm flex items-center space-x-1 hover:bg-blue-600"
                >
                  <FileText className="w-4 h-4" />
                  <span>Baixar Template</span>
                </button>
              </div>

              {/* Upload de arquivo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload de Arquivo CSV
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVFileUpload}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Editor de texto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ou cole o conteúdo CSV aqui
                </label>
                <textarea
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  placeholder="Cole aqui o conteúdo do CSV..."
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
              </div>

              {/* Resultado da importação */}
              {importResult && (
                <div className={`border rounded-lg p-4 ${importResult.success
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
                  }`}>
                  <h4 className={`text-sm font-medium mb-2 ${importResult.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                    {importResult.success ? '✅ Importação Concluída' : '❌ Erro na Importação'}
                  </h4>
                  <p className={`text-sm ${importResult.success ? 'text-green-700' : 'text-red-700'
                    }`}>
                    {importResult.message}
                  </p>

                  {importResult.success && (
                    <div className="mt-2 text-sm text-green-700">
                      <p>• Produtos importados: {importResult.importedProducts}</p>
                      <p>• Categorias criadas: {importResult.createdCategories}</p>
                    </div>
                  )}

                  {importResult.errors.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-red-800 mb-1">Erros encontrados:</p>
                      <ul className="text-sm text-red-700 space-y-1 max-h-32 overflow-y-auto">
                        {importResult.errors.map((error, index) => (
                          <li key={index} className="text-xs">• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Botões de ação */}
              <div className="flex space-x-2 justify-end">
                <button
                  onClick={resetCSVModal}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleImportCSV}
                  disabled={!csvContent.trim() || isImporting}
                  className={`px-4 py-2 rounded flex items-center space-x-2 ${csvContent.trim() && !isImporting
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                >
                  <Upload className="w-4 h-4" />
                  <span>{isImporting ? 'Importando...' : 'Importar Produtos'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Importação por Imagem */}
      {showImageImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                    <Sparkles className="w-7 h-7 text-purple-600" />
                    <span>Importar Cardápio por Imagem</span>
                    <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs px-3 py-1 rounded-full font-bold">IA</span>
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Tire uma foto do seu cardápio e nossa IA extrairá automaticamente todos os produtos
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowImageImportModal(false);
                    setImageImportFile(null);
                    setImageImportPreview(null);
                    setImageImportResult(null);
                    setAutoTranslateOnImport(false);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Upload de Imagem */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Selecione a imagem do cardápio
                </label>

                {!imageImportPreview ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-purple-500 transition-colors cursor-pointer"
                    onClick={() => document.getElementById('image-upload')?.click()}
                  >
                    <Upload className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600 mb-2">Clique para selecionar uma imagem</p>
                    <p className="text-sm text-gray-500">JPG, PNG ou WEBP (máx. 10MB)</p>
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileSelect}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative">
                      <img
                        src={imageImportPreview}
                        alt="Preview"
                        className="w-full h-64 object-contain bg-gray-100 rounded-lg"
                      />
                      <button
                        onClick={() => {
                          setImageImportFile(null);
                          setImageImportPreview(null);
                          setImageImportResult(null);
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-600">
                      <strong>Dica:</strong> Certifique-se de que o texto do cardápio está legível e bem iluminado
                    </p>
                  </div>
                )}
              </div>

              {/* Resultado da Importação */}
              {imageImportResult && (
                <div className={`mb-6 p-4 rounded-lg ${imageImportResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}>
                  <div className="flex items-start space-x-3">
                    {imageImportResult.success ? (
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className={`font-medium ${imageImportResult.success ? 'text-green-900' : 'text-red-900'}`}>
                        {imageImportResult.message}
                      </p>
                      {imageImportResult.errors && imageImportResult.errors.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-700 font-medium">Erros encontrados:</p>
                          <ul className="mt-1 text-sm text-gray-600 space-y-1">
                            {imageImportResult.errors.map((error, index) => (
                              <li key={index}>• {error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Instruções */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Como funciona:
                </h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• A IA irá analisar a imagem e identificar produtos, descrições e preços</li>
                  <li>• Categorias serão criadas automaticamente se não existirem</li>
                  <li>• Produtos com o mesmo nome não serão duplicados</li>
                  <li>• Revise os produtos importados após o processo</li>
                </ul>
              </div>

              {/* Opção de Tradução Automática */}
              <div className="mb-6">
                <label className={`flex items-center space-x-3 p-4 border rounded-lg transition-colors ${hasAutomaticTranslation
                  ? 'bg-purple-50 border-purple-200 cursor-pointer hover:bg-purple-100'
                  : 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-60'
                  }`}>
                  <input
                    type="checkbox"
                    checked={autoTranslateOnImport}
                    onChange={(e) => setAutoTranslateOnImport(e.target.checked)}
                    disabled={!hasAutomaticTranslation}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className={`font-semibold ${hasAutomaticTranslation ? 'text-purple-900' : 'text-gray-600'}`}>
                        Traduzir produtos automaticamente
                      </span>
                      <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">IA</span>
                      {!hasAutomaticTranslation && (
                        <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">Sem permissão</span>
                      )}
                    </div>
                    <p className={`text-sm mt-1 ${hasAutomaticTranslation ? 'text-purple-700' : 'text-gray-500'}`}>
                      {hasAutomaticTranslation
                        ? 'Os produtos importados serão traduzidos automaticamente para inglês, espanhol e francês'
                        : 'Esta funcionalidade requer permissão de tradução automática no seu plano'
                      }
                    </p>
                  </div>
                </label>
              </div>

              {/* Botões de Ação */}
              <div className="flex space-x-3 justify-end">
                <button
                  onClick={() => {
                    setShowImageImportModal(false);
                    setImageImportFile(null);
                    setImageImportPreview(null);
                    setImageImportResult(null);
                    setAutoTranslateOnImport(false);
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleImageImport}
                  disabled={!imageImportFile || isProcessingImage}
                  className={`px-6 py-2 rounded-lg font-semibold flex items-center space-x-2 ${imageImportFile && !isProcessingImage
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                >
                  {isProcessingImage ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Processando...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      <span>Processar Imagem</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
} 