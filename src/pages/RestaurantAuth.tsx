import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, Utensils, ArrowLeft, IdCard } from 'lucide-react';
import { useRestaurantAuth } from '../contexts/RestaurantAuthContext';
import { getRestaurants } from '../services/restaurantService';
import PasswordInput from '../components/PasswordInput';
import { hasRestaurantPlatformAccess } from '../utils/partnershipAccess';
import { formatCpf, looksLikeCpf } from '../utils/cpf';
import { isIosNative } from '../utils/capacitorUtils';

type AuthMode = 'restaurant' | 'waiter';

export default function RestaurantAuth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, loginWaiter } = useRestaurantAuth();
  const [mode, setMode] = useState<AuthMode>('restaurant');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    document.title = 'Bora Comer!';
  }, []);

  const returnUrl = searchParams.get('returnUrl');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'waiter' || looksLikeCpf(email)) {
      const identifier = mode === 'waiter' ? cpf : email;
      if (!identifier || !password) {
        setError('Preencha todos os campos');
        return;
      }
    } else if (!email || !password) {
      setError('Preencha todos os campos');
      return;
    }

    try {
      setIsSubmitting(true);

      if (mode === 'waiter' || looksLikeCpf(email)) {
        const result = await loginWaiter(mode === 'waiter' ? cpf : email, password);
        if (!result) {
          setError('CPF ou senha incorretos');
          return;
        }
        if (returnUrl) {
          navigate(returnUrl, { replace: true });
        } else {
          navigate(`/${result.restaurantId}/settings`, { replace: true });
        }
        return;
      }

      const success = await login(email, password);

      if (success) {
        const restaurants = await getRestaurants();
        const restaurant = restaurants.find((r) => r.email.toLowerCase() === email.toLowerCase());

        if (restaurant && !hasRestaurantPlatformAccess(restaurant)) {
          navigate('/planos', { replace: true });
          return;
        }

        if (returnUrl) {
          navigate(returnUrl, { replace: true });
        } else if (restaurant?.id) {
          navigate(`/${restaurant.id}/settings`, { replace: true });
        } else {
          navigate('/delivery', { replace: true });
        }
      } else {
        setError('Email ou senha incorretos');
      }
    } catch (err) {
      console.error('Erro ao fazer login:', err);
      setError('Erro ao fazer login. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-gray-50 flex flex-col lg:flex-row">
      <div className="hidden lg:flex lg:w-1/2 lg:h-full bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 p-8 flex-col justify-between shrink-0">
        <Link
          to="/delivery"
          className="inline-flex items-center gap-2 text-white/90 hover:text-white font-medium transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao início
        </Link>
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Utensils className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">Noctis</span>
          </div>
          <p className="text-white/90 text-sm max-w-sm leading-relaxed">
            Acesso para restaurantes e garçons. Entre com suas credenciais para gerenciar o salão.
          </p>
        </div>
        <p className="text-white/70 text-xs">
          Restaurante: email e senha. Garçom: CPF (também no campo de email) e senha.
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

          <div className="mb-6">
            <h1 className="text-xl lg:text-2xl font-bold text-black">
              {mode === 'waiter' ? 'Acesso do garçom' : 'Acesso para Restaurantes'}
            </h1>
            <p className="mt-1 text-black text-sm">
              {mode === 'waiter'
                ? 'Entre com seu CPF e senha cadastrados pelo restaurante.'
                : 'Entre com email e senha. Garçom também pode digitar o CPF neste campo de email.'}
            </p>
          </div>

          <div className="mb-5 grid grid-cols-2 rounded-lg border border-gray-200 p-1 bg-gray-100">
            <button
              type="button"
              onClick={() => {
                setMode('restaurant');
                setError('');
              }}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                mode === 'restaurant' ? 'bg-white text-black shadow-sm' : 'text-gray-600 hover:text-black'
              }`}
            >
              Restaurante
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('waiter');
                setError('');
              }}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                mode === 'waiter' ? 'bg-white text-black shadow-sm' : 'text-gray-600 hover:text-black'
              }`}
            >
              Garçom
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
              {error}
            </div>
          )}

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            {mode === 'restaurant' ? (
              <div>
                <label className="block text-xs font-semibold text-black mb-1">
                  Email ou CPF *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm text-black"
                    placeholder="seu@email.com ou CPF do garçom"
                    required={mode === 'restaurant'}
                    autoComplete="username"
                    inputMode={looksLikeCpf(email) ? 'numeric' : 'email'}
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-black mb-1">
                  CPF *
                </label>
                <div className="relative">
                  <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    value={cpf}
                    onChange={(e) => setCpf(formatCpf(e.target.value))}
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm text-black"
                    placeholder="000.000.000-00"
                    required={mode === 'waiter'}
                    inputMode="numeric"
                    autoComplete="username"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-black mb-1">
                Senha *
              </label>
              <PasswordInput
                leftIcon={<Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm text-black"
                placeholder="Digite sua senha"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-4 py-2.5 rounded-lg font-bold text-sm bg-amber-500 text-white hover:bg-amber-600 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors shadow-md shadow-amber-500/20"
            >
              {isSubmitting ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          {mode === 'restaurant' && !isIosNative() && (
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-800 font-medium mb-2">
                🔐 Credenciais de demonstração:
              </p>
              <div className="text-xs text-amber-700 space-y-1">
                <div><strong>Email:</strong> restaurante@demo.com</div>
                <div><strong>Senha:</strong> Demo@123</div>
              </div>
            </div>
          )}

          <p className="mt-4 text-xs text-black text-center">
            {mode === 'waiter'
              ? 'Peça ao restaurante para cadastrar seu CPF e senha no painel.'
              : 'Após fazer login, você será redirecionado para o painel de gerenciamento do seu restaurante.'}
          </p>
        </div>
      </div>
    </div>
  );
}
