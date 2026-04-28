import { useState } from 'react';
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';

interface Props {
  onSuccess: (paymentIntentId: string) => void;
  payLabel: string;
  disabled?: boolean;
}

/**
 * Deve ficar dentro de <Elements options={{ clientSecret }}>.
 */
export default function DeliveryStripePayment({ onSuccess, payLabel, disabled }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handlePay = async () => {
    if (!stripe || !elements || disabled) return;
    setBusy(true);
    setMessage(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    setBusy(false);

    if (error) {
      setMessage(error.message ?? 'Não foi possível concluir o pagamento.');
      return;
    }

    if (paymentIntent?.status === 'succeeded' && paymentIntent.id) {
      onSuccess(paymentIntent.id);
      return;
    }

    setMessage('Pagamento pendente ou não confirmado. Tente novamente.');
  };

  return (
    <div className="space-y-4 pt-2 border-t border-stone-200 mt-4">
      <p className="text-sm text-stone-600">Dados do cartão (processados com segurança pela Stripe).</p>
      <PaymentElement />
      {message ? <p className="text-sm text-red-600">{message}</p> : null}
      <button
        type="button"
        onClick={handlePay}
        disabled={!stripe || busy || disabled}
        className={`w-full py-3 rounded-lg font-bold text-white transition ${
          !stripe || busy || disabled
            ? 'bg-stone-300 cursor-not-allowed'
            : 'bg-amber-600 hover:bg-amber-700 active:scale-[0.99]'
        }`}
      >
        {busy ? 'Processando…' : payLabel}
      </button>
    </div>
  );
}
