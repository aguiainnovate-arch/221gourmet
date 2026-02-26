import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, MapPin, CreditCard, Utensils, ArrowLeft, Lock } from 'lucide-react';
import { useDeliveryAuth } from '../contexts/DeliveryAuthContext';
import { useRestaurantAuth } from '../contexts/RestaurantAuthContext';
import { getRestaurants } from '../services/restaurantService';
import { saveDeliveryUser, getDeliveryUserByEmail } from '../services/deliveryUserService';

type Step = 'email' | 'restaurant_password' | 'delivery_register';

export default function DeliveryAuth() {
  const navigate = useNavigate();
  const { login: deliveryLogin, updateUser } = useDeliveryAuth();
  const { login: restaurantLogin } = useRestaurantAuth();

  const [step, setStep] = useState<Step>('email');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Passo 1: email
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

  const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  /** Passo 1: usuário informou email e clicou em Entrar */
  const handleIdentify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const emailTrim = email.trim();
    if (!emailTrim) {
      setError('Informe seu email.');
      return;
    }
    if (!isEmail(emailTrim)) {
      setError('Informe um email válido.');
      return;
    }

    try {
      setIsSubmitting(true);
      const restaurants = await getRestaurants();
      const restaurant = restaurants.find((r) => r.email?.toLowerCase() === emailTrim.toLowerCase());

      if (restaurant) {
        setRestaurantId(restaurant.id);
        setRestaurantEmail(emailTrim);
        setPassword('');
        setStep('restaurant_password');
        return;
      }

      const deliveryUser = await getDeliveryUserByEmail(emailTrim);
      if (deliveryUser) {
        await deliveryLogin(deliveryUser.id);
        navigate('/delivery', { replace: true });
        return;
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
      navigate('/delivery', { replace: true });
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
    <div className="h-screen overflow-hidden bg-gray-50 flex flex-col lg:flex-row">
      {/* Coluna esquerda: branding */}
      <div className="hidden lg:flex lg:w-1/2 lg:h-full bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 p-8 flex-col justify-between shrink-0">
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
            <span className="text-2xl font-bold text-white">Noctis</span>
          </div>
          <p className="text-white/90 text-sm max-w-sm leading-relaxed">
            {step === 'restaurant_password'
              ? 'Este email é de um restaurante. Digite sua senha para acessar as configurações.'
              : step === 'delivery_register'
                ? 'Preencha seus dados para criar sua conta e pedir com mais facilidade.'
                : 'Entre com seu email. Se for restaurante, você poderá acessar as configurações.'}
          </p>
        </div>
        <p className="text-white/70 text-xs">
          Pedidos entregues com cuidado. Sua comida favorita a um clique.
        </p>
      </div>

      <div className="flex-1 min-h-0 flex flex-col justify-center px-6 py-6 lg:px-12 lg:py-8 overflow-hidden">
        <div className="w-full max-w-md mx-auto shrink-0">
          <Link
            to="/delivery"
            className="lg:hidden inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 font-medium mb-4 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>

          <div className="mb-4">
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900">
              {step === 'email' && 'Entrar na sua conta'}
              {step === 'restaurant_password' && 'Acesso do restaurante'}
              {step === 'delivery_register' && 'Criar conta'}
            </h1>
            <p className="mt-1 text-gray-600 text-sm">
              {step === 'email' && 'Informe seu email. Se for restaurante, você digitará a senha em seguida.'}
              {step === 'restaurant_password' && 'Digite sua senha para acessar as configurações do restaurante.'}
              {step === 'delivery_register' && 'Preencha seus dados para começar a pedir.'}
            </p>
          </div>

          {error && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
              {error}
            </div>
          )}

          {/* Passo 1: apenas email */}
          {step === 'email' && (
            <form onSubmit={handleIdentify} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                    placeholder="seu@email.com"
                    required
                    autoComplete="username"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setStep('delivery_register'); setError(''); setEmail(email || ''); setName(''); setPhone(''); setAddress(''); }}
                  className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 font-semibold text-sm transition-colors"
                >
                  Criar conta
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 rounded-lg font-bold text-sm bg-amber-500 text-white hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-md"
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
                <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={restaurantEmail}
                    readOnly
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
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
                  className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 font-semibold text-sm transition-colors"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 rounded-lg font-bold text-sm bg-amber-500 text-white hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-md"
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
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nome completo *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                    placeholder="Seu nome completo"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                    placeholder="seu@email.com"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Telefone *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                    placeholder="(00) 00000-0000"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Endereço de entrega *</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm resize-none"
                    rows={2}
                    placeholder="Rua, número, complemento, bairro, cidade"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Forma de pagamento padrão</label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    value={defaultPaymentMethod}
                    onChange={(e) => setDefaultPaymentMethod(e.target.value as 'money' | 'credit' | 'debit' | 'pix')}
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white text-sm appearance-none"
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
                  className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 font-semibold text-sm transition-colors"
                >
                  Já tenho conta
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 rounded-lg font-bold text-sm bg-amber-500 text-white hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-md"
                >
                  {isSubmitting ? 'Criando...' : 'Criar conta'}
                </button>
              </div>
            </form>
          )}

          {step === 'email' && (
            <p className="mt-4 text-xs text-gray-500 text-center">
              Não tem conta? Crie uma para salvar endereço e forma de pagamento.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
