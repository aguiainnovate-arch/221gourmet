import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  X,
  Plus,
  Minus,
  MapPin,
  Phone,
  User as UserIcon,
  CreditCard,
  Bike,
  Zap,
  CheckCircle2,
  ChevronRight,
  Wallet,
  Banknote,
  QrCode,
  Trash2,
  Loader2,
  Plus as PlusIcon,
  Home,
  Hash,
  Building2,
} from 'lucide-react';
import type { Stripe as StripeType, StripeElementsOptions } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

import type { Product } from '../../types/product';
import type { DeliveryOrderItem, CreateDeliveryOrderData } from '../../types/delivery';
import type { DeliveryUser } from '../../types/deliveryUser';
import {
  createDeliveryPaymentIntent,
  createDeliverySetupIntent,
  ensureDeliveryStripeCustomer,
  listDeliverySavedCards,
  removeDeliverySavedCard,
  brandLabel,
  type SavedCard,
} from '../../services/deliveryStripeService';

export interface CartLine {
  product: Product;
  quantity: number;
  observations: string;
}

export type CodPayment = 'money' | 'credit' | 'debit' | 'pix';

export type PaymentSelection =
  | { kind: 'cod'; method: CodPayment }
  | { kind: 'saved'; card: SavedCard }
  | { kind: 'new-card' }
  /** PIX instantâneo via Stripe (QR) — requer Connect + BRL. */
  | { kind: 'stripe-pix' };

export type DeliveryOption = 'standard' | 'turbo';

interface Props {
  open: boolean;
  onClose: () => void;
  items: CartLine[];
  onChangeQuantity: (productId: string, nextQuantity: number) => void;
  onRemoveItem: (productId: string) => void;
  user: DeliveryUser | null;
  onUpdateUser: (u: DeliveryUser) => void;
  restaurantId: string;
  restaurantName: string;
  accentColor?: string;
  baseDeliveryFee: number;
  turboFeeExtra?: number;
  defaultName?: string;
  defaultPhone?: string;
  defaultAddress?: string;
  currency?: string;
  locale?: string;
  stripePromise: Promise<StripeType | null> | null;
  /** Enquanto o contexto de auth carrega o usuário do storage (evita falso "não logado"). */
  authLoading?: boolean;
  /** Requer Stripe Connect ativo no restaurante (subconta com cobranças habilitadas). */
  onlineCardPaymentsEnabled?: boolean;
  onOrderCreated: (data: {
    orderPayload: CreateDeliveryOrderData;
  }) => Promise<void>;
}

type Step = 'bag' | 'address' | 'payment' | 'new-card' | 'pix-wait';

type AddressDraft = {
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
};

const MAX_SAVED_ADDRESSES = 8;

const emptyAddressDraft = (): AddressDraft => ({
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
});

const parseAddress = (address: string): AddressDraft => {
  const parts = address
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return emptyAddressDraft();
  if (parts.length === 4) {
    return {
      street: parts[0],
      number: parts[1],
      complement: '',
      neighborhood: parts[2],
      city: parts[3],
    };
  }

  return {
    street: parts[0] ?? '',
    number: parts[1] ?? '',
    complement: parts[2] ?? '',
    neighborhood: parts[3] ?? '',
    city: parts[4] ?? '',
  };
};

const buildAddress = (draft: AddressDraft): string => {
  const pieces = [
    draft.street.trim(),
    draft.number.trim(),
    draft.complement.trim(),
    draft.neighborhood.trim(),
    draft.city.trim(),
  ].filter(Boolean);
  return pieces.join(', ');
};

const getAddressHistoryStorageKey = (user: DeliveryUser | null): string => {
  if (user?.id) return `delivery_address_history:${user.id}`;
  return 'delivery_address_history:guest';
};

const COD_OPTIONS: Array<{ method: CodPayment; icon: React.ReactNode; labelKey: string }> = [
  { method: 'pix', icon: <QrCode className="w-5 h-5" />, labelKey: 'delivery.pixOnDelivery' },
  { method: 'credit', icon: <CreditCard className="w-5 h-5" />, labelKey: 'delivery.credit' },
  { method: 'debit', icon: <CreditCard className="w-5 h-5" />, labelKey: 'delivery.debit' },
  { method: 'money', icon: <Banknote className="w-5 h-5" />, labelKey: 'delivery.money' },
];

export default function CheckoutFlow({
  open,
  onClose,
  items,
  onChangeQuantity,
  onRemoveItem,
  user,
  onUpdateUser,
  restaurantId,
  restaurantName,
  accentColor = '#E91120',
  baseDeliveryFee,
  turboFeeExtra = 3.99,
  defaultName = '',
  defaultPhone = '',
  defaultAddress = '',
  currency = 'BRL',
  locale = 'pt-BR',
  stripePromise,
  authLoading = false,
  onlineCardPaymentsEnabled = false,
  onOrderCreated,
}: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('bag');
  const [customerName, setCustomerName] = useState(defaultName);
  const [customerPhone, setCustomerPhone] = useState(defaultPhone);
  const [customerAddress, setCustomerAddress] = useState(defaultAddress);
  const [addressDraft, setAddressDraft] = useState<AddressDraft>(() =>
    parseAddress(defaultAddress)
  );
  const [savedAddresses, setSavedAddresses] = useState<string[]>([]);
  const [observations, setObservations] = useState('');
  const [deliveryOption, setDeliveryOption] = useState<DeliveryOption>('standard');
  const [payment, setPayment] = useState<PaymentSelection | null>(null);
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [customerId, setCustomerId] = useState<string | undefined>(user?.stripeCustomerId);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [setupClientSecret, setSetupClientSecret] = useState<string | null>(null);
  const [pixWait, setPixWait] = useState<{
    clientSecret: string;
    paymentIntentId: string;
    imageUrlPng?: string;
    copyPaste?: string;
    hostedInstructionsUrl?: string;
  } | null>(null);

  const pixOrderBaseRef = useRef<Omit<
    CreateDeliveryOrderData,
    'paymentMethod' | 'stripePaymentIntentId'
  > | null>(null);
  const pixSucceededRef = useRef(false);
  const onOrderCreatedRef = useRef(onOrderCreated);
  const onCloseRef = useRef(onClose);
  onOrderCreatedRef.current = onOrderCreated;
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!onlineCardPaymentsEnabled && (payment?.kind === 'saved' || payment?.kind === 'stripe-pix')) {
      setPayment(null);
    }
  }, [onlineCardPaymentsEnabled, payment?.kind]);

  useEffect(() => {
    if (!open) return;
    setCustomerName(defaultName);
    setCustomerPhone(defaultPhone);
    setCustomerAddress(defaultAddress);
    setAddressDraft(parseAddress(defaultAddress));
  }, [open, defaultName, defaultPhone, defaultAddress]);

  useEffect(() => {
    if (!open) return;
    const key = getAddressHistoryStorageKey(user);
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      const fromStorage = Array.isArray(parsed)
        ? parsed.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
        : [];
      const merged = [defaultAddress, ...fromStorage]
        .map((entry) => entry.trim())
        .filter(Boolean)
        .filter((entry, index, arr) => arr.indexOf(entry) === index)
        .slice(0, MAX_SAVED_ADDRESSES);
      setSavedAddresses(merged);
    } catch (error) {
      console.error('[CheckoutFlow] loadAddressHistory', error);
      setSavedAddresses(defaultAddress ? [defaultAddress] : []);
    }
  }, [open, user, defaultAddress]);

  useEffect(() => {
    setCustomerId(user?.stripeCustomerId);
  }, [user?.stripeCustomerId]);

  useEffect(() => {
    if (!open) {
      setStep('bag');
      setPixWait(null);
      pixOrderBaseRef.current = null;
      pixSucceededRef.current = false;
    }
  }, [open]);

  const fmt = useCallback(
    (v: number) =>
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
      }).format(v),
    [locale, currency]
  );

  const subtotal = useMemo(
    () => items.reduce((acc, it) => acc + it.product.price * it.quantity, 0),
    [items]
  );
  const itemCount = useMemo(
    () => items.reduce((acc, it) => acc + it.quantity, 0),
    [items]
  );
  const deliveryFee = useMemo(
    () => baseDeliveryFee + (deliveryOption === 'turbo' ? turboFeeExtra : 0),
    [baseDeliveryFee, deliveryOption, turboFeeExtra]
  );
  const total = subtotal + deliveryFee;

  const ensureCustomerFor = useCallback(async (): Promise<string | undefined> => {
    if (!user) return undefined;
    if (customerId) return customerId;
    try {
      const cid = await ensureDeliveryStripeCustomer({
        deliveryUserId: user.id,
        email: user.email,
        name: customerName || user.name,
        phone: customerPhone || user.phone,
      });
      setCustomerId(cid);
      onUpdateUser({ ...user, stripeCustomerId: cid });
      return cid;
    } catch (err) {
      console.error('[CheckoutFlow] ensureCustomer', err);
      return undefined;
    }
  }, [user, customerId, customerName, customerPhone, onUpdateUser]);

  const loadSavedCards = useCallback(
    async (cid: string) => {
      setLoadingCards(true);
      try {
        const cards = await listDeliverySavedCards(cid);
        setSavedCards(cards);
      } catch (err) {
        console.error('[CheckoutFlow] listSavedCards', err);
        setSavedCards([]);
      } finally {
        setLoadingCards(false);
      }
    },
    []
  );

  useEffect(() => {
    if (step !== 'payment') return;
    if (!user) return;
    (async () => {
      const cid = await ensureCustomerFor();
      if (cid) await loadSavedCards(cid);
    })();
  }, [step, user, ensureCustomerFor, loadSavedCards]);

  const goTo = (next: Step) => {
    setErrorBanner(null);
    setStep(next);
  };

  const handleStartNewCard = async () => {
    if (authLoading) return;
    if (!user) {
      setErrorBanner(t('delivery.loginRequiredForCard'));
      return;
    }
    setBusy(true);
    setErrorBanner(null);
    try {
      const cid = await ensureCustomerFor();
      if (!cid) throw new Error('customer');
      const secret = await createDeliverySetupIntent(cid);
      setSetupClientSecret(secret);
      goTo('new-card');
    } catch (err) {
      console.error('[CheckoutFlow] startNewCard', err);
      setErrorBanner(t('delivery.stripePrepareError'));
    } finally {
      setBusy(false);
    }
  };

  const handleCardSaved = async () => {
    setSetupClientSecret(null);
    if (customerId) await loadSavedCards(customerId);
    goTo('payment');
  };

  useEffect(() => {
    if (step !== 'pix-wait' || !pixWait?.clientSecret || !stripePromise) return;

    const run = async () => {
      if (pixSucceededRef.current) return;
      try {
        const stripe = await stripePromise;
        if (!stripe) return;
        const { paymentIntent } = await stripe.retrievePaymentIntent(pixWait.clientSecret);
        if (paymentIntent?.status === 'succeeded' && !pixSucceededRef.current) {
          pixSucceededRef.current = true;
          const base = pixOrderBaseRef.current;
          if (base) {
            await onOrderCreatedRef.current({
              orderPayload: {
                ...base,
                paymentMethod: 'stripe',
                stripePaymentIntentId: paymentIntent.id,
              },
            });
          }
          setPixWait(null);
          pixOrderBaseRef.current = null;
          setStep('bag');
          onCloseRef.current();
        }
      } catch (e) {
        console.error('[CheckoutFlow] pix poll', e);
      }
    };

    void run();
    const id = window.setInterval(() => void run(), 2500);
    return () => window.clearInterval(id);
  }, [step, pixWait?.clientSecret, stripePromise]);

  const canProceedFromAddress =
    customerName.trim().length >= 2 &&
    customerPhone.trim().length >= 8 &&
    addressDraft.street.trim().length >= 3 &&
    addressDraft.number.trim().length >= 1 &&
    addressDraft.neighborhood.trim().length >= 2 &&
    addressDraft.city.trim().length >= 2;

  const persistAddressHistory = useCallback(
    (nextAddress: string) => {
      const trimmed = nextAddress.trim();
      if (!trimmed) return;
      const key = getAddressHistoryStorageKey(user);
      const merged = [trimmed, ...savedAddresses]
        .filter((entry, index, arr) => arr.indexOf(entry) === index)
        .slice(0, MAX_SAVED_ADDRESSES);
      setSavedAddresses(merged);
      try {
        localStorage.setItem(key, JSON.stringify(merged));
      } catch (error) {
        console.error('[CheckoutFlow] saveAddressHistory', error);
      }
    },
    [user, savedAddresses]
  );

  const handleAddressDraftChange = useCallback((next: AddressDraft) => {
    setAddressDraft(next);
    setCustomerAddress(buildAddress(next));
  }, []);

  const handleSelectSavedAddress = useCallback(
    (value: string) => {
      const parsed = parseAddress(value);
      setAddressDraft(parsed);
      setCustomerAddress(value);
    },
    []
  );

  const handleConfirmOrder = async () => {
    if (!payment) {
      setErrorBanner(t('delivery.choosePayment'));
      return;
    }
    setBusy(true);
    setErrorBanner(null);

    const basePayload: Omit<
      CreateDeliveryOrderData,
      'paymentMethod' | 'stripePaymentIntentId'
    > = {
      restaurantId,
      restaurantName,
      customerName,
      customerPhone,
      customerAddress,
      items: items.map((it) => ({
        productId: it.product.id,
        productName: it.product.name,
        quantity: it.quantity,
        price: it.product.price,
        observations: it.observations,
      })) as DeliveryOrderItem[],
      total,
      deliveryFee,
      observations: observations || undefined,
    };

    try {
      if (payment.kind === 'cod') {
        await onOrderCreated({
          orderPayload: {
            ...basePayload,
            paymentMethod: payment.method,
          },
        });
        return;
      }

      if (payment.kind === 'stripe-pix') {
        if (!onlineCardPaymentsEnabled) {
          setErrorBanner(t('delivery.stripeConnectRestaurantPending'));
          return;
        }
        if (!stripePromise) {
          setErrorBanner(t('delivery.stripeNotConfigured'));
          return;
        }
        if ((currency || 'BRL').toUpperCase() !== 'BRL') {
          setErrorBanner(t('delivery.stripePixBrlOnly'));
          return;
        }

        pixOrderBaseRef.current = basePayload;
        pixSucceededRef.current = false;

        const res = await createDeliveryPaymentIntent({
          amountCents: Math.round(total * 100),
          currency: 'brl',
          usePix: true,
          metadata: {
            restaurantId,
            restaurantName: restaurantName.slice(0, 200),
            customerPhone: customerPhone.slice(0, 200),
          },
        });

        const stripe = await stripePromise;
        if (!stripe) {
          setErrorBanner(t('delivery.stripeNotConfigured'));
          return;
        }
        const digits = customerPhone.replace(/\D/g, '');
        const emailPix =
          user?.email?.trim() ||
          (digits.length >= 8 ? `pix-${digits}@guest.boracomer.invalid` : 'cliente@guest.boracomer.invalid');

        const pixResult = await stripe.confirmPixPayment(
          res.clientSecret,
          {
            payment_method: {
              billing_details: {
                name: customerName.trim() || 'Cliente',
                email: emailPix,
              },
            },
          },
          { handleActions: false }
        );

        if (pixResult.error) {
          setErrorBanner(pixResult.error.message ?? t('delivery.stripePixFailed'));
          return;
        }

        const pi = pixResult.paymentIntent;
        if (!pi) {
          setErrorBanner(t('delivery.stripePixFailed'));
          return;
        }

        if (pi.status === 'succeeded') {
          await onOrderCreated({
            orderPayload: {
              ...basePayload,
              paymentMethod: 'stripe',
              stripePaymentIntentId: pi.id,
            },
          });
          return;
        }

        const na = pi.next_action as
          | { type?: string; pix_display_qr_code?: { image_url_png?: string; data?: string; hosted_instructions_url?: string } }
          | null
          | undefined;
        if (
          pi.status === 'requires_action' &&
          na &&
          na.type === 'pix_display_qr_code' &&
          na.pix_display_qr_code
        ) {
          const p = na.pix_display_qr_code;
          setPixWait({
            clientSecret: res.clientSecret,
            paymentIntentId: pi.id,
            imageUrlPng: p.image_url_png ?? undefined,
            copyPaste: p.data ?? undefined,
            hostedInstructionsUrl: p.hosted_instructions_url ?? undefined,
          });
          setStep('pix-wait');
          return;
        }

        if (pi.status === 'processing' || pi.status === 'requires_action') {
          setPixWait({
            clientSecret: res.clientSecret,
            paymentIntentId: pi.id,
          });
          setStep('pix-wait');
          return;
        }

        setErrorBanner(t('delivery.stripePixUnexpected'));
        return;
      }

      if (payment.kind === 'saved') {
        const cid = await ensureCustomerFor();
        if (!cid) throw new Error('no-customer');
        const res = await createDeliveryPaymentIntent({
          amountCents: Math.round(total * 100),
          currency: (currency || 'BRL').toLowerCase(),
          customerId: cid,
          paymentMethodId: payment.card.id,
          metadata: {
            restaurantId,
            restaurantName: restaurantName.slice(0, 200),
            customerPhone: customerPhone.slice(0, 200),
          },
        });

        if (res.status === 'succeeded') {
          await onOrderCreated({
            orderPayload: {
              ...basePayload,
              paymentMethod: 'stripe',
              stripePaymentIntentId: res.paymentIntentId,
            },
          });
          return;
        }

        if (res.requiresAction) {
          // Confirmação adicional (3DS) com Stripe.js
          const stripe = await stripePromise;
          if (!stripe) {
            throw new Error('stripe-not-loaded');
          }
          const { error, paymentIntent } = await stripe.confirmCardPayment(
            res.clientSecret
          );
          if (error || !paymentIntent || paymentIntent.status !== 'succeeded') {
            setErrorBanner(
              error?.message ?? t('delivery.stripePaymentFailed')
            );
            setBusy(false);
            return;
          }
          await onOrderCreated({
            orderPayload: {
              ...basePayload,
              paymentMethod: 'stripe',
              stripePaymentIntentId: paymentIntent.id,
            },
          });
          return;
        }

        setErrorBanner(t('delivery.stripePaymentFailed'));
      }
    } catch (err: unknown) {
      console.error('[CheckoutFlow] confirm', err);
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : '';
      setErrorBanner(msg || t('delivery.orderError'));
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-stretch sm:items-center sm:justify-center bg-black/50">
      <div
        className="w-full sm:max-w-lg bg-white sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{
          maxHeight: '100dvh',
          paddingTop: 'env(safe-area-inset-top, 0px)',
        }}
      >
        <Header
          step={step}
          onBack={() => {
            if (step === 'pix-wait') {
              setPixWait(null);
              pixOrderBaseRef.current = null;
              setPayment({ kind: 'stripe-pix' });
              goTo('payment');
              return;
            }
            if (step === 'bag') onClose();
            else if (step === 'address') goTo('bag');
            else if (step === 'payment') goTo('address');
            else if (step === 'new-card') goTo('payment');
          }}
          onClose={onClose}
          restaurantName={restaurantName}
        />

        <div className="flex-1 overflow-y-auto">
          {errorBanner && (
            <div className="mx-4 mt-4 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {errorBanner}
            </div>
          )}

          {step === 'bag' && (
            <BagStep
              items={items}
              onChangeQuantity={onChangeQuantity}
              onRemoveItem={onRemoveItem}
              fmt={fmt}
              subtotal={subtotal}
              observations={observations}
              setObservations={setObservations}
              accentColor={accentColor}
            />
          )}

          {step === 'address' && (
            <AddressStep
              customerName={customerName}
              setCustomerName={setCustomerName}
              customerPhone={customerPhone}
              setCustomerPhone={setCustomerPhone}
              addressDraft={addressDraft}
              onAddressDraftChange={handleAddressDraftChange}
              savedAddresses={savedAddresses}
              onSelectSavedAddress={handleSelectSavedAddress}
              deliveryOption={deliveryOption}
              setDeliveryOption={setDeliveryOption}
              baseDeliveryFee={baseDeliveryFee}
              turboFeeExtra={turboFeeExtra}
              fmt={fmt}
              accentColor={accentColor}
            />
          )}

          {step === 'payment' && (
            <PaymentStep
              onlineCardPaymentsEnabled={onlineCardPaymentsEnabled}
              savedCards={savedCards}
              loadingCards={loadingCards}
              payment={payment}
              setPayment={setPayment}
              onAddNewCard={handleStartNewCard}
              authLoading={authLoading}
              onLoginForCard={() => {
                const path = `${window.location.pathname}${window.location.search}`;
                navigate(`/delivery/auth?redirect=${encodeURIComponent(path)}`);
              }}
              onRemoveCard={async (id) => {
                try {
                  await removeDeliverySavedCard(id);
                  setSavedCards((prev) => prev.filter((c) => c.id !== id));
                  if (payment?.kind === 'saved' && payment.card.id === id) {
                    setPayment(null);
                  }
                } catch (err) {
                  console.error('[CheckoutFlow] removeCard', err);
                }
              }}
              total={total}
              fmt={fmt}
              accentColor={accentColor}
              hasUser={!!user}
              busy={busy}
            />
          )}

          {step === 'new-card' && setupClientSecret && stripePromise && (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret: setupClientSecret,
                locale: locale.startsWith('pt')
                  ? 'pt-BR'
                  : locale.startsWith('fr')
                    ? 'fr'
                    : locale.startsWith('es')
                      ? 'es'
                      : 'en',
                defaultValues: {
                  billingDetails: {
                    email: user?.email ?? undefined,
                    name: (customerName || user?.name || '').trim() || undefined,
                    phone: (customerPhone || user?.phone || '').trim() || undefined,
                  },
                },
              } as StripeElementsOptions}
            >
              <NewCardStep
                onSaved={handleCardSaved}
                onCancel={() => {
                  setSetupClientSecret(null);
                  goTo('payment');
                }}
                accentColor={accentColor}
              />
            </Elements>
          )}

          {step === 'pix-wait' && pixWait && (
            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-700 text-center leading-relaxed">
                {t('delivery.stripePixScan')}
              </p>
              {pixWait.imageUrlPng ? (
                <div className="flex justify-center">
                  <img
                    src={pixWait.imageUrlPng}
                    alt="PIX QR"
                    className="max-w-[220px] w-full h-auto rounded-lg border border-gray-200"
                  />
                </div>
              ) : null}
              {pixWait.copyPaste ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-600">{t('delivery.stripePixCopy')}</p>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(pixWait.copyPaste ?? '');
                    }}
                    className="w-full py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-800 hover:bg-gray-50"
                  >
                    {t('delivery.stripePixCopyButton')}
                  </button>
                </div>
              ) : null}
              {pixWait.hostedInstructionsUrl ? (
                <a
                  href={pixWait.hostedInstructionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center text-sm text-amber-700 underline"
                >
                  {t('delivery.stripePixHostedLink')}
                </a>
              ) : null}
              <p className="text-xs text-gray-500 text-center">{t('delivery.stripePixPolling')}</p>
            </div>
          )}
        </div>

        <Footer
          step={step}
          busy={busy}
          accentColor={accentColor}
          total={total}
          subtotal={subtotal}
          deliveryFee={deliveryFee}
          fmt={fmt}
          itemCount={itemCount}
          canProceedFromAddress={canProceedFromAddress}
          payment={payment}
          onContinueBag={() => {
            if (items.length === 0) {
              setErrorBanner(t('delivery.addOneItem'));
              return;
            }
            goTo('address');
          }}
          onContinueAddress={() => {
            if (!canProceedFromAddress) {
              setErrorBanner(t('delivery.fillDeliveryData'));
              return;
            }
            persistAddressHistory(customerAddress);
            goTo('payment');
          }}
          onConfirmPayment={handleConfirmOrder}
          onCancelPixWait={() => {
            setPixWait(null);
            pixOrderBaseRef.current = null;
            setPayment({ kind: 'stripe-pix' });
            goTo('payment');
          }}
        />
      </div>
    </div>
  );
}

// =====================================================================
// Subcomponentes
// =====================================================================

function Header({
  step,
  onBack,
  onClose,
  restaurantName,
}: {
  step: Step;
  onBack: () => void;
  onClose: () => void;
  restaurantName: string;
}) {
  const { t } = useTranslation();
  const titleByStep: Record<Step, string> = {
    bag: t('delivery.bagTitle'),
    address: t('delivery.addressStepTitle'),
    payment: t('delivery.paymentStepTitle'),
    'new-card': t('delivery.newCardTitle'),
    'pix-wait': t('delivery.stripePixWaitTitle'),
  };
  return (
    <div className="flex items-center gap-2 px-3 sm:px-4 py-3 border-b border-gray-100 bg-white sticky top-0 z-10">
      <button
        type="button"
        onClick={onBack}
        className="w-10 h-10 -ml-1 flex items-center justify-center text-gray-700 hover:bg-gray-100 rounded-full active:scale-95"
        aria-label={t('delivery.back')}
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
      <div className="flex-1 min-w-0 text-center">
        <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">
          {titleByStep[step]}
        </p>
        <p className="text-sm font-bold text-gray-900 truncate">{restaurantName}</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="w-10 h-10 -mr-1 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-full active:scale-95"
        aria-label={t('delivery.cancel')}
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

function Footer({
  step,
  busy,
  accentColor,
  total,
  subtotal,
  deliveryFee,
  fmt,
  itemCount,
  canProceedFromAddress,
  payment,
  onContinueBag,
  onContinueAddress,
  onConfirmPayment,
  onCancelPixWait,
}: {
  step: Step;
  busy: boolean;
  accentColor: string;
  total: number;
  subtotal: number;
  deliveryFee: number;
  fmt: (v: number) => string;
  itemCount: number;
  canProceedFromAddress: boolean;
  payment: PaymentSelection | null;
  onContinueBag: () => void;
  onContinueAddress: () => void;
  onConfirmPayment: () => void;
  onCancelPixWait: () => void;
}) {
  const { t } = useTranslation();
  if (step === 'new-card') return null;

  if (step === 'pix-wait') {
    return (
      <div
        className="border-t border-gray-200 bg-white px-4 pt-3 pb-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
      >
        <div className="space-y-1 text-sm mb-3">
          <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-100">
            <span>{t('delivery.total')}</span>
            <span style={{ color: accentColor }}>{fmt(total)}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancelPixWait}
          className="w-full py-3 rounded-xl font-semibold border border-gray-300 text-gray-800 hover:bg-gray-50"
        >
          {t('delivery.stripePixBackToPayment')}
        </button>
      </div>
    );
  }

  return (
    <div
      className="border-t border-gray-200 bg-white px-4 pt-3 pb-4"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
    >
      {step === 'bag' && (
        <>
          <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
            <span>{t('delivery.subtotal')}</span>
            <span className="font-semibold text-gray-900">{fmt(subtotal)}</span>
          </div>
          <button
            type="button"
            onClick={onContinueBag}
            disabled={itemCount === 0 || busy}
            className="w-full py-3.5 rounded-xl font-bold text-white disabled:opacity-60 active:scale-[0.99] transition-transform"
            style={{ backgroundColor: accentColor }}
          >
            {t('delivery.continueToDelivery')}
          </button>
        </>
      )}

      {step === 'address' && (
        <>
          <div className="space-y-1 text-sm mb-3">
            <div className="flex justify-between text-gray-600">
              <span>{t('delivery.subtotal')}</span>
              <span>{fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>{t('delivery.deliveryFee')}</span>
              <span>{fmt(deliveryFee)}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-100">
              <span>{t('delivery.total')}</span>
              <span style={{ color: accentColor }}>{fmt(total)}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onContinueAddress}
            disabled={!canProceedFromAddress || busy}
            className="w-full py-3.5 rounded-xl font-bold text-white disabled:opacity-60 active:scale-[0.99] transition-transform"
            style={{ backgroundColor: accentColor }}
          >
            {t('delivery.continueToPayment')}
          </button>
        </>
      )}

      {step === 'payment' && (
        <>
          <div className="space-y-1 text-sm mb-3">
            <div className="flex justify-between text-gray-600">
              <span>{t('delivery.subtotal')}</span>
              <span>{fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>{t('delivery.deliveryFee')}</span>
              <span>{fmt(deliveryFee)}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-100">
              <span>{t('delivery.total')}</span>
              <span style={{ color: accentColor }}>{fmt(total)}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onConfirmPayment}
            disabled={!payment || busy}
            className="w-full py-3.5 rounded-xl font-bold text-white disabled:opacity-60 active:scale-[0.99] transition-transform flex items-center justify-center gap-2"
            style={{ backgroundColor: accentColor }}
          >
            {busy ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t('delivery.processing')}
              </>
            ) : (
              t('delivery.confirmAndPay', { amount: fmt(total) })
            )}
          </button>
        </>
      )}
    </div>
  );
}

function BagStep({
  items,
  onChangeQuantity,
  onRemoveItem,
  fmt,
  subtotal,
  observations,
  setObservations,
  accentColor,
}: {
  items: CartLine[];
  onChangeQuantity: (id: string, qty: number) => void;
  onRemoveItem: (id: string) => void;
  fmt: (v: number) => string;
  subtotal: number;
  observations: string;
  setObservations: (v: string) => void;
  accentColor: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="p-4 space-y-4">
      {items.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>{t('delivery.emptyCart')}</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {items.map((it) => (
              <div key={it.product.id} className="flex gap-3 bg-white">
                <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  {it.product.image ? (
                    <img
                      src={it.product.image}
                      alt={it.product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                      —
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 line-clamp-2">
                    {it.product.name}
                  </p>
                  {it.observations && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                      {it.observations}
                    </p>
                  )}
                  <p
                    className="mt-1 text-sm font-bold"
                    style={{ color: accentColor }}
                  >
                    {fmt(it.product.price * it.quantity)}
                  </p>
                </div>
                <div className="flex flex-col items-end justify-between">
                  <button
                    type="button"
                    onClick={() => onRemoveItem(it.product.id)}
                    className="text-gray-400 hover:text-red-500 active:scale-95"
                    aria-label={t('delivery.remove')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onChangeQuantity(it.product.id, it.quantity - 1)}
                      className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 active:scale-95"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-semibold text-sm w-6 text-center text-gray-900">
                      {it.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => onChangeQuantity(it.product.id, it.quantity + 1)}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white active:scale-95"
                      style={{ backgroundColor: accentColor }}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-dashed border-gray-200">
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {t('delivery.orderNoteLabel')}
            </label>
            <textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={2}
              maxLength={280}
              placeholder={t('delivery.orderNotePlaceholder')}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:outline-none text-sm text-gray-900 bg-white"
              style={{
                boxShadow: `0 0 0 0 ${accentColor}`,
              }}
            />
          </div>

          <div className="text-xs text-gray-500 text-right">
            {fmt(subtotal)} {t('delivery.withoutDeliveryFee')}
          </div>
        </>
      )}
    </div>
  );
}

function AddressStep({
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  addressDraft,
  onAddressDraftChange,
  savedAddresses,
  onSelectSavedAddress,
  deliveryOption,
  setDeliveryOption,
  baseDeliveryFee,
  turboFeeExtra,
  fmt,
  accentColor,
}: {
  customerName: string;
  setCustomerName: (v: string) => void;
  customerPhone: string;
  setCustomerPhone: (v: string) => void;
  addressDraft: AddressDraft;
  onAddressDraftChange: (v: AddressDraft) => void;
  savedAddresses: string[];
  onSelectSavedAddress: (v: string) => void;
  deliveryOption: DeliveryOption;
  setDeliveryOption: (v: DeliveryOption) => void;
  baseDeliveryFee: number;
  turboFeeExtra: number;
  fmt: (v: number) => string;
  accentColor: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="p-4 space-y-5">
      <div>
        <h3 className="text-sm font-bold text-gray-900 mb-3">
          {t('delivery.addressSectionTitle')}
        </h3>
        <div className="space-y-3">
          <LabeledInput
            icon={<UserIcon className="w-4 h-4" />}
            label={t('delivery.fullName')}
            value={customerName}
            onChange={setCustomerName}
            placeholder={t('delivery.fullName')}
          />
          <LabeledInput
            icon={<Phone className="w-4 h-4" />}
            label={t('delivery.phone')}
            value={customerPhone}
            onChange={setCustomerPhone}
            placeholder="(00) 00000-0000"
            type="tel"
          />
          {savedAddresses.length > 0 && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => onSelectSavedAddress(savedAddresses[0])}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-left text-sm bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <span className="block text-xs font-semibold text-gray-600 mb-0.5">
                  {t('delivery.useLastAddress')}
                </span>
                <span className="block text-gray-900 truncate">{savedAddresses[0]}</span>
              </button>
              {savedAddresses.length > 1 && (
                <select
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-gray-300"
                  defaultValue=""
                  onChange={(e) => {
                    if (!e.target.value) return;
                    onSelectSavedAddress(e.target.value);
                    e.currentTarget.value = '';
                  }}
                >
                  <option value="">{t('delivery.selectSavedAddress')}</option>
                  {savedAddresses.slice(1).map((address) => (
                    <option key={address} value={address}>
                      {address}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
          <LabeledInput
            icon={<Home className="w-4 h-4" />}
            label={t('delivery.street')}
            value={addressDraft.street}
            onChange={(street) => onAddressDraftChange({ ...addressDraft, street })}
            placeholder={t('delivery.streetPlaceholder')}
          />
          <LabeledInput
            icon={<Hash className="w-4 h-4" />}
            label={t('delivery.number')}
            value={addressDraft.number}
            onChange={(number) => onAddressDraftChange({ ...addressDraft, number })}
            placeholder={t('delivery.numberPlaceholder')}
          />
          <LabeledInput
            icon={<MapPin className="w-4 h-4" />}
            label={t('delivery.complement')}
            value={addressDraft.complement}
            onChange={(complement) => onAddressDraftChange({ ...addressDraft, complement })}
            placeholder={t('delivery.complementPlaceholder')}
          />
          <LabeledInput
            icon={<Building2 className="w-4 h-4" />}
            label={t('delivery.neighborhood')}
            value={addressDraft.neighborhood}
            onChange={(neighborhood) =>
              onAddressDraftChange({ ...addressDraft, neighborhood })
            }
            placeholder={t('delivery.neighborhoodPlaceholder')}
          />
          <LabeledInput
            icon={<MapPin className="w-4 h-4" />}
            label={t('delivery.city')}
            value={addressDraft.city}
            onChange={(city) => onAddressDraftChange({ ...addressDraft, city })}
            placeholder={t('delivery.cityPlaceholder')}
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-gray-900 mb-3">
          {t('delivery.deliveryOptionTitle')}
        </h3>
        <div className="space-y-2">
          <DeliveryOptionCard
            selected={deliveryOption === 'standard'}
            onSelect={() => setDeliveryOption('standard')}
            icon={<Bike className="w-5 h-5" />}
            title={t('delivery.deliveryStandard')}
            subtitle={t('delivery.deliveryStandardDesc')}
            feeLabel={fmt(baseDeliveryFee)}
            accentColor={accentColor}
          />
          <DeliveryOptionCard
            selected={deliveryOption === 'turbo'}
            onSelect={() => setDeliveryOption('turbo')}
            icon={<Zap className="w-5 h-5" />}
            title={t('delivery.deliveryTurbo')}
            subtitle={t('delivery.deliveryTurboDesc')}
            feeLabel={`${fmt(baseDeliveryFee)} + ${fmt(turboFeeExtra)}`}
            accentColor={accentColor}
          />
        </div>
      </div>
    </div>
  );
}

function LabeledInput({
  icon,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-gray-600 mb-1">{label}</span>
      <span className="relative block">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-gray-300"
        />
      </span>
    </label>
  );
}

function DeliveryOptionCard({
  selected,
  onSelect,
  icon,
  title,
  subtitle,
  feeLabel,
  accentColor,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  feeLabel: string;
  accentColor: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl border-2 text-left transition-colors ${
        selected ? 'bg-white' : 'bg-white hover:bg-gray-50 border-gray-200'
      }`}
      style={{ borderColor: selected ? accentColor : undefined }}
    >
      <span
        className="w-10 h-10 rounded-full flex items-center justify-center"
        style={{
          backgroundColor: selected ? accentColor : '#F3F4F6',
          color: selected ? 'white' : '#4B5563',
        }}
      >
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-gray-900">{feeLabel}</p>
      </div>
      <span
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
          selected ? '' : 'border-gray-300'
        }`}
        style={{ borderColor: selected ? accentColor : undefined }}
      >
        {selected ? (
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: accentColor }}
          />
        ) : null}
      </span>
    </button>
  );
}

function PaymentStep({
  onlineCardPaymentsEnabled,
  savedCards,
  loadingCards,
  payment,
  setPayment,
  onAddNewCard,
  onLoginForCard,
  onRemoveCard,
  fmt,
  total,
  accentColor,
  hasUser,
  authLoading,
  busy,
}: {
  onlineCardPaymentsEnabled: boolean;
  savedCards: SavedCard[];
  loadingCards: boolean;
  payment: PaymentSelection | null;
  setPayment: (p: PaymentSelection | null) => void;
  onAddNewCard: () => void;
  onLoginForCard: () => void;
  onRemoveCard: (id: string) => void;
  fmt: (v: number) => string;
  total: number;
  accentColor: string;
  hasUser: boolean;
  authLoading: boolean;
  busy: boolean;
}) {
  const { t } = useTranslation();
  const selectedSavedId =
    payment?.kind === 'saved' ? payment.card.id : undefined;

  return (
    <div className="p-4 space-y-5">
      <div>
        <h3 className="text-sm font-bold text-gray-900 mb-3">
          {t('delivery.savedCardsTitle')}
        </h3>

        {!onlineCardPaymentsEnabled ? (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 leading-relaxed">
            {t('delivery.stripeConnectRestaurantPending')}
          </p>
        ) : loadingCards ? (
          <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t('delivery.loadingCards')}
          </div>
        ) : savedCards.length === 0 ? (
          <p className="text-sm text-gray-500 mb-3">
            {authLoading
              ? t('delivery.checkingLogin')
              : hasUser
                ? t('delivery.noSavedCards')
                : t('delivery.loginToSaveCards')}
          </p>
        ) : (
          <div className="space-y-2 mb-2">
            {savedCards.map((card) => (
              <SavedCardRow
                key={card.id}
                card={card}
                selected={selectedSavedId === card.id}
                onSelect={() => setPayment({ kind: 'saved', card })}
                onRemove={() => onRemoveCard(card.id)}
                accentColor={accentColor}
                busy={busy}
              />
            ))}
          </div>
        )}

        {onlineCardPaymentsEnabled ? (
          authLoading ? (
            <div className="w-full flex items-center gap-3 px-3 py-3 rounded-xl border-2 border-dashed border-gray-200 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin shrink-0" />
              <span className="text-sm">{t('delivery.checkingLogin')}</span>
            </div>
          ) : !hasUser ? (
            <button
              type="button"
              onClick={onLoginForCard}
              disabled={busy}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl border-2 border-dashed text-left hover:bg-gray-50 disabled:opacity-50 transition-colors"
              style={{ borderColor: accentColor, color: accentColor }}
            >
              <span
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${accentColor}15` }}
              >
                <PlusIcon className="w-5 h-5" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold">{t('delivery.loginToAddCardCta')}</p>
                <p className="text-xs text-gray-500">{t('delivery.loginToAddCardHint')}</p>
              </div>
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onAddNewCard}
              disabled={busy}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl border-2 border-dashed text-left hover:bg-gray-50 disabled:opacity-50 transition-colors"
              style={{ borderColor: accentColor, color: accentColor }}
            >
              <span
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${accentColor}15` }}
              >
                <PlusIcon className="w-5 h-5" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold">
                  {t('delivery.addNewCard')}
                </p>
                <p className="text-xs text-gray-500">
                  {t('delivery.addNewCardDesc', { amount: fmt(total) })}
                </p>
              </div>
              <ChevronRight className="w-5 h-5" />
            </button>
          )
        ) : null}

        {onlineCardPaymentsEnabled ? (
          <button
            type="button"
            onClick={() => setPayment({ kind: 'stripe-pix' })}
            disabled={busy}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl border-2 bg-white text-left transition-colors hover:bg-gray-50 disabled:opacity-50 mt-3"
            style={{
              borderColor: payment?.kind === 'stripe-pix' ? accentColor : '#E5E7EB',
            }}
          >
            <span
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: payment?.kind === 'stripe-pix' ? accentColor : '#F3F4F6',
                color: payment?.kind === 'stripe-pix' ? 'white' : '#4B5563',
              }}
            >
              <QrCode className="w-5 h-5" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">{t('delivery.stripePixOnline')}</p>
              <p className="text-xs text-gray-500">{t('delivery.stripePixOnlineHint')}</p>
            </div>
            <span
              className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
              style={{ borderColor: payment?.kind === 'stripe-pix' ? accentColor : '#D1D5DB' }}
            >
              {payment?.kind === 'stripe-pix' ? (
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: accentColor }}
                />
              ) : null}
            </span>
          </button>
        ) : null}
      </div>

      <div>
        <h3 className="text-sm font-bold text-gray-900 mb-3">
          {t('delivery.payOnDeliveryTitle')}
        </h3>
        <p className="text-xs text-gray-500 mb-3 leading-relaxed">
          {onlineCardPaymentsEnabled
            ? t('delivery.payOnDeliveryCardClarify')
            : t('delivery.payOnDeliveryDesc')}
        </p>
        <div className="space-y-2">
          {COD_OPTIONS.map((opt) => {
            const selected =
              payment?.kind === 'cod' && payment.method === opt.method;
            const codDesc =
              opt.method === 'credit' || opt.method === 'debit'
                ? t('delivery.payOnDeliveryCardAtDoor')
                : t('delivery.payOnDeliveryDesc');
            return (
              <button
                key={opt.method}
                type="button"
                onClick={() => setPayment({ kind: 'cod', method: opt.method })}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl border-2 bg-white text-left transition-colors hover:bg-gray-50"
                style={{ borderColor: selected ? accentColor : '#E5E7EB' }}
              >
                <span
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: selected ? accentColor : '#F3F4F6',
                    color: selected ? 'white' : '#4B5563',
                  }}
                >
                  {opt.icon}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {t(opt.labelKey)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {codDesc}
                  </p>
                </div>
                <span
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                  style={{ borderColor: selected ? accentColor : '#D1D5DB' }}
                >
                  {selected ? (
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: accentColor }}
                    />
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SavedCardRow({
  card,
  selected,
  onSelect,
  onRemove,
  accentColor,
  busy,
}: {
  card: SavedCard;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  accentColor: string;
  busy: boolean;
}) {
  return (
    <div
      className="flex items-center gap-3 px-3 py-3 rounded-xl border-2 bg-white"
      style={{ borderColor: selected ? accentColor : '#E5E7EB' }}
    >
      <button
        type="button"
        onClick={onSelect}
        disabled={busy}
        className="flex items-center gap-3 flex-1 text-left"
      >
        <span
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{
            backgroundColor: selected ? accentColor : '#F3F4F6',
            color: selected ? 'white' : '#4B5563',
          }}
        >
          <Wallet className="w-5 h-5" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">
            {brandLabel(card.brand)} •••• {card.last4}
          </p>
          <p className="text-xs text-gray-500">
            {String(card.expMonth).padStart(2, '0')}/{String(card.expYear).slice(-2)}
          </p>
        </div>
        <span
          className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
          style={{ borderColor: selected ? accentColor : '#D1D5DB' }}
        >
          {selected ? (
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: accentColor }}
            />
          ) : null}
        </span>
      </button>
      <button
        type="button"
        onClick={onRemove}
        disabled={busy}
        className="text-gray-400 hover:text-red-500 p-1 disabled:opacity-50"
        aria-label="Remover"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

function NewCardStep({
  onSaved,
  onCancel,
  accentColor,
}: {
  onSaved: () => void;
  onCancel: () => void;
  accentColor: string;
}) {
  const { t } = useTranslation();
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);
    const { error: err, setupIntent } = await stripe.confirmSetup({
      elements,
      redirect: 'if_required',
    });
    if (err) {
      setError(err.message ?? 'Erro ao salvar cartão.');
      setBusy(false);
      return;
    }
    if (setupIntent && setupIntent.status === 'succeeded') {
      onSaved();
      return;
    }
    setError('Não foi possível salvar o cartão.');
    setBusy(false);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 text-blue-800 rounded-lg px-3 py-2 text-xs">
        <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
        <span>{t('delivery.newCardInfo')}</span>
      </div>
      <PaymentElement
        options={{
          layout: 'tabs',
          wallets: { applePay: 'never', googlePay: 'never' },
        }}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-60"
        >
          {t('delivery.cancel')}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={busy || !stripe}
          className="flex-1 py-3 rounded-xl font-bold text-white disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ backgroundColor: accentColor }}
        >
          {busy ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t('delivery.saving')}
            </>
          ) : (
            t('delivery.saveCard')
          )}
        </button>
      </div>
    </div>
  );
}
