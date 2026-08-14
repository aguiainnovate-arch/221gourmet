import { useEffect, useState } from 'react';
import {
  RECAPTCHA_CONTAINER_ID,
  preparePhoneRecaptcha,
} from '../services/phoneAuthService';

/**
 * Widget reCAPTCHA v2. O id do container precisa existir antes do RecaptchaVerifier.
 */
export default function PhoneRecaptcha() {
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      preparePhoneRecaptcha();
    } catch (err) {
      console.error('Erro ao carregar reCAPTCHA:', err);
      setError('Não foi possível carregar a verificação. Recarregue a página.');
    }
  }, []);

  return (
    <div className="pt-1">
      <p className="text-[10px] leading-tight mb-1.5" style={{ color: '#6B5A54' }}>
        Marque “Não sou um robô” e depois envie o código.
      </p>
      <div id={RECAPTCHA_CONTAINER_ID} className="min-h-[78px]" />
      {error && (
        <p className="text-[10px] mt-1.5 leading-snug" style={{ color: '#E91120' }}>
          {error}
        </p>
      )}
    </div>
  );
}
