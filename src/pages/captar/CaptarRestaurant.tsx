import { useEffect, useLayoutEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Check, ClipboardList, Eye, EyeOff, Link2, MessageCircle, Share2, X } from 'lucide-react';
import {
  PARTNERSHIP_FEE_WAIVER_THRESHOLD,
  PARTNERSHIP_MONTHLY_FEE,
  PARTNERSHIP_PLANS,
  PARTNERSHIP_TRIAL_DAYS,
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
    q: 'Como funciona o período de teste da mensalidade?',
    a: `Novos restaurantes entram com ${PARTNERSHIP_TRIAL_DAYS} dias de trial. Depois vale a mensalidade de R$ ${PARTNERSHIP_MONTHLY_FEE.toFixed(2).replace('.', ',')} se o faturamento no mês passar de R$ ${PARTNERSHIP_FEE_WAIVER_THRESHOLD.toLocaleString('pt-BR')}.`,
  },
  {
    q: 'Quem pode se cadastrar?',
    a: 'Lojas de alimentação com CNPJ ativo, dados reais do titular e endereço de operação. Cadastros fictícios são recusados na análise.',
  },
  {
    q: 'Quais taxas são cobradas?',
    a: `Entrega pela loja: ${PARTNERSHIP_PLANS.store_delivery.platformFeePercent}% por pedido. Entrega pela Bora Comer!: ${PARTNERSHIP_PLANS.platform_delivery.platformFeePercent}%. A mensalidade segue a regra de isenção por faturamento.`,
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
    if (location.hash !== '#cadastro') return;
    document.getElementById('cadastro')?.scrollIntoView({ block: 'center' });
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
      <section className="captar-hero-rest">
        <div className="captar-hero-mosaic" aria-hidden>
          <img src="/heroLadingPage.png" alt="" />
          <img src="/Beneficios.png" alt="" />
          <img src="/passo 3.png" alt="" />
        </div>
        <div className="captar-hero-rest-inner">
          <div className="captar-hero-copy">
            <h1>Conecte sua loja a quem está com fome agora</h1>
            <p>De comida a gente entende. Entra na Bora Comer! e vende no app com taxa clara.</p>
          </div>
          <div id="cadastro" className="captar-form-card captar-pitch">
            <h2>
              Menos tempo cadastrando.
              <br />
              Mais tempo vendendo.
            </h2>
            <p className="hint">
              Crie sua conta em poucos passos. Seu cardápio e os demais detalhes você configura depois.
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

      <section className="captar-promo">
        <div className="captar-promo-badge">
          {PARTNERSHIP_TRIAL_DAYS} DIAS
          <br />
          DE TRIAL
        </div>
        <div>
          <h2 style={{ textAlign: 'left', marginBottom: 8 }}>Sua loja no app que o cliente já usa</h2>
          <p style={{ color: '#555', margin: '0 0 16px' }}>
            Quem está na Bora Comer! aparece no delivery, recebe pedido no painel e escolhe se a
            entrega é da casa ou da plataforma. Trial da mensalidade para CNPJ novo.
          </p>
          <button type="button" className="captar-btn-solid" onClick={() => openWizard()}>
            Quero aproveitar!
          </button>
        </div>
      </section>

      <section className="captar-stats">
        <div className="captar-stat">
          <strong>
            {PARTNERSHIP_PLANS.store_delivery.platformFeePercent
              .toFixed(2)
              .replace('.', ',')}
            %
          </strong>
          <span>taxa a partir de, no plano com entrega da loja</span>
        </div>
        <div className="captar-stat">
          <strong>R$ {PARTNERSHIP_MONTHLY_FEE.toFixed(2).replace('.', ',')}</strong>
          <span>mensalidade após o trial, com isenção por faturamento</span>
        </div>
        <div className="captar-stat">
          <strong>2</strong>
          <span>modos: sua equipe ou motoboys da Bora Comer!</span>
        </div>
      </section>

      <section className="captar-band" id="vantagens">
        <div className="captar-band-inner">
          <h2>Vantagens de ser uma loja parceira</h2>
          <div className="captar-adv-grid four">
            <button type="button" className="captar-adv-card" onClick={() => openWizard()}>
              <h3>Entrega do seu jeito</h3>
              <p>
                Pedidos do app com a sua equipe, ou com motoboys da rede. WhatsApp da casa continua
                no seu fluxo.
              </p>
              <span className="go">
                Quero ser parceiro <ArrowRight size={16} />
              </span>
            </button>
            <button type="button" className="captar-adv-card" onClick={() => openWizard()}>
              <h3>Gestão no celular</h3>
              <p>Cardápio, pedidos e Stripe Connect no painel. Sem depender de um PDV extra.</p>
              <span className="go">
                Quero ser parceiro <ArrowRight size={16} />
              </span>
            </button>
            <button type="button" className="captar-adv-card" onClick={() => openWizard()}>
              <h3>Boris indica a casa</h3>
              <p>O assistente do delivery recomenda restaurantes da região — sua loja entra nessa lista.</p>
              <span className="go">
                Quero ser parceiro <ArrowRight size={16} />
              </span>
            </button>
            <button type="button" className="captar-adv-card" onClick={() => openWizard()}>
              <h3>Recebimento Stripe</h3>
              <p>Subconta Connect da loja. O cliente paga no app; o dinheiro vai para a sua conta.</p>
              <span className="go">
                Quero ser parceiro <ArrowRight size={16} />
              </span>
            </button>
          </div>
        </div>
      </section>

      <div style={{ textAlign: 'center', padding: '8px 20px 40px' }}>
        <button type="button" className="captar-btn-solid" onClick={() => openWizard()}>
          Cadastrar minha loja
        </button>
      </div>

      <section className="captar-section" id="planos">
        <h2>Conheça nossos planos</h2>
        <div className="captar-plans">
          {Object.values(PARTNERSHIP_PLANS).map((plan) => (
            <article className="captar-plan" key={plan.id}>
              <h3>{plan.id === 'store_delivery' ? 'Entrega da loja' : 'Entrega Bora Comer!'}</h3>
              <div className="rate">
                {plan.platformFeePercent.toString().replace('.', ',')}%
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
                      Conheça seu cardápio digital com link próprio e recursos para organizar os pedidos.
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
                      Conhecer o cardápio digital
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
                  <div className="captar-offer-stage" aria-hidden>
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
                            <strong>{form.restaurantName.trim() || 'Seu restaurante'}</strong>
                            <span>Cardápio digital</span>
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
                    <div className="captar-offer-chip captar-offer-chip-link">
                      <Link2 size={16} />
                      <span>
                        Seu link,
                        <br />
                        sua marca
                      </span>
                    </div>
                    <div className="captar-offer-chip captar-offer-chip-wa">
                      <MessageCircle size={22} />
                    </div>
                    <p className="captar-offer-caption">Uma nova forma de receber seus clientes.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </CaptarLayout>
  );
}
