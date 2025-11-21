import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useParams } from 'react-router-dom';
import { validateToken, markTokenAsUsed } from '../services/registrationTokenService';
import { getPlanById } from '../services/planService';
import { addRestaurant, checkDomainExists } from '../services/restaurantService';
import type { RegistrationToken } from '../types/registrationToken';
import type { Plan } from '../types/plan';

type PageState = 'loading' | 'invalid' | 'ready' | 'success';

interface RestaurantFormData {
  restaurantName: string;
  domain: string;
  email: string;
  phone: string;
  address: string;
  primaryColor: string;
  secondaryColor: string;
}

const PREVIEW_MENU = [
  { name: 'Bruschetta Mediterrânea', description: 'Tomates marinados, pesto de manjericão e redução balsâmica.', price: 'R$ 29' },
  { name: 'Risoto de Camarão', description: 'Cremoso com alho-poró, toque cítrico e parmesão.', price: 'R$ 68' },
  { name: 'Entrecôte Black Pepper', description: 'Angus grelhado, batatas rústicas e molho poivre.', price: 'R$ 92' }
];

export default function Register() {
  const { token } = useParams<{ token: string }>();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [tokenData, setTokenData] = useState<RegistrationToken | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState<string>('');
  const [formData, setFormData] = useState<RestaurantFormData>({
    restaurantName: '',
    domain: '',
    email: '',
    phone: '',
    address: '',
    primaryColor: '#0F172A',
    secondaryColor: '#F97316'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [createdRestaurantId, setCreatedRestaurantId] = useState<string>('');

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      if (!token) {
        setError('Token não fornecido');
        setPageState('invalid');
        return;
      }

      setPageState('loading');
      setError('');

      try {
        const result = await validateToken(token);
        if (!result.valid || !result.token) {
          setError(result.error || 'Este link não é mais válido.');
          setPageState('invalid');
          return;
        }

        const planData = await getPlanById(result.token.planId);

        if (!active) return;

        setTokenData(result.token);
        setPlan(planData);
        setPageState('ready');
      } catch (err) {
        console.error('Erro ao validar token:', err);
        if (!active) return;
        setError('Não foi possível validar o link. Tente novamente mais tarde.');
        setPageState('invalid');
      }
    };

    fetchData();
    return () => {
      active = false;
    };
  }, [token]);

  const handleInputChange = (field: keyof RestaurantFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDomainChange = (value: string) => {
    const sanitized = value
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .slice(0, 25);
    handleInputChange('domain', sanitized);
  };

  const handlePhoneChange = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    
    // Aplica máscara conforme o tamanho
    let masked = '';
    if (numbers.length <= 2) {
      masked = numbers;
    } else if (numbers.length <= 6) {
      masked = `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    } else if (numbers.length <= 10) {
      masked = `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    } else {
      // Telefone com 11 dígitos (celular com 9)
      masked = `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
    }
    
    handleInputChange('phone', masked);
  };

  const handleColorChange = (field: 'primaryColor' | 'secondaryColor', value: string) => {
    let sanitized = value.trim();
    if (!sanitized.startsWith('#')) {
      sanitized = `#${sanitized.replace(/#/g, '')}`;
    }
    sanitized = sanitized.substring(0, 7);
    if (/^#[0-9a-fA-F]{0,6}$/.test(sanitized)) {
      handleInputChange(field, sanitized);
    }
  };

  const domainPreview = useMemo(() => {
    if (!formData.domain) {
      return 'meu-restaurante.221menu.com';
    }
    return `${formData.domain}.221menu.com`;
  }, [formData.domain]);

  const validateForm = async (): Promise<boolean> => {
    const errors: Record<string, string> = {};

    // Validações obrigatórias
    if (!formData.restaurantName.trim()) {
      errors.restaurantName = 'Nome do restaurante é obrigatório';
    }

    if (!formData.domain.trim()) {
      errors.domain = 'Domínio é obrigatório';
    } else if (formData.domain.length < 3) {
      errors.domain = 'Domínio deve ter pelo menos 3 caracteres';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email é obrigatório';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        errors.email = 'Email inválido';
      }
    }

    if (!formData.phone.trim()) {
      errors.phone = 'Telefone é obrigatório';
    } else {
      // Validar formato de telefone brasileiro
      const phoneNumbers = formData.phone.replace(/\D/g, '');
      if (phoneNumbers.length < 10 || phoneNumbers.length > 11) {
        errors.phone = 'Telefone inválido';
      }
    }

    if (!formData.address.trim()) {
      errors.address = 'Endereço é obrigatório';
    }

    // Verificar se domínio já existe
    if (formData.domain && !errors.domain) {
      try {
        const domainExists = await checkDomainExists(formData.domain);
        if (domainExists) {
          errors.domain = 'Este domínio já está em uso';
        }
      } catch (err) {
        console.error('Erro ao verificar domínio:', err);
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!tokenData || !plan) return;

    setIsSubmitting(true);
    setError('');
    setValidationErrors({});

    try {
      // Validar formulário
      const isValid = await validateForm();
      if (!isValid) {
        setIsSubmitting(false);
        return;
      }

      // Criar restaurante
      const newRestaurant = await addRestaurant({
        name: formData.restaurantName,
        domain: formData.domain,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        planId: tokenData.planId,
        theme: {
          primaryColor: formData.primaryColor,
          secondaryColor: formData.secondaryColor
        }
      });

      // Marcar token como usado
      await markTokenAsUsed(tokenData.id, newRestaurant.id);

      // Salvar ID do restaurante criado e mudar para página de sucesso
      setCreatedRestaurantId(newRestaurant.id);
      setPageState('success');
    } catch (err: any) {
      console.error('Erro ao criar restaurante:', err);
      setError(err.message || 'Erro ao criar restaurante. Por favor, tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (pageState === 'loading') {
    return (
      <FullScreenState
        variant="loading"
        title="Validando seu link"
        subtitle="Estamos confirmando as permissões do seu plano. Isso leva apenas alguns segundos."
      />
    );
  }

  if (pageState === 'invalid' || !tokenData) {
    return (
      <FullScreenState
        variant="error"
        title="Link não disponível"
        subtitle={error || 'Este link já foi utilizado ou está expirado. Solicite um novo link ao time responsável.'}
      />
    );
  }

  if (pageState === 'success') {
    return (
      <SuccessPage 
        restaurantName={formData.restaurantName}
        domain={formData.domain}
        restaurantId={createdRestaurantId}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="space-y-2 text-center lg:text-left">
          <p className="text-sm font-medium text-gray-500">Cadastro do restaurante</p>
          <h1 className="text-3xl font-semibold text-gray-900">
            Configure o cardápio digital do seu restaurante
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto lg:mx-0">
            Preencha as informações básicas e personalize as cores que serão usadas no cardápio.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[2fr_1.2fr]">
          {/* Form Card */}
          <section className="bg-white rounded-2xl shadow-lg p-8 space-y-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm text-gray-500">Etapa 1 de 2</p>
                <h2 className="text-2xl font-semibold text-gray-900">Informações do restaurante</h2>
              </div>
              <span className="px-4 py-1.5 rounded-full bg-gray-100 text-gray-700 text-sm font-medium">
                Token válido até {new Date(tokenData.expiresAt).toLocaleDateString('pt-BR')}
              </span>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <svg className="w-5 h-5 text-red-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            )}

            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  label="Nome do restaurante"
                  value={formData.restaurantName}
                  placeholder="Ex: Casa do Chef"
                  onChange={(e) => handleInputChange('restaurantName', e.target.value)}
                  error={validationErrors.restaurantName}
                />
                <FormField
                  label="Email de contato"
                  value={formData.email}
                  placeholder="contato@restaurante.com"
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  error={validationErrors.email}
                />
                <FormField
                  label="Telefone / WhatsApp"
                  value={formData.phone}
                  placeholder="(11) 98888-0000"
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  type="tel"
                  error={validationErrors.phone}
                />
                <FormField
                  label="Endereço completo"
                  value={formData.address}
                  placeholder="Rua Exemplo, 123 - São Paulo"
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  error={validationErrors.address}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Domínio personalizado</label>
                <div className={`flex items-center rounded-lg border overflow-hidden focus-within:ring-2 bg-white ${
                  validationErrors.domain 
                    ? 'border-red-300 focus-within:ring-red-400' 
                    : 'border-gray-300 focus-within:ring-emerald-400'
                }`}>
                  <input
                    type="text"
                    value={formData.domain}
                    onChange={(e) => handleDomainChange(e.target.value)}
                    placeholder="nomerestaurante"
                    className="flex-1 px-4 py-2.5 bg-transparent text-gray-900 placeholder:text-gray-400 outline-none"
                  />
                  <span className="bg-gray-50 text-gray-500 text-sm px-4 whitespace-nowrap">.221menu.com</span>
                </div>
                {validationErrors.domain ? (
                  <p className="text-xs text-red-600 mt-1">{validationErrors.domain}</p>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">Será o endereço do seu cardápio digital.</p>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <ColorField
                  label="Cor primária"
                  value={formData.primaryColor}
                  onChange={(value) => handleColorChange('primaryColor', value)}
                />
                <ColorField
                  label="Cor de destaque"
                  value={formData.secondaryColor}
                  onChange={(value) => handleColorChange('secondaryColor', value)}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full py-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold uppercase text-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Criando restaurante...
                </>
              ) : (
                'Finalizar cadastro'
              )}
            </button>
          </section>

          {/* Sidebar */}
          <aside className="space-y-6">
            <PlanSummaryCard plan={plan} tokenData={tokenData} />
            <MobileMenuPreview
              restaurantName={formData.restaurantName || 'Seu restaurante'}
              domainPreview={domainPreview}
              primaryColor={formData.primaryColor}
              secondaryColor={formData.secondaryColor}
            />
          </aside>
        </div>
      </div>
    </div>
  );
}

interface FullScreenStateProps {
  variant: 'loading' | 'error';
  title: string;
  subtitle: string;
}

function FullScreenState({ variant, title, subtitle }: FullScreenStateProps) {
  const isLoading = variant === 'loading';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-10 text-center border border-gray-100">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center bg-gray-100">
          {isLoading ? (
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-emerald-500 border-t-transparent" />
          ) : (
            <svg className="w-10 h-10 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>
        <h1 className="text-2xl font-semibold mb-3 text-gray-900">{title}</h1>
        <p className="text-gray-600">{subtitle}</p>
      </div>
    </div>
  );
}

interface FormFieldProps {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  error?: string;
}

function FormField({ label, value, placeholder, onChange, type = 'text', error }: FormFieldProps) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700 mb-1 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:border-transparent transition bg-white ${
          error 
            ? 'border-red-300 focus:ring-red-400' 
            : 'border-gray-300 focus:ring-emerald-400'
        }`}
      />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function ColorField({ label, value, onChange }: ColorFieldProps) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700 mb-1 block">{label}</label>
      <div className="flex items-center space-x-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-12 border border-gray-300 rounded-lg cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
      </div>
    </div>
  );
}

interface PlanSummaryCardProps {
  plan: Plan | null;
  tokenData: RegistrationToken;
}

function PlanSummaryCard({ plan, tokenData }: PlanSummaryCardProps) {
  const features = plan?.features?.length ? plan.features : [
    'Cardápio digital multilíngue',
    'Atualizações em tempo real',
    'Pedidos ilimitados',
    'Dashboard de performance'
  ];

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-4 gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-emerald-600 font-semibold">Plano selecionado</p>
          <h3 className="text-xl font-semibold text-gray-900">{plan?.name || tokenData.planName || 'Plano personalizado'}</h3>
        </div>
        <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
          {plan?.supportLevel || 'Suporte dedicado'}
        </span>
      </div>
      <p className="text-sm text-gray-600 mb-5">
        {plan?.description || 'Plano especial configurado pelo time 221 Gourmet para o seu restaurante.'}
      </p>
      <ul className="space-y-3 text-sm text-gray-700">
        {features.slice(0, 5).map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface MobileMenuPreviewProps {
  restaurantName: string;
  domainPreview: string;
  primaryColor: string;
  secondaryColor: string;
}

function MobileMenuPreview({ restaurantName, domainPreview, primaryColor, secondaryColor }: MobileMenuPreviewProps) {
  return (
    <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
      <p className="text-sm font-medium text-gray-700 mb-4">Prévia do cardápio</p>
      <div className="bg-gray-50 rounded-[32px] p-4 w-full max-w-xs mx-auto border border-gray-100">
        <div
          className="rounded-3xl overflow-hidden border border-gray-200"
          style={{ backgroundColor: primaryColor }}
        >
          <div className="pt-6 px-6 text-white">
            <p className="text-xs uppercase tracking-[0.2em] text-white/70">221 Gourmet</p>
            <h3 className="text-lg font-semibold mt-1">{restaurantName}</h3>
            <p className="text-xs text-white/70 flex items-center gap-2 mt-1">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-300" />
              {domainPreview}
            </p>
          </div>
          <div className="bg-white rounded-3xl mt-5 mx-4 p-4 shadow-sm space-y-4">
            {PREVIEW_MENU.map((item) => (
              <div key={item.name} className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.description}</p>
                </div>
                <span className="text-sm font-semibold" style={{ color: secondaryColor }}>
                  {item.price}
                </span>
              </div>
            ))}
            <button
              type="button"
              className="w-full py-2 rounded-xl font-semibold text-xs text-white"
              style={{ backgroundColor: secondaryColor }}
            >
              Ver cardápio completo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SuccessPageProps {
  restaurantName: string;
  domain: string;
  restaurantId: string;
}

function SuccessPage({ restaurantName, domain }: SuccessPageProps) {
  const domainUrl = `https://${domain}.221menu.com`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-center border border-gray-100">
          {/* Success Icon */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-100 flex items-center justify-center">
            <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
          Cadastro concluído!
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            O restaurante <span className="font-semibold text-emerald-600">{restaurantName}</span> foi criado com sucesso!
          </p>

          {/* Info Card */}
          <div className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-2xl p-6 mb-8 border border-emerald-100">
            <p className="text-sm text-gray-600 mb-3">Seu cardápio digital está disponível em:</p>
            <a 
              href={domainUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-lg font-semibold text-emerald-600 hover:text-emerald-700 transition"
            >
              {domain}.221menu.com
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>

          {/* Next Steps */}
          <div className="bg-gray-50 rounded-2xl p-6 mb-8 text-left">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Próximos passos
            </h3>
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-semibold">1</span>
                <span>Acesse o painel administrativo e comece a adicionar seus pratos</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-semibold">2</span>
                <span>Personalize seu cardápio com fotos, descrições e preços</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-semibold">3</span>
                <span>Compartilhe o link do seu cardápio digital com seus clientes</span>
              </li>
            </ul>
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={domainUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
            >
              Visualizar cardápio
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </a>
          </div>

          {/* Footer Note */}
          <p className="text-xs text-gray-500 mt-8">
            Precisa de ajuda? Entre em contato com o suporte da 221 Gourmet
          </p>
        </div>
      </div>
    </div>
  );
}

