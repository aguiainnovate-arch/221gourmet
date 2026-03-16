import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { User, Mail, Phone, MapPin, CreditCard, Utensils, ArrowLeft, Lock } from 'lucide-react';
import { useDeliveryAuth } from '../contexts/DeliveryAuthContext';
import { useRestaurantAuth } from '../contexts/RestaurantAuthContext';
import { getRestaurants } from '../services/restaurantService';
import { saveDeliveryUser, getDeliveryUserByEmail, getDeliveryUserByPhone } from '../services/deliveryUserService';
import {
  validateEmailOrPhone,
  applyPhoneMaskInput,
  getInputKind,
  formatPhoneDisplay,
  normalizePhone
} from '../utils/authInputUtils';
import LanguageSelector from '../components/LanguageSelector';

type Step = 'email' | 'restaurant_password' | 'delivery_register';

export default function DeliveryAuth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/delivery';
  const isFromOrders = redirectTo === '/delivery/orders';

  const { login: deliveryLogin, updateUser } = useDeliveryAuth();
  const { login: restaurantLogin } = useRestaurantAuth();

  const [step, setStep] = useState<Step>('email');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Passo 1: email ou telefone
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [emailOrPhoneTouched, setEmailOrPhoneTouched] = useState(false);
  // Formulário de cadastro (Criar conta)
  const [email, setEmail] = useState('');

  // Restaurante (após identificar email de restaurante)
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurantEmail, setRestaurantEmail] = useState('');
  const [password, setPassword] = useState('');

  // Cadastro delivery (Criar conta)
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<'money' | 'credit' | 'debit' | 'pix'>('pix');

  const validation = validateEmailOrPhone(emailOrPhone);
  const showEmailOrPhoneError = emailOrPhoneTouched && !validation.valid && emailOrPhone.trim() !== '';

  /** Aplica máscara e formatação ao digitar no campo email/telefone */
  const handleEmailOrPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const kind = getInputKind(raw);
    if (kind === 'phone') {
      setEmailOrPhone(applyPhoneMaskInput(raw));
    } else {
      setEmailOrPhone(raw);
    }
    setError('');
  };

  /** Passo 1: usuário informou email ou telefone e clicou em Entrar */
  const handleIdentify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailOrPhoneTouched(true);
    const result = validateEmailOrPhone(emailOrPhone);
    if (!result.valid) {
      setError(result.error);
      return;
    }

    try {
      setIsSubmitting(true);
      if (result.kind === 'email') {
        const restaurants = await getRestaurants();
        const restaurant = restaurants.find(
          (r) => r.email?.toLowerCase() === result.normalized.toLowerCase()
        );
        if (restaurant) {
          setRestaurantId(restaurant.id);
          setRestaurantEmail(result.normalized);
          setPassword('');
          setStep('restaurant_password');
          return;
        }
        const deliveryUser = await getDeliveryUserByEmail(result.normalized);
        if (deliveryUser) {
          await deliveryLogin(deliveryUser.id);
          navigate(redirectTo, { replace: true });
          return;
        }
      } else {
        const deliveryUser = await getDeliveryUserByPhone(result.normalized);
        if (deliveryUser) {
          await deliveryLogin(deliveryUser.id);
          navigate(redirectTo, { replace: true });
          return;
        }
      }
      setError('Usuário não encontrado. Crie uma conta para continuar.');
    } catch (err) {
      console.error('Erro ao identificar usuário:', err);
      setError('Erro ao verificar. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /** Login restaurante: email já identificado, usuário digitou senha */
  const handleRestaurantLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!password.trim()) {
      setError('Informe sua senha.');
      return;
    }
    if (!restaurantId) return;

    try {
      setIsSubmitting(true);
      const success = await restaurantLogin(restaurantEmail, password);
      if (success) {
        navigate(`/${restaurantId}/settings`, { replace: true });
      } else {
        setError('Senha incorreta. Tente novamente.');
      }
    } catch (err) {
      console.error('Erro ao fazer login:', err);
      setError('Erro ao entrar. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /** Cadastro novo usuário delivery (Criar conta) */
  const handleDeliveryRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name?.trim() || !email?.trim() || !phone?.trim() || !address?.trim()) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }

    try {
      setIsSubmitting(true);
      const userData = await saveDeliveryUser({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        defaultPaymentMethod
      });
      await deliveryLogin(userData.id);
      updateUser(userData);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      console.error('Erro ao criar conta:', err);
      setError('Erro ao criar conta. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const goBackToEmail = () => {
    setStep('email');
    setError('');
    setPassword('');
    setRestaurantId(null);
    setRestaurantEmail('');
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col lg:flex-row" style={{ backgroundColor: '#FFF8F2' }}>
      {/* Coluna esquerda: branding */}
      <div
        className="hidden lg:flex lg:w-1/2 lg:h-full p-8 flex-col justify-between shrink-0"
        style={{ background: 'linear-gradient(135deg, #E91120 0%, #D6081B 50%, #B40511 100%)' }}
      >
        <Link
          to="/delivery"
          className="inline-flex items-center gap-2 text-white/90 hover:text-white font-medium transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao delivery
        </Link>
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Utensils className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">Bora Comer</span>
          </div>
          <p className="text-white/90 text-sm max-w-sm leading-relaxed">
            {step === 'restaurant_password'
              ? 'Este email é de um restaurante. Digite sua senha para acessar as configurações.'
              : step === 'delivery_register'
                ? 'Preencha seus dados para criar sua conta e pedir com mais facilidade.'
                : 'Entre com seu email ou telefone. Se for restaurante, use o email para acessar as configurações.'}
          </p>
        </div>
        <p className="text-white/70 text-xs">
          Pedidos entregues com cuidado. Sua comida favorita a um clique.
        </p>
      </div>

      <div className="flex-1 min-h-0 flex flex-col justify-center px-6 py-6 lg:px-12 lg:py-8 overflow-hidden relative">
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10">
          <LanguageSelector variant="light" />
        </div>
        <div className="w-full max-w-md mx-auto shrink-0">
          <Link
            to="/delivery"
            className="lg:hidden inline-flex items-center gap-2 font-medium mb-4 text-sm hover:opacity-80"
            style={{ color: '#E91120' }}
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>

          <div className="mb-4">
            <h1 className="text-xl lg:text-2xl font-bold" style={{ color: '#2A1E1A' }}>
              {step === 'email' && (isFromOrders ? 'Faça login para ver seus pedidos' : 'Entrar na sua conta')}
              {step === 'restaurant_password' && 'Acesso do restaurante'}
              {step === 'delivery_register' && 'Criar conta'}
            </h1>
            <p className="mt-1 text-sm" style={{ color: '#6B5A54' }}>
              {step === 'email' && (isFromOrders ? 'Entre com seu email ou telefone, ou crie uma conta para acessar seus pedidos.' : 'Informe seu email ou telefone. Se for restaurante, use o email e digite a senha em seguida.')}
              {step === 'restaurant_password' && 'Digite sua senha para acessar as configurações do restaurante.'}
              {step === 'delivery_register' && 'Preencha seus dados para começar a pedir.'}
            </p>
          </div>

          {error && (
            <div className="mb-3 p-3 rounded-lg text-xs border" style={{ backgroundColor: 'rgba(233,17,32,0.08)', borderColor: '#E91120', color: '#B40511' }}>
              {error}
            </div>
          )}

          {/* Passo 1: email ou telefone */}
          {step === 'email' && (
            <form onSubmit={handleIdentify} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#2A1E1A' }}>
                  Email ou telefone
                </label>
                <div className="relative">
                  {getInputKind(emailOrPhone) === 'phone' ? (
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#6B5A54' }} />
                  ) : (
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#6B5A54' }} />
                  )}
                  <input
                    type="text"
                    inputMode={getInputKind(emailOrPhone) === 'phone' ? 'tel' : 'email'}
                    value={getInputKind(emailOrPhone) === 'phone'
                      ? formatPhoneDisplay(normalizePhone(emailOrPhone))
                      : emailOrPhone}
                    onChange={handleEmailOrPhoneChange}
                    onBlur={() => setEmailOrPhoneTouched(true)}
                    className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E91120]/30 focus:border-[#E91120]"
                    style={{
                      borderColor: showEmailOrPhoneError ? '#E91120' : '#E9D7C4',
                      backgroundColor: '#FAF0DB',
                      color: '#2A1E1A'
                    }}
                    placeholder="seu@email.com ou +55 11 99999 9999"
                    autoComplete="username"
                  />
                </div>
                {showEmailOrPhoneError && (
                  <p className="mt-1 text-xs" style={{ color: '#E91120' }}>{validation.error}</p>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setStep('delivery_register');
                    setError('');
                    setEmail(validation.valid && validation.kind === 'email' ? validation.normalized : '');
                    setName('');
                    setPhone(validation.valid && validation.kind === 'phone' ? validation.normalized : '');
                    setAddress('');
                  }}
                  className="flex-1 px-4 py-2.5 border-2 rounded-lg font-semibold text-sm transition-colors hover:bg-[#FAF0DB]"
                  style={{ borderColor: '#E9D7C4', color: '#2A1E1A' }}
                >
                  Criar conta
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 rounded-lg font-bold text-sm text-white disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-md hover:opacity-90"
                  style={{ backgroundColor: isSubmitting ? undefined : '#E91120' }}
                >
                  {isSubmitting ? 'Verificando...' : 'Entrar'}
                </button>
              </div>
            </form>
          )}

          {/* Passo 2: senha do restaurante */}
          {step === 'restaurant_password' && (
            <form onSubmit={handleRestaurantLogin} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#2A1E1A' }}>Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#6B5A54' }} />
                  <input
                    type="email"
                    value={restaurantEmail}
                    readOnly
                    className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
                    style={{ borderColor: '#E9D7C4', backgroundColor: '#FAF0DB', color: '#2A1E1A' }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#2A1E1A' }}>Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#6B5A54' }} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E91120]/30 focus:border-[#E91120]"
                    style={{ borderColor: '#E9D7C4', backgroundColor: '#FAF0DB', color: '#2A1E1A' }}
                    placeholder="Sua senha"
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  onClick={goBackToEmail}
                  className="flex-1 px-4 py-2.5 border-2 rounded-lg font-semibold text-sm transition-colors hover:bg-[#FAF0DB]"
                  style={{ borderColor: '#E9D7C4', color: '#2A1E1A' }}
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 rounded-lg font-bold text-sm text-white disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-md hover:opacity-90"
                  style={{ backgroundColor: isSubmitting ? undefined : '#E91120' }}
                >
                  {isSubmitting ? 'Entrando...' : 'Entrar'}
                </button>
              </div>
            </form>
          )}

          {/* Passo 3: cadastro delivery (Criar conta) */}
          {step === 'delivery_register' && (
            <form onSubmit={handleDeliveryRegister} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#2A1E1A' }}>Nome completo *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#6B5A54' }} />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E91120]/30 focus:border-[#E91120]"
                    style={{ borderColor: '#E9D7C4', backgroundColor: '#FAF0DB', color: '#2A1E1A' }}
                    placeholder="Seu nome completo"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#2A1E1A' }}>Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#6B5A54' }} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E91120]/30 focus:border-[#E91120]"
                    style={{ borderColor: '#E9D7C4', backgroundColor: '#FAF0DB', color: '#2A1E1A' }}
                    placeholder="seu@email.com"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#2A1E1A' }}>Telefone *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#6B5A54' }} />
                  <input
                    type="tel"
                    inputMode="tel"
                    value={phone ? formatPhoneDisplay(normalizePhone(phone)) : ''}
                    onChange={(e) => setPhone(applyPhoneMaskInput(e.target.value))}
                    className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E91120]/30 focus:border-[#E91120]"
                    style={{ borderColor: '#E9D7C4', backgroundColor: '#FAF0DB', color: '#2A1E1A' }}
                    placeholder="+55 11 99999 9999"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#2A1E1A' }}>Endereço de entrega *</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4" style={{ color: '#6B5A54' }} />
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#E91120]/30 focus:border-[#E91120]"
                    style={{ borderColor: '#E9D7C4', backgroundColor: '#FAF0DB', color: '#2A1E1A' }}
                    rows={2}
                    placeholder="Rua, número, complemento, bairro, cidade"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#2A1E1A' }}>Forma de pagamento padrão</label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#6B5A54' }} />
                  <select
                    value={defaultPaymentMethod}
                    onChange={(e) => setDefaultPaymentMethod(e.target.value as 'money' | 'credit' | 'debit' | 'pix')}
                    className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[#E91120]/30 focus:border-[#E91120]"
                    style={{ borderColor: '#E9D7C4', backgroundColor: '#FAF0DB', color: '#2A1E1A' }}
                  >
                    <option value="money">Dinheiro</option>
                    <option value="credit">Cartão de Crédito</option>
                    <option value="debit">Cartão de Débito</option>
                    <option value="pix">PIX</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  onClick={goBackToEmail}
                  className="flex-1 px-4 py-2.5 border-2 rounded-lg font-semibold text-sm transition-colors hover:bg-[#FAF0DB]"
                  style={{ borderColor: '#E9D7C4', color: '#2A1E1A' }}
                >
                  Já tenho conta
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 rounded-lg font-bold text-sm text-white disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-md hover:opacity-90"
                  style={{ backgroundColor: isSubmitting ? undefined : '#E91120' }}
                >
                  {isSubmitting ? 'Criando...' : 'Criar conta'}
                </button>
              </div>
            </form>
          )}

          {step === 'email' && (
            <p className="mt-4 text-xs text-center" style={{ color: '#6B5A54' }}>
              Não tem conta? Crie uma para salvar endereço e forma de pagamento.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
