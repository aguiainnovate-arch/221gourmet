import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  EyeOff,
  Link2,
  MessageCircle,
  Share2,
  Sparkles,
  X,
} from 'lucide-react';
import {
  PARTNERSHIP_FEE_WAIVER_THRESHOLD,
  PARTNERSHIP_MONTHLY_FEE,
  PARTNERSHIP_PLANS,
  PARTNERSHIP_TRIAL_DAYS,
  formatFeePercent,
} from '../../types/partnership';
import {
  submitRestaurantLead,
  RestaurantLeadModerationError,
  RestaurantLeadValidationUnavailableError,
  RestaurantLeadDuplicateEmailError,
  RestaurantLeadAutoProvisionError,
  type RestaurantLeadPayload,
} from '../../services/restaurantLeadService';
import {
  CaptarFaq,
  CaptarLayout,
  CaptarSheet,
  formatPhone,
} from './CaptarShared';
import CaptarProfitCalculator from '../../components/captar/CaptarProfitCalculator';
import { pushCaptarRestaurantSubmit } from '../../utils/gtm';
import {
  persistRestaurantSession,
  readPersistedRestaurantId,
} from '../../contexts/RestaurantAuthContext';

const initial: RestaurantLeadPayload = {
  restaurantName: '',
  ownerName: '',
  phone: '',
  whatsapp: '',
  email: '',
  cnpj: '',
  address: '',
  cityState: '',
  cuisineType: '',
  openingHours: '',
  priceRange: '',
  socialLink: '',
  description: '',
};

const FAQ = [
  {
    q: 'Como funcionam os 7 dias grátis da mensalidade?',
    a: `Novos restaurantes começam com ${PARTNERSHIP_TRIAL_DAYS} dias grátis. Depois vale a mensalidade de R$ ${PARTNERSHIP_MONTHLY_FEE.toFixed(2).replace('.', ',')} se o faturamento no mês passar de R$ ${PARTNERSHIP_FEE_WAIVER_THRESHOLD.toLocaleString('pt-BR')}.`,
  },
  {
    q: 'Quem pode se cadastrar?',
    a: 'Lojas de alimentação com CNPJ ativo, dados reais do titular e endereço de operação. Cadastros fictícios são recusados na análise.',
  },
  {
    q: 'Quais taxas são cobradas?',
    a: `Entrega pela loja: ${formatFeePercent(PARTNERSHIP_PLANS.store_delivery.platformFeePercent)} por pedido. Entrega pela Bora Comer!: ${formatFeePercent(PARTNERSHIP_PLANS.platform_delivery.platformFeePercent)}. A mensalidade segue a regra de isenção por faturamento.`,
  },
  {
    q: 'Do que preciso para me cadastrar?',
    a: 'Nome do restaurante, WhatsApp com DDD, e-mail e uma senha. Cardápio, endereço e recebimento ficam para depois, no painel.',
  },
  {
    q: 'É necessário ter CNPJ?',
    a: 'Neste cadastro, não. CNPJ entra depois, no contrato e no recebimento Stripe.',
  },
  {
    q: 'Quais planos existem?',
    a: 'Dois: delivery com a equipe da loja, ou delivery com motoboys da Bora Comer!. A diferença está na taxa por pedido.',
  },
  {
    q: 'Em quanto tempo a loja aparece no app?',
    a: 'Depois da análise e do preenchimento de cardápio, horário e conta de recebimento. Quando o Connect estiver apto, o checkout online libera sozinho.',
  },
];

const MIN_PASSWORD = 6;

function digitsOf(value: string) {
  return value.replace(/\D/g, '');
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="captar-field">
      <label>{label}</label>
      {children}
    </div>
  );
}

const BORIS_AVATAR = '/boris-avatar.jpg';

function OfferDevicesCarousel({ restaurantName }: { restaurantName: string }) {
  const slides = [
    { id: 'menu', caption: 'Cardápio no celular do cliente' },
    { id: 'whatsapp', caption: 'Boris responde no WhatsApp' },
    { id: 'qr', caption: 'QR na mesa abre na hora' },
  ] as const;
  const [index, setIndex] = useState(0);
  const touchX = useRef<number | null>(null);

  const go = (next: number) => {
    const len = slides.length;
    setIndex(((next % len) + len) % len);
  };

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  return (
    <div className="captar-offer-stage">
      <div
        className="captar-offer-carousel"
        onTouchStart={(event) => {
          touchX.current = event.changedTouches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          const start = touchX.current;
          const end = event.changedTouches[0]?.clientX;
          touchX.current = null;
          if (start == null || end == null) return;
          const delta = end - start;
          if (Math.abs(delta) < 40) return;
          go(index + (delta < 0 ? 1 : -1));
        }}
      >
        <button
          type="button"
          className="captar-offer-nav captar-offer-nav-prev"
          aria-label="Celular anterior"
          onClick={() => go(index - 1)}
        >
          <ChevronLeft size={18} />
        </button>

        <div className="captar-offer-viewport">
          <div
            className="captar-offer-track"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            <div className="captar-offer-slide">
              <div className="captar-offer-phone">
                <div className="captar-offer-status">
                  <span>9:41</span>
                  <span className="captar-offer-dots" />
                </div>
                <img src="/cardapio-digital/burger.jpg" alt="" />
                <div className="captar-offer-sheet">
                  <div className="captar-offer-shop">
                    <img src="/cardapio-digital/burger.jpg" alt="" />
                    <div>
                      <strong>{restaurantName || 'Seu restaurante'}</strong>
                      <span>Bora Comer Automatic</span>
                    </div>
                  </div>
                  <div className="captar-offer-tabs">
                    <span className="on">Destaques</span>
                    <span>Combos</span>
                    <span>Bebidas</span>
                  </div>
                  <div className="captar-offer-grid">
                    <article>
                      <img src="/cardapio-digital/burger.jpg" alt="" />
                      <b>Burger da casa</b>
                    </article>
                    <article>
                      <img src="/cardapio-digital/pizza.jpg" alt="" />
                      <b>Combo especial</b>
                    </article>
                  </div>
                </div>
              </div>
            </div>

            <div className="captar-offer-slide">
              <div className="captar-offer-wa" role="img" aria-label="Boris respondendo no WhatsApp">
                <div className="captar-offer-wa-bezel">
                  <div className="captar-offer-wa-status">
                    <span>9:41</span>
                    <span className="captar-offer-dots" />
                  </div>
                  <div className="captar-offer-wa-head">
                    <span className="captar-offer-wa-back" />
                    <img src={BORIS_AVATAR} alt="" className="captar-offer-wa-avatar" />
                    <div className="captar-offer-wa-who">
                      <strong>Boris</strong>
                      <span>online · WhatsApp</span>
                    </div>
                    <MessageCircle size={14} className="captar-offer-wa-badge" />
                  </div>
                  <div className="captar-offer-wa-thread">
                    <div className="captar-offer-wa-bubble is-out">
                      Oi, ainda estão abertos?
                      <time>9:41</time>
                    </div>
                    <div className="captar-offer-wa-row">
                      <img src={BORIS_AVATAR} alt="" />
                      <div className="captar-offer-wa-bubble is-in">
                        Oi! Sim, estamos abertos até 22h
                        <time>9:41</time>
                      </div>
                    </div>
                    <div className="captar-offer-wa-row">
                      <img src={BORIS_AVATAR} alt="" />
                      <div className="captar-offer-wa-bubble is-in">
                        Quer que eu envie o cardápio?
                        <time>9:41</time>
                      </div>
                    </div>
                    <div className="captar-offer-wa-typing">
                      <img src={BORIS_AVATAR} alt="" />
                      <span>
                        <i />
                        <i />
                        <i />
                      </span>
                    </div>
                  </div>
                </div>
                <p className="captar-offer-wa-tag">
                  <MessageCircle size={14} />
                  Boris responde no WhatsApp
                </p>
              </div>
            </div>

            <div className="captar-offer-slide">
              <div className="captar-offer-qrphone">
                <div className="captar-offer-status">
                  <span>9:41</span>
                  <span className="captar-offer-dots" />
                </div>
                <img src="/cardapio-digital/mesa-qr.jpg" alt="" className="captar-offer-qrphone-bg" />
                <div className="captar-offer-qrphone-card">
                  <img src={BORIS_AVATAR} alt="" />
                  <strong>Escaneie e peça</strong>
                  <span>QR na mesa · Automatic</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="captar-offer-nav captar-offer-nav-next"
          aria-label="Próximo celular"
          onClick={() => go(index + 1)}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="captar-offer-dots-nav" role="tablist" aria-label="Telas do celular">
        {slides.map((slide, i) => (
          <button
            key={slide.id}
            type="button"
            role="tab"
            aria-selected={i === index}
            className={i === index ? 'is-on' : ''}
            onClick={() => setIndex(i)}
            aria-label={slide.caption}
          />
        ))}
      </div>
      <p className="captar-offer-caption">{slides[index].caption}</p>
    </div>
  );
}

export default function CaptarRestaurant() {
  const location = useLocation();
  const seededEmail =
    typeof (location.state as { email?: string } | null)?.email === 'string'
      ? (location.state as { email: string }).email
      : '';
  const openFromNav = Boolean((location.state as { openWizard?: boolean } | null)?.openWizard);

  const [wizard, setWizard] = useState(openFromNav);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<RestaurantLeadPayload>({ ...initial, email: seededEmail });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [panelRestaurantId, setPanelRestaurantId] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<
    Partial<Record<'restaurantName' | 'whatsapp' | 'email' | 'password', string>>
  >({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [openPlan, setOpenPlan] = useState<string | null>('store_delivery');

  useEffect(() => {
    document.title = 'Cadastre seu restaurante — Bora Comer!';
  }, []);

  useLayoutEffect(() => {
    if (location.hash === '#cadastro') {
      document.getElementById('cadastro')?.scrollIntoView({ block: 'center' });
      return;
    }
    if (location.hash === '#calculadora') {
      document.getElementById('calculadora')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.hash]);

  function setField<K extends keyof RestaurantLeadPayload>(key: K, value: string) {
    if (key === 'phone' || key === 'whatsapp') {
      setForm((p) => ({ ...p, [key]: formatPhone(value) }));
    } else {
      setForm((p) => ({ ...p, [key]: value }));
    }
    if (key === 'restaurantName' || key === 'whatsapp' || key === 'email') {
      setFieldError((prev) => ({ ...prev, [key]: undefined }));
    }
  }

  function openWizard() {
    setWizard(true);
    setStep(1);
    setStatus('idle');
    setMessage('');
    setFieldError({});
  }

  function continueStep1() {
    const next: typeof fieldError = {};
    if (!form.restaurantName.trim()) next.restaurantName = 'Informe o nome do restaurante.';
    if (digitsOf(form.whatsapp).length < 10) next.whatsapp = 'Informe o WhatsApp com DDD.';
    setFieldError(next);
    if (Object.keys(next).length > 0) return;
    setStep(2);
  }

  async function submitAll() {
    if (status === 'sending') return;
    const next: typeof fieldError = {};
    if (!isEmail(form.email)) next.email = 'Informe um e-mail válido.';
    if (password.trim().length < MIN_PASSWORD) {
      next.password = `A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`;
    }
    setFieldError(next);
    if (Object.keys(next).length > 0) return;

    setStatus('sending');
    setMessage('');
    try {
      const res = await submitRestaurantLead(
        { ...form, ownerName: form.ownerName.trim() || form.restaurantName.trim(), phone: form.whatsapp },
        { password: password.trim() }
      );
      pushCaptarRestaurantSubmit(form.restaurantName);
      const createdId = res.restaurantProvisioned?.restaurantId ?? null;
      if (!createdId) {
        throw new RestaurantLeadAutoProvisionError(
          'Não foi possível criar sua conta agora. Confira a conexão e tente novamente.'
        );
      }
      persistRestaurantSession(createdId);
      setPanelRestaurantId(createdId);
      setPassword('');
      setStatus('success');
      setStep(3);
    } catch (err) {
      setStatus('error');
      if (err instanceof RestaurantLeadDuplicateEmailError) {
        setMessage('Este e-mail já está em uma loja. Entre no portal ou use outro e-mail.');
      } else if (err instanceof RestaurantLeadModerationError) {
        setMessage(err.message);
      } else if (err instanceof RestaurantLeadValidationUnavailableError) {
        setMessage(err.message);
      } else if (err instanceof RestaurantLeadAutoProvisionError) {
        setMessage(err.message);
      } else {
        setMessage('Não foi possível criar a conta agora. Confira a conexão e tente de novo.');
      }
    }
  }

  return (
    <CaptarLayout
      variant="restaurante"
      onCadastrar={() => openWizard()}
      sheet={
        wizard ? null : (
          <CaptarSheet
            title="Sua loja no app"
            subtitle="Cadastre agora e comece a receber pedidos."
            cta="Cadastrar agora"
            collectEmail={false}
            onStart={() => openWizard()}
          />
        )
      }
    >
      <section className="captar-hero-rest captar-hero-rest--compact">
        <div className="captar-hero-banner" aria-hidden>
          <img src="/captar/hero-calculadora.jpg" alt="" />
        </div>
        <div className="captar-hero-rest-inner">
          <div className="captar-hero-copy">
            <p className="captar-hero-eyebrow">
              <span className="captar-hero-eyebrow__glow" aria-hidden />
              <span className="captar-hero-eyebrow__icon" aria-hidden>
                <Sparkles size={13} strokeWidth={2.4} />
              </span>
              <span className="captar-hero-eyebrow__text">{PARTNERSHIP_TRIAL_DAYS} DIAS GRÁTIS</span>
            </p>
            <h1>Simule o lucro da sua loja na Bora Comer!</h1>
            <p>
              Ajuste pedidos, ticket e custo do prato. Veja o mês na ponta do lápis e cadastre a loja
              quando os números fizerem sentido.
            </p>
            <div className="captar-hero-actions">
              <a className="captar-btn-solid captar-btn-lg" href="#calculadora">
                Abrir calculadora
                <ArrowRight size={18} />
              </a>
              <button
                type="button"
                className="captar-btn-ghost-light"
                onClick={() => openWizard()}
              >
                Criar conta grátis
              </button>
            </div>
          </div>
          <div id="cadastro" className="captar-form-card captar-pitch">
            <h2>
              Menos tempo cadastrando.
              <br />
              Mais tempo vendendo.
            </h2>
            <p className="hint">
              Conta em poucos passos. Cardápio e detalhes você configura depois no painel.
            </p>
            <button
              className="captar-btn-solid captar-btn-lg captar-pitch-cta"
              type="button"
              onClick={() => openWizard()}
            >
              Criar minha conta grátis
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      <div className="captar-calc-stage">
        <CaptarProfitCalculator onAssinar={openWizard} featured />
      </div>

      <section className="captar-section captar-planos-block" id="planos">
        <div className="captar-planos-block__head">
          <h2>Planos</h2>
          <p className="captar-planos-block__lead">
            Escolha como entregar. Mensalidade com {PARTNERSHIP_TRIAL_DAYS} dias grátis e isenção por
            faturamento.
          </p>
        </div>
        <div className="captar-plans">
          {Object.values(PARTNERSHIP_PLANS).map((plan) => (
            <article className="captar-plan" key={plan.id}>
              <h3>{plan.id === 'store_delivery' ? 'Entrega da loja' : 'Entrega Bora Comer!'}</h3>
              <div className="rate">
                {formatFeePercent(plan.platformFeePercent)}
                <small>comissão sobre pedidos delivery</small>
              </div>
              <p style={{ margin: '12px 0 0', color: '#555', fontSize: 14 }}>{plan.subtitle}</p>
              <p style={{ margin: '8px 0 0', fontSize: 14 }}>
                R$ {PARTNERSHIP_MONTHLY_FEE.toFixed(2).replace('.', ',')}/mês · {PARTNERSHIP_TRIAL_DAYS}{' '}
                dias grátis · isenta até R$ {PARTNERSHIP_FEE_WAIVER_THRESHOLD.toLocaleString('pt-BR')}/mês
              </p>
              <button
                type="button"
                className="captar-nav-btn"
                style={{ paddingLeft: 0, color: '#E91120', fontWeight: 700 }}
                onClick={() => setOpenPlan(openPlan === plan.id ? null : plan.id)}
              >
                {openPlan === plan.id ? 'Ocultar detalhes' : 'Ver mais detalhes'}
              </button>
              {openPlan === plan.id && (
                <ul>
                  <li>Sua loja no app Bora Comer!</li>
                  <li>
                    {plan.id === 'store_delivery'
                      ? 'Entrega feita pela sua loja'
                      : 'Entrega com motoboys da plataforma'}
                  </li>
                  <li>Painel de pedidos e cardápio</li>
                  <li>Recebimento via Stripe Connect</li>
                  {plan.id === 'platform_delivery' && <li>Rastreio da corrida para o cliente</li>}
                </ul>
              )}
            </article>
          ))}
        </div>
        <div className="captar-mid-cta captar-planos-block__cta">
          <Link to="/planos" className="captar-btn-ghost">
            Ver página completa de planos
          </Link>
          <button type="button" className="captar-btn-solid" onClick={() => openWizard()}>
            Cadastrar minha loja
          </button>
        </div>
      </section>

      <section className="captar-stats captar-stats--slim">
        <div className="captar-stat">
          <strong>
            {formatFeePercent(PARTNERSHIP_PLANS.store_delivery.platformFeePercent)}
          </strong>
          <span>taxa a partir de, com entrega da loja</span>
        </div>
        <div className="captar-stat">
          <strong>{PARTNERSHIP_TRIAL_DAYS} dias</strong>
          <span>grátis para testar a mensalidade</span>
        </div>
        <div className="captar-stat">
          <strong>2</strong>
          <span>modos: sua equipe ou motoboys da Bora Comer!</span>
        </div>
      </section>

      <section className="captar-section captar-vantagens-slim" id="vantagens">
        <h2>Por que entrar na Bora Comer!</h2>
        <div className="captar-adv-grid three">
          <button type="button" className="captar-adv-card captar-adv-card--light" onClick={() => openWizard()}>
            <h3>Entrega do seu jeito</h3>
            <p>Sua equipe ou motoboys da rede. WhatsApp da casa continua no seu fluxo.</p>
            <span className="go">
              Quero ser parceiro <ArrowRight size={16} />
            </span>
          </button>
          <button type="button" className="captar-adv-card captar-adv-card--light" onClick={() => openWizard()}>
            <h3>Gestão no celular</h3>
            <p>Cardápio, pedidos e Stripe Connect no painel. Sem PDV extra.</p>
            <span className="go">
              Quero ser parceiro <ArrowRight size={16} />
            </span>
          </button>
          <button type="button" className="captar-adv-card captar-adv-card--light" onClick={() => openWizard()}>
            <h3>Recebimento Stripe</h3>
            <p>O cliente paga no app. O dinheiro vai para a conta da loja.</p>
            <span className="go">
              Quero ser parceiro <ArrowRight size={16} />
            </span>
          </button>
        </div>
      </section>

      <section className="captar-section" id="passos">
        <h2>Como abrir uma loja na Bora Comer!?</h2>
        <div className="captar-steps">
          <article className="captar-step">
            <div className="n">1</div>
            <h3>Crie a conta e cadastre a loja</h3>
            <p>Nome do restaurante, WhatsApp, e-mail e senha. O restante você configura no painel.</p>
          </article>
          <article className="captar-step">
            <div className="n">2</div>
            <h3>Escolha o plano e ative o recebimento</h3>
            <p>Entrega própria ou da plataforma. Depois o Stripe Connect para cobrar no app.</p>
          </article>
          <article className="captar-step">
            <div className="n">3</div>
            <h3>Monte o cardápio e abra as portas</h3>
            <p>Horário, produtos e zona de entrega. Aí a loja aparece no delivery.</p>
          </article>
        </div>
      </section>

      <CaptarFaq items={FAQ} />

      {wizard && (
        <div className="captar-modal" role="dialog" aria-modal="true" aria-labelledby="wiz-title">
          <div className={`captar-modal-card${step === 3 ? ' captar-modal-card--offer' : ''}`}>
            <button
              type="button"
              className="captar-sheet-dismiss"
              onClick={() => setWizard(false)}
              aria-label="Fechar cadastro"
            >
              <X size={18} />
            </button>
            {step < 3 && (
              <p className="captar-wiz-brand">
                <strong>bora comer</strong>
                <span>Etapa {step} de 2</span>
              </p>
            )}

            {step === 1 && (
              <>
                <h2 id="wiz-title">Seu restaurante começa aqui.</h2>
                <p className="captar-wiz-sub">Vamos criar sua conta. Você configura os outros detalhes depois.</p>
                <Field label="Nome do restaurante*">
                  <input
                    className="captar-input"
                    autoComplete="organization"
                    placeholder="Ex.: Cantina da Ana"
                    value={form.restaurantName}
                    aria-invalid={Boolean(fieldError.restaurantName)}
                    aria-describedby={fieldError.restaurantName ? 'err-name' : undefined}
                    onChange={(e) => setField('restaurantName', e.target.value)}
                  />
                  {fieldError.restaurantName && (
                    <span className="captar-field-error" id="err-name" role="alert">
                      {fieldError.restaurantName}
                    </span>
                  )}
                </Field>
                <Field label="WhatsApp*">
                  <input
                    className="captar-input"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="11 99999 9999"
                    value={form.whatsapp}
                    aria-invalid={Boolean(fieldError.whatsapp)}
                    aria-describedby={fieldError.whatsapp ? 'err-wa' : undefined}
                    onChange={(e) => setField('whatsapp', e.target.value)}
                  />
                  {fieldError.whatsapp && (
                    <span className="captar-field-error" id="err-wa" role="alert">
                      {fieldError.whatsapp}
                    </span>
                  )}
                </Field>
                <button type="button" className="captar-btn-solid captar-btn-lg" onClick={continueStep1}>
                  Continuar
                </button>
                <Link className="captar-wiz-login" to="/restaurant/auth">
                  Já tem uma conta? Entrar
                </Link>
              </>
            )}

            {step === 2 && (
              <>
                <h2 id="wiz-title">Agora, crie seu acesso.</h2>
                <p className="captar-wiz-sub">
                  Use seu e-mail e uma senha para entrar no Bora Comer sempre que precisar.
                </p>
                <Field label="E-mail*">
                  <input
                    className="captar-input"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="voce@restaurante.com"
                    value={form.email}
                    aria-invalid={Boolean(fieldError.email)}
                    aria-describedby={fieldError.email ? 'err-email' : undefined}
                    onChange={(e) => setField('email', e.target.value)}
                  />
                  {fieldError.email && (
                    <span className="captar-field-error" id="err-email" role="alert">
                      {fieldError.email}
                    </span>
                  )}
                </Field>
                <Field label="Senha*">
                  <div className="captar-pass">
                    <input
                      className="captar-input"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      name="new-password"
                      value={password}
                      aria-invalid={Boolean(fieldError.password)}
                      aria-describedby="hint-password"
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setFieldError((prev) => ({ ...prev, password: undefined }));
                      }}
                    />
                    <button
                      type="button"
                      className="captar-pass-toggle"
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <span className="captar-field-hint" id="hint-password">
                    Mínimo de {MIN_PASSWORD} caracteres. Pode colar ou usar o gerenciador de senhas.
                  </span>
                  {fieldError.password && (
                    <span className="captar-field-error" role="alert">
                      {fieldError.password}
                    </span>
                  )}
                </Field>
                {status === 'error' && (
                  <p className="captar-field-error" role="alert">
                    {message}
                  </p>
                )}
                <button
                  type="button"
                  className="captar-btn-solid captar-btn-lg"
                  disabled={status === 'sending'}
                  onClick={() => void submitAll()}
                >
                  {status === 'sending' ? 'Criando sua conta...' : 'Criar conta e acessar'}
                </button>
                <p className="captar-wiz-note">Depois, você configura o cardápio e os detalhes do restaurante.</p>
                <button
                  type="button"
                  className="captar-wiz-back"
                  onClick={() => {
                    setStatus('idle');
                    setMessage('');
                    setStep(1);
                  }}
                >
                  Voltar
                </button>
              </>
            )}

            {step === 3 && (
              <div className="captar-offer">
                <header className="captar-offer-top">
                  <div className="captar-offer-brand">
                    <strong>bora comer</strong>
                    <span>Parceiros</span>
                  </div>
                  <a href="#faq" onClick={() => setWizard(false)}>
                    Precisa de ajuda?
                  </a>
                </header>
                <p className="captar-offer-done" id="wiz-title">
                  <Check size={16} strokeWidth={3} />
                  Cadastro concluído
                </p>
                <div className="captar-offer-card">
                  <div className="captar-offer-copy">
                    <p className="captar-offer-ok">
                      <Check size={16} strokeWidth={3} />
                      Seu restaurante já está cadastrado!
                    </p>
                    <h2>
                      Quer também receber pedidos do seu restaurante e{' '}
                      <em>WhatsApp de forma automática?</em>
                    </h2>
                    <p className="captar-offer-lead">
                      Conheça o Bora Comer Automatic: QR no salão, link próprio e atendimento automático.
                    </p>
                    <ul>
                      <li>
                        <Link2 size={18} />
                        Um link exclusivo do seu restaurante
                      </li>
                      <li>
                        <Share2 size={18} />
                        Atendimento automático pelo WhatsApp
                      </li>
                      <li>
                        <ClipboardList size={18} />
                        Seu cardápio sempre à mão
                      </li>
                    </ul>
                    <Link className="captar-btn-solid captar-btn-lg captar-offer-cta" to="/delivery/cardapio-digital">
                      Conhecer o Bora Comer Automatic
                      <ArrowRight size={18} />
                    </Link>
                    <Link
                      className="captar-offer-skip"
                      to={(() => {
                        const id = panelRestaurantId ?? readPersistedRestaurantId();
                        return id ? `/${id}/settings` : '/restaurant/auth';
                      })()}
                      onClick={() => {
                        const id = panelRestaurantId ?? readPersistedRestaurantId();
                        if (id) persistRestaurantSession(id);
                      }}
                    >
                      Continuar no marketplace
                    </Link>
                    <p className="captar-offer-later">Você pode conhecer agora ou deixar para depois.</p>
                  </div>
                  <OfferDevicesCarousel restaurantName={form.restaurantName.trim()} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </CaptarLayout>
  );
}
