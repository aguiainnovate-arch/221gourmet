import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, MapPin, CreditCard, Utensils, ArrowLeft } from 'lucide-react';
import { useDeliveryAuth } from '../contexts/DeliveryAuthContext';
import { saveDeliveryUser, getDeliveryUserByEmail, getDeliveryUserByPhone } from '../services/deliveryUserService';

export default function DeliveryAuth() {
  const navigate = useNavigate();
  const { login, user, updateUser } = useDeliveryAuth();
  const [isLogin, setIsLogin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  /** No login: um único valor (email ou telefone). No cadastro: email e phone separados. */
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [address, setAddress] = useState(user?.address || '');
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<'money' | 'credit' | 'debit' | 'pix'>(
    user?.defaultPaymentMethod || 'money'
  );

  /** Detecta se o texto parece email ou telefone (apenas dígitos/parênteses/traço). */
  const isLikelyEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isLogin) {
      const value = emailOrPhone.trim();
      if (!value) {
        setError('Informe seu email ou telefone');
        return;
      }

      try {
        setIsSubmitting(true);
        let foundUser = null;

        if (isLikelyEmail(value)) {
          foundUser = await getDeliveryUserByEmail(value);
        } else {
          foundUser = await getDeliveryUserByPhone(value);
        }

        if (foundUser) {
          await login(foundUser.id);
          navigate('/delivery', { replace: true });
        } else {
          setError('Usuário não encontrado. Crie uma conta primeiro.');
        }
      } catch (err) {
        console.error('Erro ao fazer login:', err);
        setError('Erro ao fazer login. Tente novamente.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      if (!name || !email || !phone || !address) {
        setError('Preencha todos os campos obrigatórios');
        return;
      }

      try {
        setIsSubmitting(true);
        const userData = await saveDeliveryUser({
          name,
          email,
          phone,
          address,
          defaultPaymentMethod
        });

        await login(userData.id);
        updateUser(userData);
        navigate('/delivery', { replace: true });
      } catch (err) {
        console.error('Erro ao criar conta:', err);
        setError('Erro ao criar conta. Tente novamente.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-gray-50 flex flex-col lg:flex-row">
      {/* Coluna esquerda: branding (apenas em telas grandes) */}
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
            <span className="text-2xl font-bold text-white">221 Delivery</span>
          </div>
          <p className="text-white/90 text-sm max-w-sm leading-relaxed">
            {isLogin
              ? 'Entre na sua conta para acessar seus endereços e agilizar seus pedidos.'
              : 'Crie sua conta e salve endereço e forma de pagamento para pedir mais rápido.'}
          </p>
        </div>
        <p className="text-white/70 text-xs">
          Pedidos entregues com cuidado. Sua comida favorita a um clique.
        </p>
      </div>

      {/* Coluna direita: formulário — uma tela só, sem scroll */}
      <div className="flex-1 min-h-0 flex flex-col justify-center px-6 py-6 lg:px-12 lg:py-8 overflow-hidden">
        <div className="w-full max-w-md mx-auto shrink-0">
          {/* Mobile: link voltar */}
          <Link
            to="/delivery"
            className="lg:hidden inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 font-medium mb-4 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>

          <div className="mb-4">
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900">
              {isLogin ? 'Entrar na sua conta' : 'Criar conta'}
            </h1>
            <p className="mt-1 text-gray-600 text-sm">
              {isLogin
                ? 'Use seu email ou telefone para acessar.'
                : 'Preencha seus dados para começar a pedir.'}
            </p>
          </div>

          {error && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nome completo *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                    placeholder="Seu nome completo"
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            {isLogin ? (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Email ou telefone
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={emailOrPhone}
                    onChange={(e) => setEmailOrPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                    placeholder="seu@email.com ou (00) 00000-0000"
                    required
                    autoComplete="username"
                  />
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Email *
                  </label>
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
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Telefone *
                  </label>
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
              </>
            )}

            {!isLogin && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Endereço de entrega *
                  </label>
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
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Forma de pagamento padrão
                  </label>
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
              </>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setIsLogin(!isLogin); setError(''); }}
                className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 hover:border-gray-300 font-semibold text-sm transition-colors"
              >
                {isLogin ? 'Criar conta' : 'Já tenho conta'}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2.5 rounded-lg font-bold text-sm bg-amber-500 text-white hover:bg-amber-600 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors shadow-md shadow-amber-500/20"
              >
                {isSubmitting ? 'Processando...' : isLogin ? 'Entrar' : 'Criar conta'}
              </button>
            </div>
          </form>

          <p className="mt-4 text-xs text-gray-500 text-center">
            {isLogin
              ? 'Não tem conta? Crie uma para salvar suas informações e agilizar seus pedidos.'
              : 'Ao criar uma conta, suas informações serão salvas para facilitar pedidos futuros.'}
          </p>
        </div>
      </div>
    </div>
  );
}
