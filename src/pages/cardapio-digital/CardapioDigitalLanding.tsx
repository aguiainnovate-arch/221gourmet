import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './cardapio-digital.css';
import {
  benefits,
  journey,
  offer,
  partnershipPlans,
  resultsNote,
  storySteps,
  testimonials,
  venues,
  type MenuScene,
} from './content';
import { BuyButton, CheckoutProvider, PhoneFrame, QrMark, StackedPhone, useCheckout } from './ui';
import {
  persistRestaurantSession,
  readPersistedRestaurantId,
  useRestaurantAuth,
} from '../../contexts/RestaurantAuthContext';

function formatPlanPrice(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

type MarketplaceSkipApi = {
  openConfirm: () => void;
};

const MarketplaceSkipContext = createContext<MarketplaceSkipApi | null>(null);

function useMarketplaceSkip(): MarketplaceSkipApi {
  const value = useContext(MarketplaceSkipContext);
  if (!value) {
    throw new Error('useMarketplaceSkip deve ficar dentro de MarketplaceSkipProvider');
  }
  return value;
}

function MarketplaceSkipProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { currentRestaurantId } = useRestaurantAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const api = useMemo(
    () => ({
      openConfirm: () => setConfirmOpen(true),
    }),
    []
  );

  const confirmSkip = () => {
    const id = currentRestaurantId || readPersistedRestaurantId();
    if (id) {
      persistRestaurantSession(id);
      navigate(`/${id}/settings`, { replace: true });
      return;
    }
    navigate('/restaurant/auth', { replace: true });
  };

  return (
    <MarketplaceSkipContext.Provider value={api}>
      {children}
      <MarketplaceSkipModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmSkip}
      />
    </MarketplaceSkipContext.Provider>
  );
}

function MarketplaceSkipModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div className="cd-skip-overlay" role="dialog" aria-modal="true" aria-labelledby="cd-skip-title">
      <button type="button" className="cd-skip-backdrop" aria-label="Fechar" onClick={onClose} />
      <div className="cd-skip-modal">
        <button type="button" className="cd-skip-close" onClick={onClose} aria-label="Fechar">
          <X size={18} />
        </button>
        <p className="cd-kicker">Marketplace</p>
        <h2 id="cd-skip-title" className="cd-display">
          Tem certeza que não quer assinar o Automatic agora?
        </h2>
        <p className="cd-skip-copy">
          Você pode ir direto para o painel do marketplace já logado. O Bora Comer Automatic
          (QR no salão + Boris no WhatsApp) fica disponível depois, quando quiser.
        </p>
        <div className="cd-skip-actions">
          <button type="button" className="cd-btn" onClick={onClose}>
            Continuar olhando o Automatic
          </button>
          <button type="button" className="cd-btn cd-btn-ghost" onClick={onConfirm}>
            Sim, ir para o marketplace
          </button>
        </div>
      </div>
    </div>
  );
}

function MarketplaceSkipLink({ className = '' }: { className?: string }) {
  const { openConfirm } = useMarketplaceSkip();
  return (
    <button type="button" className={`cd-skip-link ${className}`.trim()} onClick={openConfirm}>
      Continuar no marketplace
    </button>
  );
}

gsap.registerPlugin(ScrollTrigger);

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function pageScroller(): HTMLElement {
  const html = document.documentElement;
  const body = document.body;
  if (body.scrollHeight > body.clientHeight && html.scrollHeight <= html.clientHeight) {
    return body;
  }
  return html;
}

function scrollYOf(scroller: HTMLElement) {
  if (scroller === document.documentElement || scroller === document.body) {
    return window.scrollY || scroller.scrollTop;
  }
  return scroller.scrollTop;
}

function MarketplaceSkipFromHero() {
  return (
    <p className="cd-hero-skip">
      Só quer o marketplace? <MarketplaceSkipLink />
    </p>
  );
}

function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return;

    const mm = gsap.matchMedia();
    mm.add('(min-width: 981px) and (prefers-reduced-motion: no-preference)', () => {
      const left = section.querySelector<HTMLElement>('.cd-phone-left');
      const right = section.querySelector<HTMLElement>('.cd-phone-right');
      const center = section.querySelector<HTMLElement>('.cd-phone-center');
      if (!left || !right || !center) return;

      gsap.set(left, { rotation: -14, x: 0, y: 0, opacity: 1 });
      gsap.set(right, { rotation: 12, x: 0, y: 0, opacity: 1 });
      gsap.set(center, { x: 0, y: 0, scale: 1, opacity: 1 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          scroller: pageScroller(),
          start: 'top top',
          end: '+=90%',
          pin: true,
          scrub: 0.6,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });
      tl.to(left, { x: -48, y: -16, rotation: -18, opacity: 0.35 }, 0)
        .to(right, { x: 48, y: 18, rotation: 16, opacity: 0.35 }, 0)
        .to(center, { y: -28, scale: 0.94, opacity: 0.55 }, 0);
    });

    return () => mm.revert();
  }, []);

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (prefersReducedMotion() || window.matchMedia('(max-width: 980px)').matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    gsap.to(stageRef.current, {
      rotateY: x * 12,
      rotateX: -y * 8,
      duration: 0.55,
      ease: 'power2.out',
      transformPerspective: 1100,
    });
  };

  return (
    <section className="cd-hero" ref={sectionRef}>
      <div className="cd-hero-copy">
        <p className="cd-kicker">Bora Comer Automatic</p>
        <h1 className="cd-display">
          Seu cardápio não deveria apenas mostrar produtos.
          <br />
          Ele deveria vender por você.
        </h1>
        <p>Com o Bora Comer Automatic, o salão vira uma experiência moderna, rápida e irresistível para seus clientes.</p>
        <div className="cd-hero-actions">
          <BuyButton>Quero o Bora Comer Automatic</BuyButton>
          <a className="cd-btn cd-btn-ghost" href="#como">
            Ver como funciona
          </a>
        </div>
        <MarketplaceSkipFromHero />
      </div>
      <div className="cd-hero-stage">
        <div className="cd-hero-cluster" ref={stageRef} onPointerMove={onPointerMove}>
          <PhoneFrame scene="product" className="cd-phone-abs cd-phone-left cd-phone-sm" />
          <PhoneFrame scene="home" className="cd-phone-abs cd-phone-center" />
          <PhoneFrame scene="categories" className="cd-phone-abs cd-phone-right cd-phone-sm" />
        </div>
      </div>
    </section>
  );
}

function QrSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const mm = gsap.matchMedia();
    const build = (end: string) => {
      gsap.set('.cd-qr-card', { scale: 0.72, opacity: 0.35 });
      gsap.set('.cd-qr-phone', { x: 80, opacity: 0 });
      gsap.set('.cd-qr-phone .cd-phone-screen', { opacity: 0 });
      gsap.set('.cd-scan', { opacity: 0, top: '18%' });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          scroller: pageScroller(),
          start: 'top top',
          end,
          pin: true,
          scrub: 0.7,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });
      tl.to('.cd-qr-card', { scale: 1, opacity: 1, duration: 0.3 })
        .to('.cd-qr-phone', { x: 0, opacity: 1, duration: 0.3 })
        .to('.cd-scan', { opacity: 1, top: '78%', duration: 0.25 })
        .to('.cd-scan', { opacity: 0, duration: 0.1 })
        .to('.cd-qr-phone .cd-phone-screen', { opacity: 1, duration: 0.25 });
    };

    mm.add('(min-width: 981px) and (prefers-reduced-motion: no-preference)', () => build('+=130%'));
    mm.add('(max-width: 980px) and (prefers-reduced-motion: no-preference)', () => build('+=70%'));

    return () => mm.revert();
  }, []);

  return (
    <section className="cd-qr" id="como" ref={sectionRef}>
      <div className="cd-qr-pin">
        <div>
          <p className="cd-kicker">Na mesa</p>
          <h2 className="cd-display">
            Um QR Code.
            <br />
            Uma experiência completamente nova.
          </h2>
          <p className="cd-qr-lead">
            O cliente aponta a câmera, acessa o cardápio na hora e encontra produtos, categorias, fotos e
            informações. Sem baixar aplicativo.
          </p>
        </div>
        <div className="cd-qr-stage">
          <img className="cd-qr-table" src="/cardapio-digital/mesa-qr.jpg" alt="Mesa de restaurante com QR Code" />
          <div className="cd-qr-card">
            <QrMark />
          </div>
          <PhoneFrame scene="home" className="cd-qr-phone cd-phone-sm" showScan />
        </div>
      </div>
    </section>
  );
}

function layoutTop(el: HTMLElement) {
  let y = 0;
  let node: HTMLElement | null = el;
  while (node) {
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return y;
}

function StorySection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [scene, setScene] = useState<MenuScene>('home');

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    document.body.classList.add('landing-cardapio');

    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      let current: MenuScene = 'home';
      const apply = () => {
        const scroller = pageScroller();
        const distance = section.offsetHeight - window.innerHeight;
        const progress =
          distance <= 0 ? 0 : Math.min(1, Math.max(0, (scrollYOf(scroller) - layoutTop(section)) / distance));
        const next = storySteps[Math.min(storySteps.length - 1, Math.floor(progress * storySteps.length))];
        if (next.scene === current) return;
        current = next.scene;
        setScene(next.scene);
      };
      const scroller = pageScroller();
      scroller.addEventListener('scroll', apply, { passive: true });
      window.addEventListener('scroll', apply, { passive: true });
      apply();
      return () => {
        scroller.removeEventListener('scroll', apply);
        window.removeEventListener('scroll', apply);
      };
    });

    return () => mm.revert();
  }, []);

  const jump = (index: number) => {
    const step = storySteps[index];
    const section = sectionRef.current;
    if (!section || prefersReducedMotion()) {
      setScene(step.scene);
      return;
    }
    const scroller = document.scrollingElement || document.documentElement;
    const sectionTop = layoutTop(section);
    const distance = Math.max(0, section.offsetHeight - window.innerHeight);
    const top = sectionTop + distance * ((index + 0.45) / storySteps.length);
    scroller.scrollTo({ top, behavior: 'smooth' });
  };

  return (
    <section className="cd-story" ref={sectionRef}>
      <div className="cd-story-sticky">
        <div>
          <p className="cd-kicker">Conheça o Automatic</p>
          <div className="cd-story-copy">
            {storySteps.map((step) => (
              <div key={step.scene} className={`cd-story-pane${step.scene === scene ? ' is-on' : ''}`}>
                <span className="cd-kicker">{step.index}</span>
                <h2 className="cd-display">{step.title}</h2>
                <p>{step.text}</p>
              </div>
            ))}
          </div>
          <div className="cd-steps">
            {storySteps.map((step, index) => (
              <button
                key={step.scene}
                type="button"
                className={step.scene === scene ? 'is-on' : ''}
                onClick={() => jump(index)}
                aria-label={step.title}
              >
                {step.index}
              </button>
            ))}
          </div>
        </div>
        <StackedPhone scene={scene} />
      </div>
    </section>
  );
}

function DesireSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!section || !viewport || !track) return;

    const mm = gsap.matchMedia();
    mm.add('(min-width: 1024px)', () => {
      if (prefersReducedMotion()) return;
      const getOverflow = () => Math.max(0, track.scrollWidth - viewport.clientWidth);
      const tween = gsap.to(track, {
        x: () => -getOverflow(),
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          scroller: pageScroller(),
          start: 'top top',
          end: () => `+=${Math.max(window.innerHeight * 2.4, getOverflow())}`,
          pin: true,
          scrub: 0.6,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });
      return () => {
        tween.scrollTrigger?.kill();
        tween.kill();
      };
    });

    return () => mm.revert();
  }, []);

  return (
    <section className="cd-desire" ref={sectionRef}>
      <div className="cd-desire-head">
        <p className="cd-kicker">Feito para causar desejo</p>
        <h2 className="cd-display">Seu produto merece ser apresentado assim.</h2>
      </div>
      <div className="cd-desire-viewport" ref={viewportRef}>
        <div className="cd-desire-track" ref={trackRef}>
          {venues.map((venue) => (
            <article className="cd-venue" key={venue.id}>
              <figure>
                <img src={venue.image} alt={`${venue.name}: ${venue.dish}`} />
                <figcaption>
                  <strong>{venue.name}</strong>
                  <em>
                    {venue.dish}
                    <br />
                    {venue.price}
                  </em>
                </figcaption>
              </figure>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function BenefitsSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.cd-benefit').forEach((item) => {
        gsap.from(item, {
          y: 24,
          opacity: 0,
          duration: 0.7,
          ease: 'power2.out',
          scrollTrigger: { trigger: item, scroller: pageScroller(), start: 'top 88%' },
        });
      });
    }, section);
    return () => ctx.revert();
  }, []);

  return (
    <section className="cd-section" ref={sectionRef}>
      <div className="cd-benefits">
        <h2 className="cd-display">O que muda no salão.</h2>
        <div>
          {benefits.map((item) => (
            <article className="cd-benefit" key={item.index}>
              <span>{item.index}</span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            </article>
          ))}
          <div className="cd-mid-cta">
            <BuyButton>Quero o Bora Comer Automatic</BuyButton>
          </div>
        </div>
      </div>
    </section>
  );
}

function CompareSection() {
  const frameRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(54);

  const move = (clientX: number) => {
    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    const next = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.min(88, Math.max(12, next)));
  };

  return (
    <section className="cd-section">
      <div className="cd-compare-head">
        <p className="cd-kicker">Antes e depois</p>
        <h2 className="cd-display">Existe uma diferença entre mostrar seu cardápio e apresentar sua marca.</h2>
      </div>
      <div
        className="cd-compare"
        ref={frameRef}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          move(event.clientX);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) move(event.clientX);
        }}
      >
        <div className="cd-compare-before">
          <img src="/cardapio-digital/cardapio-papel.jpg" alt="Cardápio impresso, pouco atraente" />
          <span className="cd-tag cd-tag-before">Antes</span>
        </div>
        <div className="cd-compare-after" style={{ clipPath: `inset(0 0 0 ${pos}%)` }}>
          <PhoneFrame scene="product" />
          <span className="cd-tag cd-tag-after">Depois</span>
        </div>
        <div className="cd-handle" style={{ left: `${pos}%` }}>
          <i>↔</i>
        </div>
      </div>
    </section>
  );
}

function JourneySection() {
  const sectionRef = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const bar = barRef.current;
    if (!section || !bar || prefersReducedMotion()) {
      if (bar) bar.style.width = '100%';
      return;
    }
    const ctx = gsap.context(() => {
      gsap.fromTo(
        bar,
        { width: '0%' },
        {
          width: '100%',
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            scroller: pageScroller(),
            start: 'top 70%',
            end: 'bottom 60%',
            scrub: 0.4,
          },
        }
      );
    }, section);
    return () => ctx.revert();
  }, []);

  return (
    <section className="cd-section" ref={sectionRef}>
      <div className="cd-journey-head">
        <p className="cd-kicker">Experiência do cliente</p>
        <h2 className="cd-display">Do QR ao pedido, em quatro gestos.</h2>
      </div>
      <div className="cd-journey-line" aria-hidden="true">
        <b ref={barRef} />
      </div>
      <div className="cd-journey-grid">
        {journey.map((step) => (
          <article key={step.index}>
            <span>{step.index}</span>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function SocialSection() {
  return (
    <section className="cd-section">
      <div className="cd-social-head">
        <div>
          <p className="cd-kicker">Prova social</p>
          <h2 className="cd-display">Quem já colocou a marca na mesa.</h2>
        </div>
      </div>
      <div className="cd-quotes">
        {testimonials.map((item) => (
          <article className="cd-quote" key={item.id}>
            <p>{item.quote}</p>
            <span>{item.place}</span>
          </article>
        ))}
      </div>
      <p className="cd-note">{resultsNote}</p>
    </section>
  );
}

function PlansSection() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual');

  return (
    <section className="cd-section cd-plans" id="planos">
      <div className="cd-plans-head">
        <p className="cd-kicker">Planos de parceria</p>
        <h2 className="cd-display">Escolha como o Bora Comer cresce com a sua loja.</h2>
        <p className="cd-plans-lead">
          Do essencial no marketplace até o Boris no WhatsApp e a operação completa. O Automatic de
          QR + IA encaixa no plano Pro e Max.
        </p>
        <div className="cd-plans-billing" role="group" aria-label="Ciclo de cobrança">
          <button
            type="button"
            className={billing === 'monthly' ? 'is-on' : ''}
            onClick={() => setBilling('monthly')}
          >
            Mensal
          </button>
          <button
            type="button"
            className={billing === 'annual' ? 'is-on' : ''}
            onClick={() => setBilling('annual')}
          >
            Anual
            <span>Economize</span>
          </button>
        </div>
      </div>

      <div className="cd-plans-grid">
        {partnershipPlans.map((plan) => {
          const price = billing === 'annual' ? plan.annualMonthly : plan.monthly;
          return (
            <article
              key={plan.id}
              className={`cd-plan-card${plan.featured ? ' is-featured' : ''}`}
            >
              {plan.featured ? <p className="cd-plan-badge">Mais escolhido</p> : null}
              <header className="cd-plan-top">
                <h3>{plan.name}</h3>
                <p>{plan.tagline}</p>
              </header>
              <p className="cd-plan-price">
                {formatPlanPrice(price)}
                <span>/mês</span>
              </p>
              <p className="cd-plan-save">
                {billing === 'annual'
                  ? `no plano anual · economize ${plan.savePercent}%`
                  : `ou ${formatPlanPrice(plan.annualMonthly)}/mês no anual`}
              </p>
              <div className="cd-plan-visual">
                <img src={plan.visual} alt="" />
              </div>
              {plan.featuresIntro ? (
                <p className="cd-plan-intro">{plan.featuresIntro}</p>
              ) : null}
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <Check size={14} strokeWidth={2.5} aria-hidden />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                className={`cd-btn ${plan.featured ? '' : 'cd-btn-ghost'}`}
                to={`/planos?plano=${plan.id}&ciclo=${billing}`}
              >
                {plan.cta}
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function OfferSection() {
  const { note } = useCheckout();
  return (
    <section className="cd-section" id="oferta">
      <div className="cd-offer">
        <div>
          <p className="cd-kicker">Oferta Automatic</p>
          <h2 className="cd-display">Pronto para colocar o Bora Comer Automatic no salão?</h2>
        </div>
        <div className="cd-offer-card">
          <p className="cd-price">
            {offer.priceLabel}
            <span className="cd-price-period">{offer.times}</span>
          </p>
          <p className="cd-note" style={{ marginTop: 8 }}>
            {offer.payment}
          </p>
          <p className="cd-note cd-offer-annual">{offer.annual}</p>
          <ul>
            {offer.included.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="cd-guarantee">{offer.guarantee}</p>
          <BuyButton>Quero o Bora Comer Automatic</BuyButton>
          {note && <p className="cd-note">{note}</p>}
        </div>
      </div>
    </section>
  );
}

function Finale() {
  const sectionRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.cd-float').forEach((item, index) => {
        gsap.to(item, {
          y: index % 2 === 0 ? -36 : 28,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            scroller: pageScroller(),
            start: 'top bottom',
            end: 'bottom top',
            scrub: 0.6,
          },
        });
      });
    }, section);
    return () => ctx.revert();
  }, []);

  return (
    <section className="cd-finale" ref={sectionRef}>
      <img className="cd-float cd-float-a" src="/cardapio-digital/burger.jpg" alt="" />
      <img className="cd-float cd-float-b" src="/cardapio-digital/pizza.jpg" alt="" />
      <img className="cd-float cd-float-c" src="/cardapio-digital/coffee.jpg" alt="" />
      <img className="cd-float cd-float-d" src="/cardapio-digital/sushi.jpg" alt="" />
      <div className="cd-finale-phone">
        <PhoneFrame scene="product" className="cd-phone-lg" />
      </div>
      <h2 className="cd-display">Seu próximo cliente já está com o celular na mão.</h2>
      <p className="cd-sub">Agora só falta colocar sua marca na tela dele.</p>
      <BuyButton>Criar meu Bora Comer Automatic</BuyButton>
    </section>
  );
}

function MarketplaceEscapeBand() {
  return (
    <section className="cd-section cd-escape" aria-label="Ir para o marketplace">
      <div className="cd-escape-card">
        <div>
          <p className="cd-kicker">Só o marketplace</p>
          <h2 className="cd-display">Olhou o Automatic e prefere só o app de delivery?</h2>
          <p>
            Sem problema. Você pode seguir para o painel do marketplace já logado, como no fim do
            cadastro. O Automatic continua disponível quando fizer sentido.
          </p>
        </div>
        <div className="cd-escape-actions">
          <MarketplaceSkipLink className="cd-escape-btn" />
          <a className="cd-btn" href="#planos">
            Ver planos primeiro
          </a>
        </div>
      </div>
    </section>
  );
}

function Shell() {
  const { note } = useCheckout();

  return (
    <MarketplaceSkipProvider>
      <div className="cd-root">
        <div className="cd-grain" aria-hidden="true" />
        <header className="cd-header">
          <span className="cd-mark">Bora Comer Automatic</span>
          <div className="cd-header-actions">
            <a className="cd-header-link" href="#planos">
              Planos
            </a>
            <MarketplaceSkipLink />
            <BuyButton>Quero o Bora Comer Automatic</BuyButton>
          </div>
        </header>
        <main>
          <Hero />
          <QrSection />
          <StorySection />
          <DesireSection />
          <BenefitsSection />
          <CompareSection />
          <MarketplaceEscapeBand />
          <JourneySection />
          <SocialSection />
          <PlansSection />
          <OfferSection />
          <Finale />
        </main>
        <footer className="cd-footer">
          <Link to="/delivery" className="cd-footer-logo" aria-label="Bora Comer!">
            <img src="/BoraComerlogo.png" alt="Bora Comer!" />
          </Link>
          <div className="cd-footer-meta">
            <span>{note ?? 'Mensal ou plano anual'}</span>
            <MarketplaceSkipLink />
          </div>
        </footer>
      </div>
    </MarketplaceSkipProvider>
  );
}

export default function CardapioDigitalLanding() {
  useLayoutEffect(() => {
    document.title = 'Bora Comer Automatic';
    document.body.classList.add('landing-cardapio');
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap';
    document.head.appendChild(link);
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener('load', refresh);
    const timer = window.setTimeout(refresh, 400);
    return () => {
      document.body.classList.remove('landing-cardapio');
      link.remove();
      window.removeEventListener('load', refresh);
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <CheckoutProvider>
      <Shell />
    </CheckoutProvider>
  );
}
