import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Clock3,
  HandCoins,
  LineChart,
  Mail,
  MapPinned,
  Phone,
  Send,
  Shield,
  TrendingUp,
  Users
} from 'lucide-react';
import {
  submitRestaurantLead,
  RestaurantLeadModerationError,
  RestaurantLeadValidationUnavailableError,
  type RestaurantLeadPayload
} from '../services/restaurantLeadService';
import { FlipWords } from '../ui/flip-words';
import { useParallax } from '../hooks/useParallax';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

type FormStatus = 'idle' | 'sending' | 'success' | 'error';

const initialForm: RestaurantLeadPayload = {
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
  description: ''
};

/* Direção de arte — paleta quente, integração visual, ritmo entre seções */
const tokens = {
  base: '#F5EFE7',           // creme quente base (hero, etc.)
  baseLight: '#FBF8F4',      // variação clara — seções “limpas”
  block: '#FFFFFF',          // blocos e cards
  warmGray: '#EFE9E2',       // cinza quente — benefícios, contraste
  textPrimary: '#2A1E1A',
  textSecondary: '#5C4A42',
  textMuted: '#6B5A54',
  accent: '#E91120',
  accentLight: 'rgba(233, 17, 32, 0.08)',
  border: '#E9D7C4',
  borderSoft: '#E5DDD4',
  /* Glows para integração das imagens (baixa opacidade) */
  glowCoral: 'rgba(255, 106, 80, 0.14)',
  glowGolden: 'rgba(255, 190, 92, 0.12)',
  glowRedSoft: 'rgba(233, 17, 32, 0.06)',
  shadow: '0 4px 24px rgba(42, 30, 26, 0.06)',
  shadowWarm: '0 12px 40px rgba(120, 80, 60, 0.12)',
  shadowStrong: '0 8px 40px rgba(42, 30, 26, 0.08)',
  /* Footer — tom mais escuro */
  footerBg: '#2A1E1A',
  footerText: '#A99E95',
  footerBorder: 'rgba(255,255,255,0.08)'
};

const benefits = [
  {
    icon: LineChart,
    label: 'Visibilidade',
    title: 'Mais pedidos, mais alcance',
    text: 'Sua vitrine digital atrai novos clientes e converte em pedidos com cardápio sempre atualizado.',
    highlight: 'Presença digital profissional'
  },
  {
    icon: HandCoins,
    label: 'Operação',
    title: 'Menos custo, mais controle',
    text: 'Cardápio, pedidos e atendimento em um só lugar. Menos tempo em planilhas, mais tempo no seu negócio.',
    highlight: 'Gestão simplificada'
  },
  {
    icon: Clock3,
    label: 'Suporte',
    title: 'Cadastro rápido, time próximo',
    text: 'Entrada assistida para você começar a vender online com agilidade e segurança desde o dia um.',
    highlight: 'Ativação em poucos dias'
  }
];

const steps = [
  {
    step: 1,
    title: 'Mais pedidos com taxa justa',
    desc: 'Sua vitrine digital ganha destaque e você vende mais sem depender de taxas abusivas que comprimem sua margem.',
    image: '/TaxaJusta.png',
    imageAlt: 'Mais pedidos com taxa justa no Bora Comer'
  },
  {
    step: 2,
    title: 'Operação simples no dia a dia',
    desc: 'Cardápio, pedidos e atendimento em um fluxo único: menos retrabalho, menos erro e mais agilidade no salão e delivery.',
    image: '/passo 2.png',
    imageAlt: 'Operação simples no dia a dia com Bora Comer'
  },
  {
    step: 3,
    title: 'Suporte próximo de verdade',
    desc: 'Você não fica sozinho: onboarding assistido, apoio comercial e acompanhamento contínuo para crescer com previsibilidade.',
    image: '/passo 3.png',
    imageAlt: 'Suporte próximo de verdade no Bora Comer'
  },
  {
    step: 4,
    title: 'IA que indica seu restaurante',
    desc: 'Nossa inteligência destaca seu restaurante para clientes com maior chance de compra, aumentando descoberta qualificada e conversão.',
    image: '/passo 4.png',
    imageAlt: 'IA que indica seu restaurante para novos clientes'
  }
];

function onlyPhoneChars(value: string): string {
  const trimmed = value.trim();
  let result = '';
  for (let i = 0; i < trimmed.length; i++) {
    const c = trimmed[i];
    if (c === '+' && result === '') result += c;
    if (/\d/.test(c)) result += c;
  }
  return result.slice(0, 16);
}

function formatPhone(value: string): string {
  const raw = onlyPhoneChars(value);
  const hasPlus = raw.startsWith('+');
  const digits = raw.replace(/\D/g, '');
  if (!digits) return hasPlus ? '+' : '';

  const chunks: string[] = [];
  let cursor = 0;
  chunks.push(digits.slice(cursor, cursor + 2));
  cursor += 2;
  if (digits.length > cursor) {
    chunks.push(digits.slice(cursor, cursor + 2));
    cursor += 2;
  }
  if (digits.length > cursor) {
    chunks.push(digits.slice(cursor, cursor + 5));
    cursor += 5;
  }
  if (digits.length > cursor) {
    chunks.push(digits.slice(cursor, cursor + 4));
  }

  return `${hasPlus ? '+' : ''}${chunks.join(' ')}`.trim();
}

function formatCnpj(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (!digits) return '';
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

/** Wrapper que revela o conteúdo ao entrar na viewport (scroll reveal). */
function ScrollRevealSection({
  children,
  className = '',
  delay
}: {
  children: React.ReactNode;
  className?: string;
  delay?: 0 | 1 | 2 | 3;
}) {
  const { ref, isRevealed } = useScrollReveal(0.12, '0px 0px -50px 0px');
  return (
    <div
      ref={ref}
      className={`scroll-reveal ${delay !== undefined ? `scroll-reveal-delay-${delay}` : ''} ${isRevealed ? 'revealed' : ''} ${className}`.trim()}
    >
      {children}
    </div>
  );
}

export default function BoraComerLanding() {
  const [formData, setFormData] = useState<RestaurantLeadPayload>(initialForm);
  const [status, setStatus] = useState<FormStatus>('idle');
  const [message, setMessage] = useState('');
  /* Parallax no hero: glow de fundo move-se mais devagar que o scroll (efeito profundidade). */
  const { ref: parallaxGlowRef, transform: parallaxGlow } = useParallax(0.35, { disableBelowWidth: 768 });
  const { ref: parallaxImageRef, transform: parallaxImage } = useParallax(0.15, { disableBelowWidth: 768 });
  const howSectionRef = useRef<HTMLDivElement | null>(null);
  const howViewportRef = useRef<HTMLDivElement | null>(null);
  const howTrackRef = useRef<HTMLDivElement | null>(null);
  const howBarRef = useRef<HTMLDivElement | null>(null);

  const ctaPrimary =
    'inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-white transition-all hover:opacity-95 hover:shadow-lg active:scale-[0.98]';

  const canSubmit = useMemo(() => {
    return (
      formData.restaurantName.trim() &&
      formData.ownerName.trim() &&
      formData.phone.trim() &&
      formData.whatsapp.trim() &&
      formData.email.trim() &&
      formData.cnpj.trim() &&
      formData.address.trim() &&
      formData.cityState.trim() &&
      formData.cuisineType.trim() &&
      formData.openingHours.trim() &&
      formData.priceRange.trim() &&
      formData.description.trim()
    );
  }, [formData]);

  const updateField = (field: keyof RestaurantLeadPayload, value: string) => {
    if (field === 'phone' || field === 'whatsapp') {
      setFormData((prev) => ({ ...prev, [field]: formatPhone(value) }));
      return;
    }
    if (field === 'cnpj') {
      setFormData((prev) => ({ ...prev, cnpj: formatCnpj(value) }));
      return;
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  /* Garante tema claro no body ao montar a landing (evita fundo escuro do app) */
  useLayoutEffect(() => {
    document.body.classList.add('landing-bora-comer');
    return () => document.body.classList.remove('landing-bora-comer');
  }, []);

  /* Como funciona — GSAP ScrollTrigger (pin + scrub), igual ao carrossel bônus.
   * Enquanto pinado, o scroll alimenta a timeline horizontal; ao fim, a página volta a rolar.
   */
  useLayoutEffect(() => {
    const section = howSectionRef.current;
    const viewport = howViewportRef.current;
    const track = howTrackRef.current;
    const bar = howBarRef.current;
    if (!section || !viewport || !track || !bar) return;
    gsap.registerPlugin(ScrollTrigger);

    const mm = gsap.matchMedia();
    mm.add('(min-width: 1024px)', () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      const getOverflow = () => Math.max(0, track.scrollWidth - viewport.clientWidth);

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          // mantém o pin até consumir todo deslocamento horizontal (com piso para UX).
          end: () => `+=${Math.max(window.innerHeight * 3, getOverflow() + window.innerHeight)}`,
          scrub: true,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true
        }
      });

      tl.fromTo(bar, { xPercent: -100 }, { xPercent: 0, duration: 0.5 })
        .to(
          track,
          {
            x: () => -getOverflow(),
            duration: 0.5
          },
          '-=0.5'
        );

      return () => {
        tl.scrollTrigger?.kill();
        tl.kill();
        gsap.set(track, { clearProps: 'transform' });
        gsap.set(bar, { clearProps: 'transform' });
      };
    });

    return () => mm.revert();
  }, []);

  const scrollToForm = () => {
    const target = document.getElementById('cadastro-restaurante');
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      setStatus('error');
      setMessage('Preencha todos os campos obrigatórios para continuar.');
      return;
    }

    setStatus('sending');
    setMessage('Validando e enviando seus dados...');

    try {
      const response = await submitRestaurantLead(formData);
      setStatus('success');
      if (response.awaitingManualModeration) {
        setMessage(
          response.status === 'created'
            ? 'Recebemos seus dados. A validação automática não respondeu no momento; nossa equipe revisará seu cadastro e entrará em contato em breve.'
            : 'Recebemos seus dados localmente. A validação automática falhou; quando o sistema sincronizar, nossa equipe revisará seu cadastro.'
        );
      } else {
        setMessage(
          response.status === 'created'
            ? 'Cadastro recebido com sucesso! Em breve nossa equipe entrará em contato.'
            : 'Recebemos seu cadastro! Assim que o backend estiver disponível, os dados serão sincronizados.'
        );
      }
      setFormData(initialForm);
    } catch (error) {
      if (error instanceof RestaurantLeadModerationError) {
        setStatus('error');
        setMessage(error.message);
        return;
      }
      if (error instanceof RestaurantLeadValidationUnavailableError) {
        setStatus('error');
        setMessage(error.message);
        return;
      }
      setStatus('error');
      setMessage('Não foi possível enviar agora. Tente novamente em instantes.');
    }
  };

  return (
    <main
      className="min-h-screen text-[#2A1E1A]"
      style={{ backgroundColor: tokens.base }}
    >
      {/* ========== HERO — Fundo creme + glow atrás da imagem, container dedicado ========== */}
      <section
        className="relative overflow-hidden pt-8 pb-20 md:pt-12 md:pb-28 lg:pb-32"
        style={{ backgroundColor: tokens.base }}
      >
        {/* Glow radial com parallax: move-se mais devagar que o scroll para sensação de profundidade */}
        <div
          ref={parallaxGlowRef}
          className="parallax-layer absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse 70% 70% at 85% 45%, ${tokens.glowCoral} 0%, transparent 50%),
              radial-gradient(ellipse 60% 60% at 80% 50%, ${tokens.glowGolden} 0%, transparent 45%),
              radial-gradient(ellipse 80% 50% at 50% 0%, ${tokens.glowRedSoft} 0%, transparent 50%)
            `,
            transform: `translate3d(0, ${parallaxGlow.y}px, 0)`
          }}
        />
        <div className="relative z-10 mx-auto max-w-6xl px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
            <div className="max-w-xl">
              <span
                className="inline-flex rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider"
                style={{ backgroundColor: tokens.accentLight, color: tokens.accent }}
              >
                Plataforma para Restaurantes
              </span>
              <h1 className="mt-6 text-4xl font-extrabold leading-[1.15] tracking-tight text-[#2A1E1A] md:text-5xl lg:text-[2.75rem]">
                Venda{' '}
                <FlipWords
                  words={['mais', 'melhor', 'mais rápido', 'com inteligência']}
                  duration={2800}
                  className="text-[#E91120]"
                />{' '}
                . Opere com menos esforço.
              </h1>
              <p
                className="mt-5 max-w-md text-lg leading-relaxed"
                style={{ color: tokens.textSecondary }}
              >
                O <strong className="font-semibold text-[#2A1E1A]">Bora Comer</strong> coloca seu
                restaurante online com{' '}
                <FlipWords
                  words={['cardápio digital', 'gestão de pedidos', 'vitrine pronta', 'suporte próximo']}
                  duration={3200}
                  className="font-semibold text-[#2A1E1A]"
                />{' '}
                para converter — cadastro rápido e suporte próximo.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={scrollToForm}
                  className={ctaPrimary}
                  style={{ backgroundColor: tokens.accent }}
                >
                  Cadastrar meu restaurante
                  <ArrowRight className="h-4 w-4" />
                </button>
                <a
                  href="#como-funciona"
                  className="inline-flex items-center rounded-xl border px-5 py-3.5 text-sm font-semibold transition-colors hover:bg-white/60"
                  style={{ borderColor: tokens.border, color: tokens.textPrimary }}
                >
                  Ver como funciona
                </a>
              </div>
            </div>

            {/* Imagem hero com parallax suave (movimento mais lento que o scroll) */}
            <div ref={parallaxImageRef} className="parallax-layer relative flex justify-center lg:justify-end" style={{ transform: `translate3d(0, ${parallaxImage.y}px, 0)` }}>
              <div
                className="relative w-full max-w-[520px] min-h-[280px] md:min-h-[320px] lg:min-h-[360px] overflow-hidden rounded-[28px] p-[3px]"
                style={{
                  background: `linear-gradient(145deg, ${tokens.borderSoft} 0%, ${tokens.border} 100%)`,
                  boxShadow: tokens.shadowWarm
                }}
              >
                <div className="relative h-full w-full overflow-hidden rounded-[24px] bg-[#EFE9E2]">
                  <img
                    src="/heroLadingPage.png"
                    alt="Bora Comer: tecnologia e gestão no seu restaurante — cardápio digital, painel de pedidos e ambiente premium"
                    className="h-full w-full object-cover"
                  />
                  {/* Overlay muito leve para harmonizar imagem com o fundo */}
                  <div
                    className="absolute inset-0 pointer-events-none rounded-[24px]"
                    style={{
                      background: `linear-gradient(180deg, ${tokens.glowRedSoft} 0%, transparent 30%, transparent 70%, rgba(42,30,26,0.03) 100%)`
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== CONFIANÇA / PROVA SOCIAL — fundo quase branco ========== */}
      <section
        className="border-y py-12 md:py-14"
        style={{ borderColor: tokens.borderSoft, backgroundColor: tokens.baseLight }}
      >
        <ScrollRevealSection className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8 md:gap-x-16">
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ backgroundColor: tokens.accentLight }}
              >
                <TrendingUp className="h-6 w-6" style={{ color: tokens.accent }} />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#2A1E1A]">+ Pedidos</p>
                <p className="text-sm font-medium" style={{ color: tokens.textMuted }}>
                  Mais visibilidade
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ backgroundColor: tokens.accentLight }}
              >
                <Shield className="h-6 w-6" style={{ color: tokens.accent }} />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#2A1E1A]">Cadastro seguro</p>
                <p className="text-sm font-medium" style={{ color: tokens.textMuted }}>
                  Dados protegidos
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ backgroundColor: tokens.accentLight }}
              >
                <Users className="h-6 w-6" style={{ color: tokens.accent }} />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#2A1E1A]">Suporte próximo</p>
                <p className="text-sm font-medium" style={{ color: tokens.textMuted }}>
                  Time dedicado
                </p>
              </div>
            </div>
          </div>
          {/* Espaço opcional para logos de parceiros/mídia: inserir aqui quando houver ativos */}
        </ScrollRevealSection>
      </section>

      {/* ========== O QUE É — cinza quente leve, ritmo visual ========== */}
      <section className="py-16 md:py-20" style={{ backgroundColor: tokens.warmGray }}>
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <ScrollRevealSection>
            <div
              className="mx-auto max-w-3xl rounded-2xl px-8 py-10 text-center md:px-12"
              style={{
                backgroundColor: tokens.block,
                boxShadow: tokens.shadow
              }}
            >
            <h2 className="text-2xl font-bold text-[#2A1E1A] md:text-3xl">
              Tecnologia que conecta seu restaurante ao cliente
            </h2>
            <p
              className="mt-4 text-base leading-relaxed md:text-lg"
              style={{ color: tokens.textSecondary }}
            >
              O Bora Comer é uma plataforma focada em performance comercial, agilidade no
              atendimento e experiência digital moderna. Nossa missão é ajudar seu negócio a vender
              mais sem complicar sua rotina.
            </p>
            </div>
          </ScrollRevealSection>
        </div>
      </section>

      {/* ========== BENEFÍCIOS + IMAGEM 2 — fundo bege seco, painel de produto ========== */}
      <section
        className="py-16 md:py-24"
        style={{ backgroundColor: tokens.base }}
      >
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <ScrollRevealSection>
            <div className="text-center">
              <h2 className="text-3xl font-bold text-[#2A1E1A] md:text-4xl">
                Por que restaurantes escolhem o Bora Comer
              </h2>
              <p
                className="mx-auto mt-4 max-w-2xl text-base md:text-lg"
                style={{ color: tokens.textSecondary }}
              >
                Mais pedidos, menos custo operacional e suporte para você começar a vender online.
              </p>
            </div>
          </ScrollRevealSection>

          <div className="mt-14 grid gap-10 lg:grid-cols-12 lg:items-start">
            <div className="grid gap-6 md:grid-cols-3 lg:col-span-7 lg:grid-cols-1">
              {benefits.map((benefit, index) => (
                <ScrollRevealSection key={benefit.title} delay={index === 0 ? 0 : index === 1 ? 1 : 2}>
                <article
                  key={benefit.title}
                  className="flex gap-5 rounded-2xl p-6 transition-shadow hover:shadow-md"
                  style={{
                    backgroundColor: tokens.block,
                    boxShadow: tokens.shadow
                  }}
                >
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: tokens.accentLight }}
                  >
                    <benefit.icon className="h-5 w-5" style={{ color: tokens.accent }} />
                  </div>
                  <div>
                    <span
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: tokens.accent }}
                    >
                      {benefit.label}
                    </span>
                    <h3 className="mt-1 text-lg font-bold text-[#2A1E1A]">{benefit.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed" style={{ color: tokens.textMuted }}>
                      {benefit.text}
                    </p>
                    <p className="mt-2 text-xs font-semibold text-[#2A1E1A]">
                      {benefit.highlight}
                    </p>
                  </div>
                </article>
                </ScrollRevealSection>
              ))}
            </div>

            {/* Container painel de produto — gradiente sutil, sombra, borda discreta */}
            <ScrollRevealSection delay={3} className="lg:col-span-5">
              <div
                className="relative flex min-h-[260px] w-full items-stretch lg:min-h-[340px]"
                style={{
                  background: `linear-gradient(160deg, ${tokens.borderSoft} 0%, ${tokens.warmGray} 100%)`,
                  boxShadow: tokens.shadowWarm,
                  border: `1px solid ${tokens.border}`,
                  borderRadius: '24px',
                  padding: '10px',
                  overflow: 'hidden'
                }}
              >
                <div className="relative flex-1 overflow-hidden rounded-[18px] bg-[#EFE9E2]">
                  <img
                    src="/Beneficios.png"
                    alt="Benefícios Bora Comer: cardápio digital, painel de pedidos e dashboard de gestão"
                    className="h-full w-full object-cover"
                  />
                  {/* Overlay sutil da marca para integração */}
                  <div
                    className="absolute inset-0 pointer-events-none rounded-[18px]"
                    style={{
                      background: `linear-gradient(135deg, ${tokens.glowRedSoft} 0%, transparent 40%)`
                    }}
                  />
                </div>
              </div>
            </ScrollRevealSection>
          </div>
        </div>
      </section>

      {/* ========== COMO FUNCIONA — fundo limpo ========== */}
      <section
        id="como-funciona"
        className="py-16 md:py-24"
        style={{ backgroundColor: tokens.baseLight }}
      >
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <ScrollRevealSection>
            <div className="text-center">
              <h2 className="text-3xl font-bold text-[#2A1E1A] md:text-4xl">
                Por que o Bora Comer e diferente
              </h2>
              <p
                className="mx-auto mt-4 max-w-xl text-base"
                style={{ color: tokens.textSecondary }}
              >
                Beneficios reais para vender mais, operar melhor e se destacar da concorrencia.
              </p>
            </div>
          </ScrollRevealSection>

          {/* Desktop (>=1024): seção pinada com trilho horizontal + barra de progresso */}
          <div
            ref={howSectionRef}
            className="relative mt-14 hidden lg:block"
          >
            <div
              ref={howViewportRef}
              className="relative flex h-screen items-center overflow-hidden rounded-[26px]"
              style={{
                backgroundColor: tokens.block,
                boxShadow: tokens.shadowStrong,
                border: `1px solid ${tokens.borderSoft}`
              }}
            >
                <div
                  className="pointer-events-none absolute inset-0 z-10"
                  style={{
                    background:
                      'linear-gradient(90deg, rgba(251,248,244,0.95) 0%, rgba(251,248,244,0) 12%, rgba(251,248,244,0) 88%, rgba(251,248,244,0.95) 100%)'
                  }}
                />
                <div
                  ref={howTrackRef}
                  className="relative z-0 flex will-change-transform"
                  style={{ transform: 'translate3d(0, 0, 0)' }}
                >
                  {steps.map((item) => (
                    <article
                      key={item.step}
                      className="flex h-[70vh] min-w-full w-full shrink-0 items-center justify-center px-8 text-center md:px-14"
                    >
                      {item.image ? (
                        <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-[#E9D7C4] bg-white shadow-[0_12px_40px_rgba(120,80,60,0.12)]">
                          <img
                            src={item.image}
                            alt={item.imageAlt || item.title}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="mx-auto max-w-2xl">
                          <div
                            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full text-lg font-bold text-white"
                            style={{ backgroundColor: tokens.accent }}
                          >
                            {item.step}
                          </div>
                          <h3 className="mt-5 text-3xl font-extrabold text-[#2A1E1A]">{item.title}</h3>
                          <p
                            className="mt-4 text-base leading-relaxed"
                            style={{ color: tokens.textSecondary }}
                          >
                            {item.desc}
                          </p>
                        </div>
                      )}
                    </article>
                  ))}
                </div>

                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-1 bg-[#EDE3DA]">
                  <div
                    ref={howBarRef}
                    className="h-full w-full will-change-transform"
                    style={{
                      transform: 'translateX(-100%)',
                      background: `linear-gradient(90deg, ${tokens.accent} 0%, #ff5c66 100%)`
                    }}
                  />
                </div>
            </div>
          </div>

          {/* Tablet/mobile: cards empilhados para leitura rápida e melhor usabilidade */}
          <ScrollRevealSection className="mt-10 lg:hidden">
            <div className="space-y-5">
              {steps.map((item) => (
                <article
                  key={item.step}
                  className="rounded-2xl p-6"
                  style={{
                    backgroundColor: tokens.block,
                    boxShadow: tokens.shadow,
                    border: `1px solid ${tokens.borderSoft}`
                  }}
                >
                  {item.image ? (
                    <div className="overflow-hidden rounded-xl border border-[#E9D7C4]">
                      <img src={item.image} alt={item.imageAlt || item.title} className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="flex items-start gap-4">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                        style={{ backgroundColor: tokens.accent }}
                      >
                        {item.step}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-[#2A1E1A]">{item.title}</h3>
                        <p className="mt-2 text-sm leading-relaxed" style={{ color: tokens.textMuted }}>
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </ScrollRevealSection>
        </div>
      </section>

      {/* ========== FORMULÁRIO — fundo limpo e sólido, foco em legibilidade ========== */}
      <section
        id="cadastro-restaurante"
        className="py-16 md:py-24"
        style={{ backgroundColor: tokens.warmGray }}
      >
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <ScrollRevealSection>
            <div
              className="mx-auto max-w-3xl rounded-2xl px-6 py-10 md:px-10 md:py-12"
              style={{
                backgroundColor: tokens.block,
                boxShadow: tokens.shadowStrong
              }}
            >
              <div className="text-center">
                <h2 className="text-2xl font-bold text-[#2A1E1A] md:text-3xl">
                  Cadastre seu restaurante
                </h2>
              <p
                className="mt-3 max-w-lg mx-auto text-sm md:text-base"
                style={{ color: tokens.textSecondary }}
              >
                Preencha os dados abaixo. Nosso time comercial retorna em breve com os próximos
                passos — sem compromisso.
              </p>
              <p className="mt-2 text-xs font-medium" style={{ color: tokens.textMuted }}>
                Leva menos de 2 minutos · Dados seguros
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-10 grid gap-5 sm:grid-cols-2">
              <InputField
                label="Nome do restaurante *"
                value={formData.restaurantName}
                onChange={(value) => updateField('restaurantName', value)}
                placeholder="Ex.: Pizzaria Sabor da Casa"
              />
              <InputField
                label="Nome do responsável *"
                value={formData.ownerName}
                onChange={(value) => updateField('ownerName', value)}
                placeholder="Ex.: João Silva"
              />
              <InputField
                label="Telefone *"
                value={formData.phone}
                onChange={(value) => updateField('phone', value)}
                placeholder="+55 11 99999 9999"
                type="tel"
              />
              <InputField
                label="WhatsApp *"
                value={formData.whatsapp}
                onChange={(value) => updateField('whatsapp', value)}
                placeholder="+55 11 98888 7777"
                type="tel"
              />
              <InputField
                label="E-mail *"
                value={formData.email}
                onChange={(value) => updateField('email', value)}
                placeholder="contato@seurestaurante.com"
                type="email"
              />
              <InputField
                label="CNPJ *"
                value={formData.cnpj}
                onChange={(value) => updateField('cnpj', value)}
                placeholder="00.000.000/0000-00"
              />
              <InputField
                label="Endereço completo *"
                value={formData.address}
                onChange={(value) => updateField('address', value)}
                placeholder="Rua, número, bairro e complemento"
                className="sm:col-span-2"
              />
              <InputField
                label="Cidade e estado *"
                value={formData.cityState}
                onChange={(value) => updateField('cityState', value)}
                placeholder="Ex.: São Paulo - SP"
              />
              <InputField
                label="Tipo de culinária *"
                value={formData.cuisineType}
                onChange={(value) => updateField('cuisineType', value)}
                placeholder="Ex.: Italiana, Japonesa, Brasileira"
              />
              <InputField
                label="Horário de funcionamento *"
                value={formData.openingHours}
                onChange={(value) => updateField('openingHours', value)}
                placeholder="Ex.: Seg a Dom, 11h às 23h"
              />
              <InputField
                label="Faixa de preço *"
                value={formData.priceRange}
                onChange={(value) => updateField('priceRange', value)}
                placeholder="Ex.: R$ 25 a R$ 80"
              />
              <InputField
                label="Instagram ou site"
                value={formData.socialLink}
                onChange={(value) => updateField('socialLink', value)}
                placeholder="https://instagram.com/seurestaurante"
                className="sm:col-span-2"
              />

              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-xs font-semibold text-[#2A1E1A]">
                  Descrição do restaurante *
                </span>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border bg-[#FFF8F2] px-4 py-3 text-sm text-[#2A1E1A] outline-none transition focus:border-[#E91120] focus:ring-2 focus:ring-[#E91120]/20"
                  style={{
                    borderColor: tokens.border
                  }}
                  placeholder="Conte brevemente seus diferenciais, público e proposta."
                />
              </label>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={status === 'sending' || !canSubmit}
                  className={`${ctaPrimary} w-full disabled:cursor-not-allowed disabled:opacity-60`}
                  style={{ backgroundColor: tokens.accent }}
                >
                  {status === 'sending' ? 'Enviando...' : 'Quero entrar no Bora Comer'}
                  <Send className="h-4 w-4" />
                </button>
                <p
                  className={`mt-3 text-sm ${
                    status === 'error'
                      ? 'text-red-600'
                      : status === 'success'
                        ? 'text-green-700'
                        : ''
                  }`}
                  style={status !== 'error' && status !== 'success' ? { color: tokens.textMuted } : undefined}
                >
                  {message || 'Seu cadastro leva menos de 2 minutos.'}
                </p>
              </div>
            </form>
            </div>
          </ScrollRevealSection>
        </div>
      </section>

      {/* ========== FOOTER — tom mais escuro, ritmo visual ========== */}
      <footer
        className="border-t py-10 md:py-12"
        style={{ borderColor: tokens.footerBorder, backgroundColor: tokens.footerBg }}
      >
        <div className="mx-auto grid max-w-6xl gap-8 px-6 text-sm md:grid-cols-3 lg:px-8">
          <div>
            <p className="text-base font-bold text-white">Bora Comer</p>
            <p className="mt-2 leading-relaxed" style={{ color: tokens.footerText }}>
              Tecnologia para restaurantes venderem mais com simplicidade.
            </p>
          </div>
          <div>
            <p className="font-semibold text-white">Contato comercial</p>
            <p className="mt-2 inline-flex items-center gap-2" style={{ color: tokens.footerText }}>
              <Phone className="h-4 w-4 shrink-0" style={{ color: tokens.accent }} />
              +55 11 4000-2210
            </p>
            <p className="mt-1 inline-flex items-center gap-2" style={{ color: tokens.footerText }}>
              <Mail className="h-4 w-4 shrink-0" style={{ color: tokens.accent }} />
              comercial@boracomer.com.br
            </p>
          </div>
          <div>
            <p className="font-semibold text-white">Endereço</p>
            <p className="mt-2 inline-flex items-start gap-2" style={{ color: tokens.footerText }}>
              <MapPinned className="mt-0.5 h-4 w-4 shrink-0" style={{ color: tokens.accent }} />
              São Paulo - SP | Atendimento nacional
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}

interface InputFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  className?: string;
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  className = ''
}: InputFieldProps) {
  return (
    <label className={className}>
      <span className="mb-1.5 block text-xs font-semibold text-[#2A1E1A]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border bg-[#FFF8F2] px-4 py-3 text-sm text-[#2A1E1A] outline-none transition focus:border-[#E91120] focus:ring-2 focus:ring-[#E91120]/20"
        style={{
          borderColor: tokens.border
        }}
      />
    </label>
  );
}
