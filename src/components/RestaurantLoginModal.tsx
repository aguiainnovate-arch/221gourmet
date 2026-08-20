import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Mail, Lock, IdCard } from 'lucide-react';
import { useRestaurantAuth } from '../contexts/RestaurantAuthContext';
import PasswordInput from './PasswordInput';
import { getRestaurants } from '../services/restaurantService';
import { hasRestaurantPlatformAccess } from '../utils/partnershipAccess';
import { formatCpf } from '../utils/cpf';

interface RestaurantLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type AuthMode = 'restaurant' | 'waiter';

export default function RestaurantLoginModal({ isOpen, onClose, onSuccess }: RestaurantLoginModalProps) {
  const navigate = useNavigate();
  const { login, loginWaiter } = useRestaurantAuth();
  const [mode, setMode] = useState<AuthMode>('restaurant');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setError('');
    setEmail('');
    setCpf('');
    setPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      setIsSubmitting(true);

      if (mode === 'waiter') {
        if (!cpf || !password) {
          setError('Preencha todos os campos');
          return;
        }
        const result = await loginWaiter(cpf, password);
        if (!result) {
          setError('CPF ou senha incorretos');
          return;
        }
        resetForm();
        onClose();
        navigate(`/${result.restaurantId}/settings`, { replace: true });
        if (onSuccess) onSuccess();
        return;
      }

      if (!email || !password) {
        setError('Preencha todos os campos');
        return;
      }

      const success = await login(email, password);

      if (success) {
        const restaurants = await getRestaurants();
        const restaurant = restaurants.find(
          (r) => r.email.toLowerCase() === email.toLowerCase()
        );
        resetForm();
        onClose();
        if (restaurant && !hasRestaurantPlatformAccess(restaurant)) {
          navigate('/planos', { replace: true });
          return;
        }
        if (onSuccess) onSuccess();
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

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-black">Acesso às Configurações</h2>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="mb-4 grid grid-cols-2 rounded-lg border border-gray-200 p-1 bg-gray-100">
            <button
              type="button"
              onClick={() => {
                setMode('restaurant');
                setError('');
              }}
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                mode === 'restaurant' ? 'bg-white text-black shadow-sm' : 'text-gray-600'
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
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                mode === 'waiter' ? 'bg-white text-black shadow-sm' : 'text-gray-600'
              }`}
            >
              Garçom
            </button>
          </div>

          <p className="text-sm text-black mb-6">
            {mode === 'waiter'
              ? 'Entre com o CPF e a senha cadastrados pelo restaurante.'
              : 'Para acessar as configurações do restaurante, faça login com o email e senha cadastrados.'}
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            {mode === 'restaurant' ? (
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email do restaurante
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  placeholder="restaurante@email.com"
                  autoFocus
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  <IdCard className="w-4 h-4 inline mr-2" />
                  CPF
                </label>
                <input
                  value={cpf}
                  onChange={(e) => setCpf(formatCpf(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                  autoFocus
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-black mb-2">
                <Lock className="w-4 h-4 inline mr-2" />
                Senha
              </label>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                placeholder="Sua senha"
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-black hover:bg-gray-50 font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`flex-1 px-4 py-2 rounded-lg font-bold ${
                  isSubmitting
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isSubmitting ? 'Entrando...' : 'Entrar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
