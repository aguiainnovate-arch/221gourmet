import { useState, useRef, useEffect } from 'react';
import { X, User, Mail, Phone, MapPin, CreditCard } from 'lucide-react';
import type { ConfirmationResult } from 'firebase/auth';
import { useDeliveryAuth } from '../contexts/DeliveryAuthContext';
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
  clearPhoneRecaptcha,
} from '../services/phoneAuthService';
import {
  validateEmailOrPhone,
  applyPhoneMaskInput,
  getInputKind,
  formatPhoneDisplay,
  normalizePhone,
} from '../utils/authInputUtils';
import type { CreateDeliveryUserData } from '../types/deliveryUser';
import PhoneOtpForm from './PhoneOtpForm';
import PhoneWithCountryInput from './PhoneWithCountryInput';

interface DeliveryAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ModalStep = 'form' | 'otp';
type OtpPurpose = 'login' | 'register';

export default function DeliveryAuthModal({ isOpen, onClose }: DeliveryAuthModalProps) {
  const { login, loginAfterPhoneAuth, user, updateUser } = useDeliveryAuth();
  const [isLogin, setIsLogin] = useState(false);
  const [step, setStep] = useState<ModalStep>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [emailOrPhoneTouched, setEmailOrPhoneTouched] = useState(false);
  const [address, setAddress] = useState(user?.address || '');
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<
    'money' | 'credit' | 'debit' | 'pix' | 'stripe'
  >(user?.defaultPaymentMethod || 'money');

  const [otpPhone, setOtpPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpPurpose, setOtpPurpose] = useState<OtpPurpose>('login');
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const pendingRegisterRef = useRef<CreateDeliveryUserData | null>(null);

  const emailOrPhoneValidation = validateEmailOrPhone(emailOrPhone);
  const showEmailOrPhoneFieldError =
    isLogin && emailOrPhoneTouched && !emailOrPhoneValidation.valid && emailOrPhone.trim() !== '';

  useEffect(() => {
    if (!isOpen) {
      clearPhoneRecaptcha();
      confirmationRef.current = null;
      pendingRegisterRef.current = null;
    }
  }, [isOpen]);

  const handleEmailOrPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (getInputKind(raw) === 'phone') {
      setEmailOrPhone(applyPhoneMaskInput(raw));
    } else {
      setEmailOrPhone(raw);
    }
    setError('');
  };

  const startPhoneOtp = async (phoneE164: string, purpose: OtpPurpose) => {
    setOtpPhone(phoneE164);
    setOtpPurpose(purpose);
    setOtpCode('');
    const confirmation = await sendPhoneOtp(phoneE164);
    confirmationRef.current = confirmation;
    setStep('otp');
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

        if (!foundUser) {
          setError('Usuário não encontrado. Crie uma conta primeiro.');
          return;
        }
        if (!foundUser.phone) {
          setError('Esta conta não tem telefone cadastrado.');
          return;
        }
        await startPhoneOtp(
          result.kind === 'phone' ? result.normalized : normalizePhone(foundUser.phone),
          'login'
        );
      } catch (err) {
        console.error('Erro ao iniciar login SMS:', err);
        setError(mapPhoneAuthError(err));
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
        const phoneE164 = normalizePhone(phone);
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
        await startPhoneOtp(phoneE164, 'register');
      } catch (err) {
        console.error('Erro ao criar conta:', err);
        setError(mapPhoneAuthError(err));
      } finally {
        setIsSubmitting(false);
      }
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
        await login(userData.id);
        updateUser({ ...userData, authUid });
        pendingRegisterRef.current = null;
        confirmationRef.current = null;
        handleClose();
        return;
      }

      await loginAfterPhoneAuth(authUid, phoneE164);
      confirmationRef.current = null;
      handleClose();
    } catch (err) {
      console.error('Erro ao confirmar OTP:', err);
      setError(mapPhoneAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    try {
      setIsSubmitting(true);
      setOtpCode('');
      await startPhoneOtp(otpPhone, otpPurpose);
    } catch (err) {
      setError(mapPhoneAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    clearPhoneRecaptcha();
    confirmationRef.current = null;
    pendingRegisterRef.current = null;
    setError('');
    setEmailOrPhone('');
    setIsLogin(false);
    setStep('form');
    setOtpCode('');
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
              {step === 'otp'
                ? 'Verificação por SMS'
                : isLogin
                  ? 'Entrar na sua conta'
                  : 'Criar conta'}
            </h2>
            <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
              <X className="w-6 h-6" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>
          )}

          {step === 'otp' ? (
            <PhoneOtpForm
              phone={otpPhone}
              code={otpCode}
              onCodeChange={setOtpCode}
              onSubmit={handleConfirmOtp}
              onResend={handleResendOtp}
              onBack={() => {
                clearPhoneRecaptcha();
                confirmationRef.current = null;
                setStep('form');
                setOtpCode('');
                setError('');
              }}
              isSubmitting={isSubmitting}
              submitLabel={otpPurpose === 'register' ? 'Confirmar e criar conta' : 'Confirmar e entrar'}
            />
          ) : (
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
                  <p className="mt-1 text-xs text-gray-600">Enviaremos um código SMS para confirmar.</p>
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
                    <PhoneWithCountryInput
                      value={phone}
                      onChange={setPhone}
                      required
                      variant="modal"
                    />
                    <p className="mt-1 text-xs text-gray-600">
                      Escolha o país e digite DDD + número. Enviaremos um código SMS.
                    </p>
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
                      <option value="stripe">Cartão online (Stripe)</option>
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
                  {isSubmitting ? 'Enviando SMS...' : isLogin ? 'Entrar' : 'Continuar'}
                </button>
              </div>
            </form>
          )}

          {step === 'form' && (
            <div className="mt-4 text-sm text-black text-center">
              <p>
                {isLogin
                  ? 'O acesso é confirmado com um código SMS enviado ao telefone da conta.'
                  : 'Ao criar uma conta, confirmamos seu telefone por SMS.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
