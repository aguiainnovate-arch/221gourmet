import { useState } from 'react';
import { X, User, Mail, Phone, MapPin, CreditCard } from 'lucide-react';
import { useDeliveryAuth } from '../contexts/DeliveryAuthContext';
import { saveDeliveryUser, getDeliveryUserByEmail, getDeliveryUserByPhone } from '../services/deliveryUserService';

interface DeliveryAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DeliveryAuthModal({ isOpen, onClose }: DeliveryAuthModalProps) {
  const { login, user, updateUser } = useDeliveryAuth();
  const [isLogin, setIsLogin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Campos do formulário
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<'money' | 'credit' | 'debit' | 'pix'>(
    user?.defaultPaymentMethod || 'money'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isLogin) {
      // Modo login: buscar por email ou telefone
      if (!email && !phone) {
        setError('Informe seu email ou telefone');
        return;
      }

      try {
        setIsSubmitting(true);
        let foundUser = null;

        if (email) {
          foundUser = await getDeliveryUserByEmail(email);
        } else if (phone) {
          foundUser = await getDeliveryUserByPhone(phone);
        }

        if (foundUser) {
          await login(foundUser.id);
          onClose();
        } else {
          setError('Usuário não encontrado. Crie uma conta primeiro.');
        }
      } catch (error) {
        console.error('Erro ao fazer login:', error);
        setError('Erro ao fazer login. Tente novamente.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Modo cadastro
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
        onClose();
      } catch (error) {
        console.error('Erro ao criar conta:', error);
        setError('Erro ao criar conta. Tente novamente.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleClose = () => {
    setError('');
    setIsLogin(false);
    setName(user?.name || '');
    setEmail(user?.email || '');
    setPhone(user?.phone || '');
    setAddress(user?.address || '');
    setDefaultPaymentMethod(user?.defaultPaymentMethod || 'money');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {isLogin ? 'Entrar na sua conta' : 'Criar conta'}
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-2" />
                  Nome completo *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Seu nome completo"
                  required={!isLogin}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="w-4 h-4 inline mr-2" />
                Email {isLogin ? '(ou telefone)' : '*'}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="seu@email.com"
                required={!isLogin}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Phone className="w-4 h-4 inline mr-2" />
                Telefone {isLogin ? '(ou email)' : '*'}
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="(00) 00000-0000"
                required={!isLogin}
              />
            </div>

            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="w-4 h-4 inline mr-2" />
                    Endereço de entrega *
                  </label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    rows={3}
                    placeholder="Rua, número, complemento, bairro, cidade"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <CreditCard className="w-4 h-4 inline mr-2" />
                    Forma de pagamento padrão
                  </label>
                  <select
                    value={defaultPaymentMethod}
                    onChange={(e) => setDefaultPaymentMethod(e.target.value as any)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value="money">Dinheiro</option>
                    <option value="credit">Cartão de Crédito</option>
                    <option value="debit">Cartão de Débito</option>
                    <option value="pix">PIX</option>
                  </select>
                </div>
              </>
            )}

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
              >
                {isLogin ? 'Criar conta' : 'Já tenho conta'}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`flex-1 px-4 py-2 rounded-lg font-bold ${
                  isSubmitting
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-amber-600 text-white hover:bg-amber-700'
                }`}
              >
                {isSubmitting ? 'Processando...' : isLogin ? 'Entrar' : 'Criar conta'}
              </button>
            </div>
          </form>

          <div className="mt-4 text-sm text-gray-500 text-center">
            <p>
              {isLogin
                ? 'Não tem conta? Crie uma para salvar suas informações e agilizar seus pedidos!'
                : 'Ao criar uma conta, suas informações serão salvas para facilitar pedidos futuros.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

