import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useParams } from 'react-router-dom';
import { validateToken } from '../services/registrationTokenService';
import { getPlanById } from '../services/planService';
import type { RegistrationToken } from '../types/registrationToken';
import type { Plan } from '../types/plan';

type PageState = 'loading' | 'invalid' | 'ready';

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

            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  label="Nome do restaurante"
                  value={formData.restaurantName}
                  placeholder="Ex: Casa do Chef"
                  onChange={(e) => handleInputChange('restaurantName', e.target.value)}
                />
                <FormField
                  label="Email de contato"
                  value={formData.email}
                  placeholder="contato@restaurante.com"
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
                <FormField
                  label="Telefone / WhatsApp"
                  value={formData.phone}
                  placeholder="(11) 98888-0000"
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                />
                <FormField
                  label="Endereço completo"
                  value={formData.address}
                  placeholder="Rua Exemplo, 123 - São Paulo"
                  onChange={(e) => handleInputChange('address', e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Domínio personalizado</label>
                <div className="flex items-center rounded-lg border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-emerald-400 bg-white">
                  <input
                    type="text"
                    value={formData.domain}
                    onChange={(e) => handleDomainChange(e.target.value)}
                    placeholder="nomerestaurante"
                    className="flex-1 px-4 py-2.5 bg-transparent text-gray-900 placeholder:text-gray-400 outline-none"
                  />
                  <span className="bg-gray-50 text-gray-500 text-sm px-4 whitespace-nowrap">.221menu.com</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Será o endereço do seu cardápio digital.</p>
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
              disabled
              className="w-full py-4 rounded-lg bg-gray-200 text-gray-500 font-semibold uppercase text-sm cursor-not-allowed"
            >
              Finalizar cadastro (em breve)
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
}

function FormField({ label, value, placeholder, onChange }: FormFieldProps) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700 mb-1 block">{label}</label>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition bg-white"
      />
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

