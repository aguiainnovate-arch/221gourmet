import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { CaptarFaq, CaptarLayout, CaptarSheet } from './CaptarShared';

const CHIPS = [
  { label: 'Brasileira', img: '/captar/chip-brasileira.png?v=2' },
  { label: 'Doces e bolos', img: '/captar/chip-doces.png?v=2' },
  { label: 'Lanches', img: '/captar/chip-lanches.png?v=2' },
  { label: 'Açaí', img: '/captar/chip-acai.png?v=2' },
  { label: 'Marmita', img: '/captar/chip-marmita.png?v=2' },
  { label: 'Pizzarias', img: '/captar/chip-pizza.png?v=2' },
  { label: 'Salgados', img: '/captar/chip-salgados.png?v=2' },
  { label: 'Saudável', img: '/captar/chip-saudavel.png?v=2' },
  { label: 'Sorvetes', img: '/captar/chip-sorvetes.png?v=2' },
  { label: 'Japonesa', img: '/captar/chip-japonesa.png?v=2' },
];

const FAQ = [
  {
    q: 'O que é a Bora Comer!?',
    a: 'É o app de pedidos e delivery da nossa operação: o cliente pede, o restaurante recebe no painel e o motoboy entrega. Também tem o assistente Boris para indicar restaurantes.',
  },
  {
    q: 'Serve para o meu negócio?',
    a: 'Sim, se você tem CNPJ de alimentação e quer vender no app. Motoboys com veículo e disponibilidade na cidade também podem se cadastrar.',
  },
  {
    q: 'Como acesso o portal?',
    a: 'Restaurante entra em /restaurant/auth com o e-mail da loja. Motoboy entra pelo login de delivery. Depois do cadastro aprovado você recebe os dados de acesso.',
  },
  {
    q: 'Como peço ajuda?',
    a: 'Use as perguntas desta página ou fale com o time depois que o cadastro entrar na fila. O painel Owner vê restaurantes e motoboys pendentes.',
  },
];

export default function CaptarHub() {
  const navigate = useNavigate();

  return (
    <CaptarLayout
      variant="hub"
      onCadastrar={() => navigate('/captar/restaurante')}
      sheet={
        <CaptarSheet
          title="Seu lugar na Bora Comer! começa aqui"
          subtitle="Informe o e-mail para iniciar o cadastro de restaurante. Motoboys usam o card Motoboys."
          onStart={(email) => {
            navigate('/captar/restaurante', { state: { email, openWizard: true } });
          }}
        />
      }
    >
      <section className="captar-hero-hub" id="como">
        <h1>Cadastre sua loja e comece a vender na Bora Comer!</h1>
        <p className="lead">Tem Bora Comer! para todo tipo de negócio — e também para quem entrega.</p>

        <div className="captar-type-grid">
          <Link to="/captar/restaurante" className="captar-type-card restaurante">
            <div className="captar-type-copy">
              <h2>Restaurantes</h2>
              <span className="captar-type-cta">Cadastrar agora</span>
            </div>
            <img className="main" src="/captar/burger.png?v=2" alt="" />
            <img className="sat sat-a" src="/captar/sat-pizza.png?v=2" alt="" />
            <img className="sat sat-b" src="/captar/sat-tomato.png?v=2" alt="" />
            <img className="sat sat-c" src="/captar/sat-lettuce.png?v=2" alt="" />
            <img className="sat sat-d" src="/captar/sat-soda.png?v=2" alt="" />
          </Link>

          <Link to="/captar/motoboy" className="captar-type-card motoboy">
            <div className="captar-type-copy">
              <h2>Motoboys</h2>
              <span className="captar-type-cta">Cadastrar agora</span>
            </div>
            <img className="main" src="/captar/motoboy-bag.png?v=2" alt="" />
            <img className="sat sat-a" src="/captar/sat-helmet.png?v=2" alt="" />
            <img className="sat sat-b" src="/captar/sat-phone.png?v=2" alt="" />
            <img className="sat sat-c" src="/captar/sat-keys.png?v=2" alt="" />
            <img className="sat sat-d" src="/captar/sat-gloves.png?v=2" alt="" />
          </Link>
        </div>

        <p className="captar-chips-title">Ideal para qualquer tamanho e segmento</p>
        <div className="captar-chips">
          {CHIPS.map((c) => (
            <div className="captar-chip" key={c.label}>
              <span>{c.label}</span>
              <img src={c.img} alt="" />
            </div>
          ))}
        </div>
      </section>

      <section className="captar-band" id="vantagens">
        <div className="captar-band-inner">
          <h2>Vantagens de quem entra com a Bora Comer!</h2>
          <div className="captar-adv-grid two">
            <Link to="/captar/restaurante" className="captar-adv-card">
              <div aria-hidden>🍽️</div>
              <h3>Gestão simples e fácil</h3>
              <p>Pedidos, cardápio e status da loja num painel só — no celular, sem depender de várias telas.</p>
              <span className="go">
                Quero ser parceiro <ArrowRight size={16} />
              </span>
            </Link>
            <Link to="/captar/motoboy" className="captar-adv-card">
              <div aria-hidden>🛵</div>
              <h3>Entrega com motoboys da rede</h3>
              <p>A loja vende; quem quiser entregar se cadastra aqui e aparece no fluxo de corridas da plataforma.</p>
              <span className="go">
                Quero entregar <ArrowRight size={16} />
              </span>
            </Link>
          </div>
        </div>
      </section>

      <CaptarFaq items={FAQ} />
    </CaptarLayout>
  );
}
