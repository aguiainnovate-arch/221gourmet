import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { flushSync } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, Moon, Sun, X } from 'lucide-react';
import './captar.css';

const CAPTAR_THEME_KEY = 'captar-theme';

type CaptarTheme = 'light' | 'dark';

function readCaptarTheme(): CaptarTheme {
  try {
    return window.localStorage.getItem(CAPTAR_THEME_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function runCaptarThemeTransition(
  event: ReactMouseEvent<HTMLButtonElement>,
  apply: () => void,
  next: CaptarTheme,
) {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const radius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reducedMotion) {
    apply();
    return;
  }

  const doc = document as Document & {
    startViewTransition?: (callback: () => void) => {
      ready: Promise<void>;
      finished: Promise<void>;
    };
  };

  if (doc.startViewTransition) {
    const transition = doc.startViewTransition(() => {
      flushSync(apply);
    });
    transition.ready
      .then(() => {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${radius}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration: 750,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            pseudoElement: '::view-transition-new(root)',
          },
        );
      })
      .catch(() => undefined);
    return;
  }

  const overlay = document.createElement('div');
  overlay.style.cssText = `position:fixed;inset:0;z-index:9999;pointer-events:none;background:${
    next === 'light' ? '#fff5f7' : '#0c0a0b'
  };clip-path:circle(0px at ${x}px ${y}px);transition:clip-path 650ms cubic-bezier(0.22,1,0.36,1),opacity 220ms ease;`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => {
    overlay.style.clipPath = `circle(${radius}px at ${x}px ${y}px)`;
  });
  window.setTimeout(() => {
    apply();
    overlay.style.opacity = '0';
    window.setTimeout(() => overlay.remove(), 240);
  }, 320);
}

export function useCaptarBodyClass() {
  useEffect(() => {
    document.body.classList.add('captar-bora-comer', 'landing-bora-comer');
    return () => {
      document.body.classList.remove(
        'captar-bora-comer',
        'landing-bora-comer',
        'captar-theme-dark',
      );
    };
  }, []);
}

export function onlyPhoneChars(value: string): string {
  const trimmed = value.trim();
  let result = '';
  for (let i = 0; i < trimmed.length; i++) {
    const c = trimmed[i];
    if (c === '+' && result === '') result += c;
    if (/\d/.test(c)) result += c;
  }
  return result.slice(0, 16);
}

export function formatPhone(value: string): string {
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

export function formatCnpj(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (!digits) return '';
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export type FaqItem = { q: string; a: string };

export function CaptarFaq({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="captar-faq" id="faq">
      <h2>Perguntas frequentes</h2>
      <p className="sub">Tire as principais dúvidas para entrar na Bora Comer!</p>
      {items.map((item, i) => (
        <div className="captar-faq-item" key={item.q}>
          <button
            type="button"
            aria-expanded={open === i}
            onClick={() => setOpen(open === i ? null : i)}
          >
            <span>{item.q}</span>
            <span aria-hidden>{open === i ? '−' : '+'}</span>
          </button>
          {open === i && <div className="body">{item.a}</div>}
        </div>
      ))}
    </section>
  );
}

function Dropdown({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className="captar-nav-btn"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="captar-menu" id={id} role="menu">
          {children}
        </div>
      )}
    </div>
  );
}

export function CaptarHeader({
  onCadastrar,
  variant,
  theme,
  onToggleTheme,
}: {
  onCadastrar: () => void;
  variant: 'hub' | 'restaurante' | 'motoboy';
  theme?: CaptarTheme;
  onToggleTheme?: (event: ReactMouseEvent<HTMLButtonElement>) => void;
}) {
  const navigate = useNavigate();
  const isDark = theme === 'dark';
  const showThemeToggle = Boolean(onToggleTheme && theme);

  return (
    <header className="captar-header">
      <div className="captar-header-inner">
        <Link to="/captar" className="captar-logo-link" aria-label="Bora Comer!">
          <img src="/favicon.png" alt="" className="captar-logo" />
          <span className="captar-wordmark">Bora Comer!</span>
        </Link>
        <nav className="captar-nav">
          {variant !== 'hub' && (
            <Link
              className="captar-nav-btn"
              to={variant === 'restaurante' ? '/captar/motoboy' : '/captar/restaurante'}
            >
              {variant === 'restaurante' ? 'Cadastrar motoboy' : 'Cadastrar restaurante'}
            </Link>
          )}
          {variant === 'restaurante' && (
            <a className="captar-nav-btn" href="#planos">
              Planos
            </a>
          )}
          <Dropdown label="Como funciona">
            <Link className="captar-menu-item" to="/captar#como" onClick={() => navigate('/captar')}>
              <span>
                <strong>Sobre a Bora Comer!</strong>
                <span>Como a plataforma conecta loja, cliente e entrega.</span>
              </span>
            </Link>
            <a className="captar-menu-item" href="#planos">
              <span>
                <strong>Planos</strong>
                <span>Taxas, mensalidade e modos de entrega.</span>
              </span>
            </a>
            <a className="captar-menu-item" href="#passos">
              <span>
                <strong>Entregas</strong>
                <span>Sua equipe ou a malha de motoboys da plataforma.</span>
              </span>
            </a>
            <Link className="captar-menu-item" to="/planos">
              <span>
                <strong>Planos</strong>
                <span>Compare taxas e mensalidade da parceria.</span>
              </span>
            </Link>
            <Link className="captar-menu-item" to="/captar/restaurante#calculadora">
              <span>
                <strong>Calculadora de lucro</strong>
                <span>Simule quanto sua loja ganha por mês.</span>
              </span>
            </Link>
            <a className="captar-menu-item" href="#vantagens">
              <span>
                <strong>Ferramentas</strong>
                <span>Pedidos, cardápio, Boris e painel no celular.</span>
              </span>
            </a>
          </Dropdown>
          <Dropdown label="Ajuda">
            <a className="captar-menu-item" href="#faq">
              <span>
                <strong>Perguntas frequentes</strong>
                <span>Cadastro, taxas e prazos.</span>
              </span>
            </a>
            <Link className="captar-menu-item" to="/privacy-policy">
              <span>
                <strong>Privacidade</strong>
                <span>Como tratamos os dados do cadastro.</span>
              </span>
            </Link>
          </Dropdown>
        </nav>
        <div className="captar-header-actions">
          {showThemeToggle && (
            <button
              type="button"
              className="captar-theme-btn"
              onClick={onToggleTheme}
              aria-label={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
              title={isDark ? 'Modo claro' : 'Modo escuro'}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          )}
          <Link className="captar-btn-ghost" to={variant === 'motoboy' ? '/delivery/auth' : '/restaurant/auth'}>
            Entrar no portal
          </Link>
          <button type="button" className="captar-btn-solid" onClick={onCadastrar}>
            Cadastrar
          </button>
        </div>
      </div>
    </header>
  );
}

export function CaptarFooter() {
  return (
    <footer className="captar-footer">
      <div className="captar-footer-grid">
        <div>
          <h3>Bora Comer!</h3>
          <Link to="/restaurant/auth">Portal do parceiro</Link>
          <Link to="/delivery/auth">Entrar como motoboy</Link>
          <Link to="/delivery">App de pedidos</Link>
        </div>
        <div>
          <h3>Descubra</h3>
          <Link to="/captar/restaurante">Cadastre seu restaurante</Link>
          <Link to="/captar/restaurante#calculadora">Calculadora de lucro</Link>
          <Link to="/captar/motoboy">Cadastre-se como motoboy</Link>
          <Link to="/planos">Planos de parceria</Link>
        </div>
        <div>
          <h3>Saiba mais</h3>
          <Link to="/privacy-policy">Privacidade</Link>
          <Link to="/parceiros">Landing anterior</Link>
        </div>
      </div>
      <small>
        Bora Comer! — captação de restaurantes e motoboys. Cadastro sujeito a análise. Não use
        dados de terceiros.
      </small>
    </footer>
  );
}

export function CaptarSheet({
  title,
  subtitle,
  onStart,
  cta = 'Iniciar cadastro',
  collectEmail = true,
}: {
  title: string;
  subtitle: string;
  onStart: (email: string) => void;
  cta?: string;
  collectEmail?: boolean;
}) {
  const [email, setEmail] = useState('');
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;

  function submit(e: FormEvent) {
    e.preventDefault();
    onStart(email.trim());
  }

  return (
    <div className="captar-sheet" role="dialog" aria-label={title}>
      <button type="button" className="captar-sheet-dismiss" onClick={() => setHidden(true)} aria-label="Fechar">
        <X size={18} />
      </button>
      <div className="captar-sheet-inner">
        <h2>{title}</h2>
        <p>{subtitle}</p>
        <form className="captar-sheet-row" onSubmit={submit}>
          {collectEmail && (
            <input
              className="captar-input"
              type="email"
              required
              placeholder="email@email.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-label="E-mail"
            />
          )}
          <button className="captar-btn-solid captar-btn-lg" type="submit" style={{ minWidth: 180 }}>
            {cta}
          </button>
        </form>
        <p className="captar-legal" style={{ marginTop: 10 }}>
          Ao continuar, você concorda em receber comunicações da Bora Comer!. Confira nossa{' '}
          <Link to="/privacy-policy">Declaração de Privacidade</Link>.
        </p>
      </div>
    </div>
  );
}

export function CaptarLayout({
  children,
  variant,
  onCadastrar,
  sheet,
}: {
  children: ReactNode;
  variant: 'hub' | 'restaurante' | 'motoboy';
  onCadastrar: () => void;
  sheet?: ReactNode;
}) {
  useCaptarBodyClass();
  const enableTheme = variant === 'restaurante';
  const [theme, setTheme] = useState<CaptarTheme>(() =>
    enableTheme ? readCaptarTheme() : 'light',
  );
  const isDark = enableTheme && theme === 'dark';

  useEffect(() => {
    if (!enableTheme) return;
    try {
      window.localStorage.setItem(CAPTAR_THEME_KEY, theme);
    } catch {
      /* armazenamento indisponível */
    }
    document.body.classList.toggle('captar-theme-dark', theme === 'dark');
    return () => {
      document.body.classList.remove('captar-theme-dark');
    };
  }, [enableTheme, theme]);

  function toggleTheme(event: ReactMouseEvent<HTMLButtonElement>) {
    const next: CaptarTheme = theme === 'dark' ? 'light' : 'dark';
    runCaptarThemeTransition(event, () => setTheme(next), next);
  }

  return (
    <div className={`captar-root${isDark ? ' captar-theme-dark' : ''}`}>
      <CaptarHeader
        variant={variant}
        onCadastrar={onCadastrar}
        theme={enableTheme ? theme : undefined}
        onToggleTheme={enableTheme ? toggleTheme : undefined}
      />
      {children}
      <CaptarFooter />
      {sheet}
    </div>
  );
}
