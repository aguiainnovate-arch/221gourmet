import { useState } from 'react';
import { X, User, Mail, Phone, MapPin, CreditCard } from 'lucide-react';
import { useDeliveryAuth } from '../contexts/DeliveryAuthContext';
import { saveDeliveryUser, getDeliveryUserByEmail, getDeliveryUserByPhone } from '../services/deliveryUserService';
import {
  validateEmailOrPhone,
  applyPhoneMaskInput,
  getInputKind,
  formatPhoneDisplay,
  normalizePhone
} from '../utils/authInputUtils';

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
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [emailOrPhoneTouched, setEmailOrPhoneTouched] = useState(false);
  const [address, setAddress] = useState(user?.address || '');
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<'money' | 'credit' | 'debit' | 'pix'>(
    user?.defaultPaymentMethod || 'money'
  );

  const emailOrPhoneValidation = validateEmailOrPhone(emailOrPhone);
  const showEmailOrPhoneFieldError =
    isLogin && emailOrPhoneTouched && !emailOrPhoneValidation.valid && emailOrPhone.trim() !== '';

  const handleEmailOrPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (getInputKind(raw) === 'phone') {
      setEmailOrPhone(applyPhoneMaskInput(raw));
    } else {
      setEmailOrPhone(raw);
    }
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isLogin) {
      setEmailOrPhoneTouched(true);
      const result = validateEmailOrPhone(emailOrPhone);
      if (!result.valid) {
        setError(result.error);
        return;
      }

      try {
        setIsSubmitting(true);
        const foundUser =
          result.kind === 'email'
            ? await getDeliveryUserByEmail(result.normalized)
            : await getDeliveryUserByPhone(result.normalized);

        if (foundUser) {
          await login(foundUser.id);
          onClose();
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
    setEmailOrPhone('');
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
            <h2 className="text-2xl font-bold text-black">
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
                <label className="block text-sm font-medium text-black mb-2">
                  <User className="w-4 h-4 inline mr-2" />
                  Nome completo *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-black"
                  placeholder="Seu nome completo"
                  required={!isLogin}
                />
              </div>
            )}

            {isLogin ? (
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  {getInputKind(emailOrPhone) === 'phone' ? (
                    <Phone className="w-4 h-4 inline mr-2" />
                  ) : (
                    <Mail className="w-4 h-4 inline mr-2" />
                  )}
                  Email ou telefone
                </label>
                <input
                  type="text"
                  inputMode={getInputKind(emailOrPhone) === 'phone' ? 'tel' : 'email'}
                  value={
                    getInputKind(emailOrPhone) === 'phone'
                      ? formatPhoneDisplay(normalizePhone(emailOrPhone))
                      : emailOrPhone
                  }
                  onChange={handleEmailOrPhoneChange}
                  onBlur={() => setEmailOrPhoneTouched(true)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-black ${
                    showEmailOrPhoneFieldError ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="seu@email.com ou +55 11 99999 9999"
                  autoComplete="username"
                />
                {showEmailOrPhoneFieldError && (
                  <p className="mt-1 text-xs text-red-600">{emailOrPhoneValidation.error}</p>
                )}
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    <Mail className="w-4 h-4 inline mr-2" />
                    Email *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-black"
                    placeholder="seu@email.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    <Phone className="w-4 h-4 inline mr-2" />
                    Telefone *
                  </label>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={phone ? formatPhoneDisplay(normalizePhone(phone)) : ''}
                    onChange={(e) => setPhone(applyPhoneMaskInput(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-black"
                    placeholder="+55 11 99999 9999"
                    required
                  />
                </div>
              </>
            )}

            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    <MapPin className="w-4 h-4 inline mr-2" />
                    Endereço de entrega *
                  </label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-black"
                    rows={3}
                    placeholder="Rua, número, complemento, bairro, cidade"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    <CreditCard className="w-4 h-4 inline mr-2" />
                    Forma de pagamento padrão
                  </label>
                  <select
                    value={defaultPaymentMethod}
                    onChange={(e) => setDefaultPaymentMethod(e.target.value as any)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-black"
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
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-black hover:bg-gray-50 font-medium"
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

          <div className="mt-4 text-sm text-black text-center">
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

