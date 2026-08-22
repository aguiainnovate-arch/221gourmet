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
    let cancelled = false;
    void preparePhoneRecaptcha().catch((err) => {
      console.error('Erro ao carregar reCAPTCHA:', err);
      if (!cancelled) {
        setError('Não foi possível carregar a verificação. Feche e abra esta tela de novo.');
      }
    });
    return () => {
      cancelled = true;
    };
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
