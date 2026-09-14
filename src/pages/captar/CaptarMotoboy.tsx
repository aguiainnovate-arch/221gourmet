import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, X } from 'lucide-react';
import { submitMotoboyLead, type MotoboyLeadPayload } from '../../services/motoboyLeadService';
import {
  CaptarFaq,
  CaptarLayout,
  CaptarSheet,
  formatPhone,
} from './CaptarShared';

const initial: MotoboyLeadPayload = {
  name: '',
  email: '',
  phone: '',
  cityState: '',
  vehicleInfo: '',
  hasCnh: false,
  notes: '',
};

const FAQ = [
  {
    q: 'Preciso ser CLT da plataforma?',
    a: 'Não. O cadastro é para atuar nas corridas da Bora Comer! como motoboy parceiro, com análise de documentos e cidade de atuação.',
  },
  {
    q: 'Que veículo posso usar?',
    a: 'Moto é o padrão. Informe modelo e placa (se tiver) no cadastro. Bicicleta só entra se a operação da cidade aceitar.',
  },
  {
    q: 'Como recebo as corridas?',
    a: 'Depois da aprovação você entra no app de delivery como motoboy, fica online no painel e aceita pedidos da malha da plataforma.',
  },
  {
    q: 'Tem taxa para me cadastrar?',
    a: 'Não cobramos para enviar o cadastro. Ganhos vêm das entregas feitas após a aprovação.',
  },
];

export default function CaptarMotoboy() {
  const [wizard, setWizard] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<MotoboyLeadPayload>(initial);
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    document.title = 'Seja motoboy — Bora Comer!';
  }, []);

  const can1 = form.email.trim().includes('@');
  const can2 = useMemo(
    () => Boolean(form.name.trim() && form.phone.trim() && form.cityState.trim() && form.vehicleInfo.trim()),
    [form]
  );

  function openWizard(email?: string) {
    if (email) setForm((p) => ({ ...p, email }));
    setWizard(true);
    setStep(email && email.includes('@') ? 2 : 1);
    setStatus('idle');
    setMessage('');
  }

  function onHero(e: FormEvent) {
    e.preventDefault();
    if (!can1) return;
    setWizard(true);
    setStep(2);
  }

  async function submitAll() {
    setStatus('sending');
    try {
      await submitMotoboyLead(form);
      setStatus('success');
      setStep(3);
      setMessage('Cadastro na fila. A operação confirma e libera o acesso ao painel de motoboy.');
    } catch {
      setStatus('error');
      setMessage('Não foi possível enviar agora. Tente de novo em instantes.');
    }
  }

  const progress = step >= 3 ? 100 : (step / 2) * 100;

  return (
    <CaptarLayout
      variant="motoboy"
      onCadastrar={() => openWizard()}
      sheet={
        wizard ? null : (
          <CaptarSheet
            title="Quer entregar com a Bora Comer!?"
            subtitle="Informe o e-mail e a gente abre o cadastro de motoboy."
            onStart={(email) => openWizard(email)}
            cta="Quero entregar"
          />
        )
      }
    >
      <section className="captar-hero-rest" style={{ background: '#7a3a0d' }}>
        <div className="captar-hero-mosaic" aria-hidden>
          <img src="/passo 3.png" alt="" />
          <img src="/passo 2.png" alt="" />
          <img src="/heroLadingPage.png" alt="" />
        </div>
        <div className="captar-hero-rest-inner">
          <div className="captar-hero-copy">
            <h1>Saia para entregar e feche a malha da cidade</h1>
            <p>Cadastro livre, análise rápida e corridas do app Bora Comer! no seu bolso.</p>
          </div>
          <form className="captar-form-card" onSubmit={onHero}>
            <h2>Cadastre-se como motoboy</h2>
            <p className="hint">Começa pelo e-mail. Depois cidade, veículo e telefone.</p>
            <label htmlFor="moto-email">E-mail*</label>
            <input
              id="moto-email"
              className="captar-input"
              type="email"
              required
              placeholder="email@email.com.br"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
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
          CORRIDAS
          <br />
          NO APP
        </div>
        <div>
          <h2 style={{ textAlign: 'left', marginBottom: 8 }}>Flexível para quem vive de entrega</h2>
          <p style={{ color: '#555', margin: '0 0 16px' }}>
            Fica online quando puder, aceita pedidos da plataforma e usa o mesmo app de delivery
            que o cliente já conhece.
          </p>
          <button type="button" className="captar-btn-solid" onClick={() => openWizard()}>
            Quero aproveitar!
          </button>
        </div>
      </section>

      <section className="captar-stats">
        <div className="captar-stat">
          <strong>Online</strong>
          <span>você liga e desliga no painel de motoboy</span>
        </div>
        <div className="captar-stat">
          <strong>App</strong>
          <span>aceita, recusa e conclui a corrida no celular</span>
        </div>
        <div className="captar-stat">
          <strong>Fila</strong>
          <span>cadastro analisado pela operação antes de rodar</span>
        </div>
      </section>

      <section className="captar-band" id="vantagens">
        <div className="captar-band-inner">
          <h2>Por que entregar com a gente</h2>
          <div className="captar-adv-grid four">
            <button type="button" className="captar-adv-card" onClick={() => openWizard()}>
              <h3>Corridas da rede</h3>
              <p>Pedidos de lojas que escolheram entrega Bora Comer! caem para quem está online.</p>
              <span className="go">
                Quero entregar <ArrowRight size={16} />
              </span>
            </button>
            <button type="button" className="captar-adv-card" onClick={() => openWizard()}>
              <h3>Painel simples</h3>
              <p>Aceitar, recusar, histórico e financeiro do dia no Motoboy Dashboard.</p>
              <span className="go">
                Quero entregar <ArrowRight size={16} />
              </span>
            </button>
            <button type="button" className="captar-adv-card" onClick={() => openWizard()}>
              <h3>Cidade na ficha</h3>
              <p>Você diz onde atua. A loja não precisa te cadastrar na mão.</p>
              <span className="go">
                Quero entregar <ArrowRight size={16} />
              </span>
            </button>
            <button type="button" className="captar-adv-card" onClick={() => openWizard()}>
              <h3>Sem taxa de entrada</h3>
              <p>O lead é grátis. Ganhos vêm das entregas depois da aprovação.</p>
              <span className="go">
                Quero entregar <ArrowRight size={16} />
              </span>
            </button>
          </div>
        </div>
      </section>

      <section className="captar-section" id="passos">
        <h2>Como começar a entregar</h2>
        <div className="captar-steps">
          <article className="captar-step">
            <div className="n">1</div>
            <h3>Envie e-mail, telefone e veículo</h3>
            <p>Dados reais. CNH marcada se você já tiver.</p>
          </article>
          <article className="captar-step">
            <div className="n">2</div>
            <h3>Espere a operação aprovar</h3>
            <p>O time vê o lead no painel admin, separado da lista de clientes.</p>
          </article>
          <article className="captar-step">
            <div className="n">3</div>
            <h3>Entre no app e fique online</h3>
            <p>Login de delivery, perfil de motoboy e corridas da malha.</p>
          </article>
        </div>
      </section>

      <CaptarFaq items={FAQ} />

      {wizard && (
        <div className="captar-modal" role="dialog" aria-modal="true">
          <div className="captar-modal-card">
            <button
              type="button"
              className="captar-sheet-dismiss"
              onClick={() => setWizard(false)}
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
            <h2 style={{ fontSize: 20, marginTop: 0 }}>Cadastro de motoboy</h2>
            <div className="captar-progress">
              <span style={{ width: `${progress}%` }} />
            </div>

            {step === 1 && (
              <>
                <div className="captar-field">
                  <label>E-mail*</label>
                  <input
                    className="captar-input"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  />
                </div>
                <button
                  type="button"
                  className="captar-btn-solid captar-btn-lg"
                  disabled={!can1}
                  onClick={() => setStep(2)}
                >
                  Continuar
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <div className="captar-field">
                  <label>Nome completo*</label>
                  <input
                    className="captar-input"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div className="captar-field">
                  <label>Telefone / WhatsApp*</label>
                  <input
                    className="captar-input"
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: formatPhone(e.target.value) }))}
                  />
                </div>
                <div className="captar-field">
                  <label>Cidade / UF*</label>
                  <input
                    className="captar-input"
                    value={form.cityState}
                    onChange={(e) => setForm((p) => ({ ...p, cityState: e.target.value }))}
                  />
                </div>
                <div className="captar-field">
                  <label>Veículo (modelo / placa)*</label>
                  <input
                    className="captar-input"
                    value={form.vehicleInfo}
                    onChange={(e) => setForm((p) => ({ ...p, vehicleInfo: e.target.value }))}
                  />
                </div>
                <label className="captar-check">
                  <input
                    type="checkbox"
                    checked={form.hasCnh}
                    onChange={(e) => setForm((p) => ({ ...p, hasCnh: e.target.checked }))}
                  />
                  Tenho CNH válida para o veículo informado
                </label>
                <div className="captar-field">
                  <label>Observação</label>
                  <textarea
                    className="captar-input"
                    rows={2}
                    value={form.notes}
                    onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  />
                </div>
                {status === 'error' && <p style={{ color: '#c40d1a' }}>{message}</p>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="captar-btn-ghost" onClick={() => setStep(1)}>
                    Voltar
                  </button>
                  <button
                    type="button"
                    className="captar-btn-solid captar-btn-lg"
                    disabled={!can2 || status === 'sending'}
                    onClick={() => void submitAll()}
                  >
                    {status === 'sending' ? 'Enviando…' : 'Enviar cadastro'}
                  </button>
                </div>
              </>
            )}

            {step === 3 && (
              <div className="captar-success">
                <h3>Cadastro enviado</h3>
                <p>{message}</p>
                <Link className="captar-btn-solid captar-btn-lg" to="/delivery/auth" style={{ marginTop: 12 }}>
                  Ir para o login
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </CaptarLayout>
  );
}
