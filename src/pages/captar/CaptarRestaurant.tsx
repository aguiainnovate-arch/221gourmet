import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, X } from 'lucide-react';
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
  formatCnpj,
  formatPhone,
} from './CaptarShared';

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
    a: 'E-mail, celular, nome do responsável, CNPJ, endereço e um resumo da cozinha. Depois você escolhe o plano e conclui o Stripe Connect para receber online.',
  },
  {
    q: 'É necessário ter CNPJ?',
    a: 'Sim. O cadastro da loja usa CNPJ para contrato, nota e recebimento Stripe.',
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
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [provision, setProvision] = useState<{
    restaurantId: string;
    domain: string;
    temporaryPassword: string;
  } | null>(null);
  const [openPlan, setOpenPlan] = useState<string | null>('store_delivery');

  useEffect(() => {
    document.title = 'Cadastre seu restaurante — Bora Comer!';
  }, []);

  const canStep1 = form.email.trim().includes('@');
  const canStep2 = form.ownerName.trim() && form.phone.trim() && form.whatsapp.trim();
  const canStep3 = useMemo(
    () =>
      Boolean(
        form.restaurantName.trim() &&
          form.cnpj.trim() &&
          form.address.trim() &&
          form.cityState.trim() &&
          form.cuisineType.trim() &&
          form.openingHours.trim() &&
          form.priceRange.trim() &&
          form.description.trim()
      ),
    [form]
  );

  function setField<K extends keyof RestaurantLeadPayload>(key: K, value: string) {
    if (key === 'phone' || key === 'whatsapp') {
      setForm((p) => ({ ...p, [key]: formatPhone(value) }));
      return;
    }
    if (key === 'cnpj') {
      setForm((p) => ({ ...p, cnpj: formatCnpj(value) }));
      return;
    }
    setForm((p) => ({ ...p, [key]: value }));
  }

  function openWizard(email?: string) {
    if (email) setForm((p) => ({ ...p, email }));
    setWizard(true);
    setStep(email && email.includes('@') ? 2 : 1);
    setStatus('idle');
    setMessage('');
  }

  async function submitAll() {
    setStatus('sending');
    setMessage('');
    try {
      const res = await submitRestaurantLead(form);
      setStatus('success');
      setStep(4);
      if (res.restaurantProvisioned) setProvision(res.restaurantProvisioned);
      else if (res.awaitingManualModeration) {
        setMessage('Recebemos seu cadastro. A equipe confirma os dados e libera o acesso.');
      } else {
        setMessage('Cadastro enviado. Você recebe o próximo passo no e-mail informado.');
      }
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
        setMessage('Não foi possível concluir agora. Tente de novo em instantes.');
      }
    }
  }

  function onHeroSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canStep1) return;
    setWizard(true);
    setStep(2);
  }

  const progress = step >= 4 ? 100 : (step / 3) * 100;

  return (
    <CaptarLayout
      variant="restaurante"
      onCadastrar={() => openWizard()}
      sheet={
        wizard ? null : (
          <CaptarSheet
            title="Sua loja na Bora Comer! começa aqui"
            subtitle={`Cadastre-se e use ${PARTNERSHIP_TRIAL_DAYS} dias de trial da mensalidade. Informe o e-mail para começar.`}
            onStart={(email) => openWizard(email)}
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
          <form className="captar-form-card" onSubmit={onHeroSubmit}>
            <h2>Cadastre sua cozinha</h2>
            <p className="hint">
              Entre e ganhe {PARTNERSHIP_TRIAL_DAYS} dias de mensalidade em trial.
            </p>
            <label htmlFor="captar-email">E-mail*</label>
            <input
              id="captar-email"
              className="captar-input"
              type="email"
              required
              placeholder="email@email.com.br"
              value={form.email}
              onChange={(e) => setField('email', e.target.value)}
            />
            <button className="captar-btn-solid captar-btn-lg" type="submit" style={{ marginTop: 14 }}>
              Cadastrar agora
            </button>
            <p className="captar-legal">
              Ao continuar, você concorda em receber comunicações da Bora Comer!. Confira nossa{' '}
              <Link to="/privacy-policy">Declaração de Privacidade</Link>.
            </p>
          </form>
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
            <h3>Crie a conta e cadastre a loja com CNPJ</h3>
            <p>Nome, e-mail e celular seus. Da loja: CNPJ, endereço e um resumo da cozinha.</p>
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
          <div className="captar-modal-card">
            <button
              type="button"
              className="captar-sheet-dismiss"
              onClick={() => setWizard(false)}
              aria-label="Fechar cadastro"
            >
              <X size={18} />
            </button>
            <h2 id="wiz-title" style={{ margin: '0 8px 0 0', fontSize: 20 }}>
              {step < 4 ? 'Cadastro da loja' : 'Pronto'}
            </h2>
            <div className="captar-progress">
              <span style={{ width: `${progress}%` }} />
            </div>

            {step === 1 && (
              <>
                <Field label="E-mail*">
                  <input
                    className="captar-input"
                    type="email"
                    value={form.email}
                    onChange={(e) => setField('email', e.target.value)}
                  />
                </Field>
                <button
                  type="button"
                  className="captar-btn-solid captar-btn-lg"
                  disabled={!canStep1}
                  onClick={() => setStep(2)}
                >
                  Continuar
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <Field label="Nome do responsável*">
                  <input
                    className="captar-input"
                    value={form.ownerName}
                    onChange={(e) => setField('ownerName', e.target.value)}
                  />
                </Field>
                <Field label="Telefone*">
                  <input
                    className="captar-input"
                    value={form.phone}
                    onChange={(e) => setField('phone', e.target.value)}
                  />
                </Field>
                <Field label="WhatsApp*">
                  <input
                    className="captar-input"
                    value={form.whatsapp}
                    onChange={(e) => setField('whatsapp', e.target.value)}
                  />
                </Field>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="captar-btn-ghost" onClick={() => setStep(1)}>
                    Voltar
                  </button>
                  <button
                    type="button"
                    className="captar-btn-solid captar-btn-lg"
                    disabled={!canStep2}
                    onClick={() => setStep(3)}
                  >
                    Continuar
                  </button>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <Field label="Nome da loja*">
                  <input
                    className="captar-input"
                    value={form.restaurantName}
                    onChange={(e) => setField('restaurantName', e.target.value)}
                  />
                </Field>
                <Field label="CNPJ*">
                  <input
                    className="captar-input"
                    value={form.cnpj}
                    onChange={(e) => setField('cnpj', e.target.value)}
                  />
                </Field>
                <Field label="Endereço*">
                  <input
                    className="captar-input"
                    value={form.address}
                    onChange={(e) => setField('address', e.target.value)}
                  />
                </Field>
                <Field label="Cidade / UF*">
                  <input
                    className="captar-input"
                    value={form.cityState}
                    onChange={(e) => setField('cityState', e.target.value)}
                  />
                </Field>
                <Field label="Tipo de cozinha*">
                  <input
                    className="captar-input"
                    value={form.cuisineType}
                    onChange={(e) => setField('cuisineType', e.target.value)}
                  />
                </Field>
                <Field label="Horário*">
                  <input
                    className="captar-input"
                    value={form.openingHours}
                    onChange={(e) => setField('openingHours', e.target.value)}
                  />
                </Field>
                <Field label="Faixa de preço*">
                  <input
                    className="captar-input"
                    value={form.priceRange}
                    onChange={(e) => setField('priceRange', e.target.value)}
                  />
                </Field>
                <Field label="Link (Instagram ou site)">
                  <input
                    className="captar-input"
                    value={form.socialLink}
                    onChange={(e) => setField('socialLink', e.target.value)}
                  />
                </Field>
                <Field label="Conte um pouco da casa*">
                  <textarea
                    className="captar-input"
                    rows={3}
                    value={form.description}
                    onChange={(e) => setField('description', e.target.value)}
                  />
                </Field>
                {status === 'error' && (
                  <p style={{ color: '#c40d1a', fontSize: 14 }}>{message}</p>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="captar-btn-ghost" onClick={() => setStep(2)}>
                    Voltar
                  </button>
                  <button
                    type="button"
                    className="captar-btn-solid captar-btn-lg"
                    disabled={!canStep3 || status === 'sending'}
                    onClick={() => void submitAll()}
                  >
                    {status === 'sending' ? 'Enviando…' : 'Enviar cadastro'}
                  </button>
                </div>
              </>
            )}

            {step === 4 && (
              <div className="captar-success">
                <h3>Cadastro enviado</h3>
                <p>{message || 'Recebemos seus dados.'}</p>
                {provision && (
                  <p style={{ fontSize: 14 }}>
                    Loja <strong>{provision.domain}</strong>
                    <br />
                    Senha temporária: <strong>{provision.temporaryPassword}</strong>
                  </p>
                )}
                <Link className="captar-btn-solid captar-btn-lg" to="/restaurant/auth" style={{ marginTop: 12 }}>
                  Ir para o portal
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </CaptarLayout>
  );
}
