import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, Utensils, ArrowLeft } from 'lucide-react';
import { useRestaurantAuth } from '../contexts/RestaurantAuthContext';
import { getRestaurants } from '../services/restaurantService';

export default function RestaurantAuth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useRestaurantAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // URL de retorno opcional (para redirecionar após login)
  const returnUrl = searchParams.get('returnUrl');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Preencha todos os campos');
      return;
    }

    try {
      setIsSubmitting(true);
      const success = await login(email, password);

      if (success) {
        // Buscar o ID do restaurante pelo email
        const restaurants = await getRestaurants();
        const restaurant = restaurants.find(r => r.email.toLowerCase() === email.toLowerCase());
        
        // Redirecionar para a URL de retorno ou para as configurações do restaurante
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
      {/* Coluna esquerda: branding (apenas em telas grandes) */}
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
            Acesso exclusivo para restaurantes. Entre com suas credenciais para gerenciar seu estabelecimento.
          </p>
        </div>
        <p className="text-white/70 text-xs">
          Gerencie cardápio, pedidos e configurações do seu restaurante.
        </p>
      </div>

      {/* Coluna direita: formulário */}
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

          <div className="mb-6">
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900">
              Acesso para Restaurantes
            </h1>
            <p className="mt-1 text-gray-600 text-sm">
              Entre com seu email e senha para gerenciar seu restaurante.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Senha *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                  placeholder="Digite sua senha"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-4 py-2.5 rounded-lg font-bold text-sm bg-amber-500 text-white hover:bg-amber-600 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors shadow-md shadow-amber-500/20"
            >
              {isSubmitting ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-800 font-medium mb-2">
              🔐 Credenciais de demonstração:
            </p>
            <div className="text-xs text-amber-700 space-y-1">
              <div><strong>Email:</strong> restaurante@demo.com</div>
              <div><strong>Senha:</strong> Demo@123</div>
            </div>
          </div>

          <p className="mt-4 text-xs text-gray-500 text-center">
            Após fazer login, você será redirecionado para o painel de gerenciamento do seu restaurante.
          </p>
        </div>
      </div>
    </div>
  );
}
