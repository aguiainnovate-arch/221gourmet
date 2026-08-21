import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { User, Mail, MapPin, CreditCard, Utensils, ArrowLeft, Lock } from 'lucide-react';
import type { ConfirmationResult } from 'firebase/auth';
import { useDeliveryAuth } from '../contexts/DeliveryAuthContext';
import { useRestaurantAuth } from '../contexts/RestaurantAuthContext';
import { getRestaurants } from '../services/restaurantService';
import {
  saveDeliveryUser,
  getDeliveryUserByEmail,
  getDeliveryUserByPhone,
  linkDeliveryUserAuthUid,
} from '../services/deliveryUserService';
import {
  sendPhoneOtp,
  confirmPhoneOtp,
  mapPhoneAuthError,
} from '../services/phoneAuthService';
import {
  isEmail,
  normalizePhone,
} from '../utils/authInputUtils';
import type { CreateDeliveryUserData } from '../types/deliveryUser';
import LanguageSelector from '../components/LanguageSelector';
import PasswordInput from '../components/PasswordInput';
import PhoneOtpForm from '../components/PhoneOtpForm';
import PhoneWithCountryInput from '../components/PhoneWithCountryInput';
import PhoneRecaptcha from '../components/PhoneRecaptcha';
import { withTimeout } from '../utils/withTimeout';

const LOOKUP_TIMEOUT_MS = 15_000;

type Step = 'email' | 'captcha' | 'otp' | 'restaurant_password' | 'delivery_register';
type OtpPurpose = 'login' | 'register';
type LoginMode = 'phone' | 'email';

export default function DeliveryAuth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/delivery';
  const isFromOrders = redirectTo === '/delivery/orders';

  const { login: deliveryLogin, loginAfterPhoneAuth, updateUser } = useDeliveryAuth();
  const { login: restaurantLogin } = useRestaurantAuth();

  useEffect(() => {
    document.title = 'Bora Comer!';
  }, []);

  const [step, setStep] = useState<Step>('email');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [loginMode, setLoginMode] = useState<LoginMode>('phone');
  const [email, setEmail] = useState('');

  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurantEmail, setRestaurantEmail] = useState('');
  const [password, setPassword] = useState('');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<
    'money' | 'credit' | 'debit' | 'pix' | 'stripe'
  >('pix');

  // OTP SMS
  const [otpPhone, setOtpPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpPurpose, setOtpPurpose] = useState<OtpPurpose>('login');
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const pendingRegisterRef = useRef<CreateDeliveryUserData | null>(null);

  const [loginPhoneTouched, setLoginPhoneTouched] = useState(false);
  const [loginEmailTouched, setLoginEmailTouched] = useState(false);

  const queuePhoneOtp = (phoneE164: string, purpose: OtpPurpose) => {
    setOtpPhone(phoneE164);
    setOtpPurpose(purpose);
    setOtpCode('');
    setError('');
    setStep('captcha');
  };

  const startPhoneOtp = async (phoneE164: string, purpose: OtpPurpose) => {
    setOtpPhone(phoneE164);
    setOtpPurpose(purpose);
    setOtpCode('');
    const confirmation = await sendPhoneOtp(phoneE164);
    confirmationRef.current = confirmation;
    setStep('otp');
  };

  const handleSendSmsAfterCaptcha = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      setIsSubmitting(true);
      await startPhoneOtp(otpPhone, otpPurpose);
    } catch (err) {
      console.error('Erro ao enviar SMS:', err);
      setError(mapPhoneAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  /** Passo 1: identificar email ou telefone → restaurante (senha) ou cliente (SMS) */
  const handleIdentify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      setIsSubmitting(true);

      if (loginMode === 'email') {
        setLoginEmailTouched(true);
        const normalizedEmail = email.trim().toLowerCase();
        if (!isEmail(normalizedEmail)) {
          setError('Informe um email válido.');
          return;
        }
        const restaurants = await getRestaurants();
        const restaurant = restaurants.find(
          (r) => r.email?.toLowerCase() === normalizedEmail
        );
        if (restaurant) {
          setRestaurantId(restaurant.id);
          setRestaurantEmail(normalizedEmail);
          setPassword('');
          setStep('restaurant_password');
          return;
        }
        const deliveryUser = await withTimeout(
          getDeliveryUserByEmail(normalizedEmail),
          LOOKUP_TIMEOUT_MS,
          'getDeliveryUserByEmail'
        );
        if (deliveryUser) {
          if (!deliveryUser.phone) {
            setError('Esta conta não tem telefone cadastrado. Entre com o telefone ou atualize o cadastro.');
            return;
          }
          queuePhoneOtp(normalizePhone(deliveryUser.phone), 'login');
          return;
        }
      } else {
        setLoginPhoneTouched(true);
        const phoneE164 = normalizePhone(phone);
        const digits = phoneE164.replace(/\D/g, '');
        if (digits.length < 10) {
          setError('Informe DDD e número com o país selecionado.');
          return;
        }
        const deliveryUser = await withTimeout(
          getDeliveryUserByPhone(phoneE164),
          LOOKUP_TIMEOUT_MS,
          'getDeliveryUserByPhone'
        );
        if (deliveryUser) {
          queuePhoneOtp(phoneE164, 'login');
          return;
        }
      }

      setError('Usuário não encontrado. Crie uma conta para continuar.');
    } catch (err) {
      console.error('Erro ao identificar usuário:', err);
      setError(mapPhoneAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!confirmationRef.current) {
      setError('Sessão de verificação expirada. Solicite um novo código.');
      return;
    }

    try {
      setIsSubmitting(true);
      const credential = await confirmPhoneOtp(confirmationRef.current, otpCode);
      const authUid = credential.user.uid;
      const phoneE164 = credential.user.phoneNumber || otpPhone;

      if (otpPurpose === 'register' && pendingRegisterRef.current) {
        const userData = await saveDeliveryUser({
          ...pendingRegisterRef.current,
          authUid,
          phone: phoneE164,
        });
        if (userData.authUid !== authUid) {
          await linkDeliveryUserAuthUid(userData.id, authUid);
        }
        await deliveryLogin(userData.id);
        updateUser({ ...userData, authUid });
        pendingRegisterRef.current = null;
        confirmationRef.current = null;
        navigate(redirectTo, { replace: true });
        return;
      }

      await loginAfterPhoneAuth(authUid, phoneE164);
      confirmationRef.current = null;
      navigate(redirectTo, { replace: true });
    } catch (err) {
      console.error('Erro ao confirmar OTP:', err);
      setError(mapPhoneAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setOtpCode('');
    confirmationRef.current = null;
    setStep('captcha');
  };

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

  /** Cadastro: valida dados → envia SMS → só cria perfil após OTP */
  const handleDeliveryRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name?.trim() || !email?.trim() || !phone?.trim() || !address?.trim()) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }

    const phoneE164 = normalizePhone(phone);
    try {
      setIsSubmitting(true);
      const existingByPhone = await getDeliveryUserByPhone(phoneE164);
      const existingByEmail = await getDeliveryUserByEmail(email.trim().toLowerCase());
      if (existingByPhone || existingByEmail) {
        setError('Já existe uma conta com este email ou telefone. Use Entrar.');
        return;
      }

      pendingRegisterRef.current = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phoneE164,
        address: address.trim(),
        defaultPaymentMethod,
      };
      queuePhoneOtp(phoneE164, 'register');
    } catch (err) {
      console.error('Erro ao iniciar verificação do cadastro:', err);
      setError(mapPhoneAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const goBackToEmail = () => {
    confirmationRef.current = null;
    pendingRegisterRef.current = null;
    setStep('email');
    setError('');
    setPassword('');
    setOtpCode('');
    setRestaurantId(null);
    setRestaurantEmail('');
  };

  const goBackFromOtp = () => {
    confirmationRef.current = null;
    setOtpCode('');
    setError('');
    setStep('captcha');
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col lg:flex-row" style={{ backgroundColor: '#FFF8F2' }}>
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
                ? 'Preencha seus dados. Enviaremos um SMS para confirmar seu telefone.'
                : step === 'captcha'
                  ? 'Confirme que não é um robô para enviarmos o SMS.'
                  : step === 'otp'
                  ? 'Digite o código enviado por SMS para entrar com segurança.'
                  : 'Entre com email ou telefone. Clientes confirmam o acesso com código SMS.'}
          </p>
        </div>
        <p className="text-white/70 text-xs">
          Pedidos entregues com cuidado. Sua comida favorita a um clique.
        </p>
      </div>

      <div className="flex-1 min-h-0 flex flex-col px-6 py-6 lg:px-12 lg:py-8 overflow-y-auto relative">
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10">
          <LanguageSelector variant="light" />
        </div>
        <div className="w-full max-w-md mx-auto my-auto py-4">
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
              {step === 'captcha' && 'Verificação de segurança'}
              {step === 'otp' && 'Verificação por SMS'}
              {step === 'restaurant_password' && 'Acesso do restaurante'}
              {step === 'delivery_register' && 'Criar conta'}
            </h1>
            <p className="mt-1 text-sm" style={{ color: '#6B5A54' }}>
              {step === 'email' &&
                (isFromOrders
                  ? 'Escolha telefone (com país) ou email. Enviaremos um código SMS.'
                  : 'Clientes entram com telefone (país + DDD) ou email. Restaurantes usam o email e a senha.')}
              {step === 'captcha' && 'Marque “Não sou um robô” e envie o código SMS.'}
              {step === 'otp' && 'Confirme o código recebido no seu celular.'}
              {step === 'restaurant_password' && 'Digite sua senha para acessar as configurações do restaurante.'}
              {step === 'delivery_register' && 'Após preencher, confirmamos o telefone com SMS.'}
            </p>
          </div>

          {error && (
            <div
              className="mb-3 p-3 rounded-lg text-xs border"
              style={{ backgroundColor: 'rgba(233,17,32,0.08)', borderColor: '#E91120', color: '#B40511' }}
            >
              {error}
            </div>
          )}

          {step === 'email' && (
            <form onSubmit={handleIdentify} className="space-y-3">
              <div className="flex rounded-lg border overflow-hidden text-sm font-semibold" style={{ borderColor: '#E9D7C4' }}>
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode('phone');
                    setError('');
                  }}
                  className="flex-1 px-3 py-2"
                  style={{
                    backgroundColor: loginMode === 'phone' ? '#E91120' : '#FAF0DB',
                    color: loginMode === 'phone' ? '#fff' : '#2A1E1A',
                  }}
                >
                  Telefone
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode('email');
                    setError('');
                  }}
                  className="flex-1 px-3 py-2"
                  style={{
                    backgroundColor: loginMode === 'email' ? '#E91120' : '#FAF0DB',
                    color: loginMode === 'email' ? '#fff' : '#2A1E1A',
                  }}
                >
                  Email
                </button>
              </div>

              {loginMode === 'phone' ? (
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#2A1E1A' }}>
                    Telefone
                  </label>
                  <PhoneWithCountryInput
                    value={phone}
                    onChange={(v) => {
                      setPhone(v);
                      setError('');
                    }}
                    required
                    variant="delivery"
                  />
                  {loginPhoneTouched && phone.replace(/\D/g, '').length < 10 && (
                    <p className="mt-1 text-xs" style={{ color: '#E91120' }}>
                      Informe DDD e número.
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#2A1E1A' }}>
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#6B5A54' }} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError('');
                      }}
                      onBlur={() => setLoginEmailTouched(true)}
                      className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E91120]/30 focus:border-[#E91120]"
                      style={{
                        borderColor: loginEmailTouched && email && !isEmail(email) ? '#E91120' : '#E9D7C4',
                        backgroundColor: '#FAF0DB',
                        color: '#2A1E1A',
                      }}
                      placeholder="seu@email.com"
                      autoComplete="username"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setStep('delivery_register');
                    setError('');
                    setName('');
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

          {step === 'captcha' && (
            <form onSubmit={handleSendSmsAfterCaptcha} className="space-y-3">
              <PhoneRecaptcha />
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setStep(otpPurpose === 'register' ? 'delivery_register' : 'email');
                  }}
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
                  {isSubmitting ? 'Enviando SMS...' : 'Enviar código'}
                </button>
              </div>
            </form>
          )}

          {step === 'otp' && (
            <PhoneOtpForm
              phone={otpPhone}
              code={otpCode}
              onCodeChange={setOtpCode}
              onSubmit={handleConfirmOtp}
              onResend={handleResendOtp}
              onBack={goBackFromOtp}
              isSubmitting={isSubmitting}
              submitLabel={otpPurpose === 'register' ? 'Confirmar e criar conta' : 'Confirmar e entrar'}
            />
          )}

          {step === 'restaurant_password' && (
            <form onSubmit={handleRestaurantLogin} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#2A1E1A' }}>
                  Email
                </label>
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
                <label className="block text-xs font-semibold mb-1" style={{ color: '#2A1E1A' }}>
                  Senha
                </label>
                <PasswordInput
                  leftIcon={<Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#6B5A54' }} />}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E91120]/30 focus:border-[#E91120]"
                  style={{ borderColor: '#E9D7C4', backgroundColor: '#FAF0DB', color: '#2A1E1A' }}
                  placeholder="Sua senha"
                  required
                  autoComplete="current-password"
                />
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

          {step === 'delivery_register' && (
            <form onSubmit={handleDeliveryRegister} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#2A1E1A' }}>
                  Nome completo *
                </label>
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
                <label className="block text-xs font-semibold mb-1" style={{ color: '#2A1E1A' }}>
                  Email *
                </label>
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
                <label className="block text-xs font-semibold mb-1" style={{ color: '#2A1E1A' }}>
                  Telefone *
                </label>
                <PhoneWithCountryInput
                  value={phone}
                  onChange={setPhone}
                  required
                  variant="delivery"
                />
                <p className="mt-1 text-[11px]" style={{ color: '#6B5A54' }}>
                  Escolha o país e digite DDD + número. Enviaremos um código SMS.
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#2A1E1A' }}>
                  Endereço de entrega *
                </label>
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
                <label className="block text-xs font-semibold mb-1" style={{ color: '#2A1E1A' }}>
                  Forma de pagamento padrão
                </label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#6B5A54' }} />
                  <select
                    value={defaultPaymentMethod}
                    onChange={(e) =>
                      setDefaultPaymentMethod(
                        e.target.value as 'money' | 'credit' | 'debit' | 'pix' | 'stripe'
                      )
                    }
                    className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[#E91120]/30 focus:border-[#E91120]"
                    style={{ borderColor: '#E9D7C4', backgroundColor: '#FAF0DB', color: '#2A1E1A' }}
                  >
                    <option value="money">Dinheiro</option>
                    <option value="credit">Cartão de Crédito</option>
                    <option value="debit">Cartão de Débito</option>
                    <option value="pix">PIX</option>
                    <option value="stripe">Cartão online (Stripe)</option>
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
                  {isSubmitting ? 'Enviando SMS...' : 'Continuar'}
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
