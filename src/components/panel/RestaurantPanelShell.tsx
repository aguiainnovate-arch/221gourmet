import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  ChefHat,
  ChevronDown,
  Clock,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Moon,
  Palette,
  Search,
  Sun,
  Store,
  Table as TableIcon,
  Truck,
  Users,
  Utensils,
  Gift,
  Lock,
} from 'lucide-react';
import BorisPanel from './BorisPanel';
import type { PanelChecklistStep, PanelNavItem } from './panelChecklist';
import type { StoreOpenMode } from '../../utils/openingHours';

const ICONS: Record<string, typeof Store> = {
  visao: LayoutDashboard,
  cozinha: ChefHat,
  cardapio: Utensils,
  personalizacao: Palette,
  delivery: Truck,
  cashback: Gift,
  horarios: Clock,
  whatsapp: MessageCircle,
  mesas: TableIcon,
  relatorios: BarChart3,
  garcons: Users,
};

interface RestaurantPanelShellProps {
  restaurantName: string;
  logoUrl?: string;
  storeHref: string;
  activeId: string;
  items: PanelNavItem[];
  onSelect: (id: string) => void;
  steps: PanelChecklistStep[];
  notificationCount: number;
  onNotificationClick: () => void;
  showAccountActions: boolean;
  onDeleteAccount?: () => void;
  deletingAccount?: boolean;
  onLogout: () => void;
  showBoris: boolean;
  /** Controle de loja aberta no cartão da sidebar. */
  storeOpenMode?: StoreOpenMode;
  onStoreOpenModeChange?: (mode: StoreOpenMode) => void;
  storeOpenNow?: boolean;
  children: ReactNode;
}

const SIDEBAR_BG: React.CSSProperties = {
  backgroundImage: `
    linear-gradient(180deg, rgba(8, 9, 12, 0.99) 0%, rgba(8, 9, 12, 0.96) 55%, rgba(8, 9, 12, 0.42) 100%),
    url('/cardapio-digital/burger.jpg')
  `,
  backgroundPosition: 'center, center bottom',
  backgroundRepeat: 'no-repeat, no-repeat',
  backgroundSize: 'cover, 330px auto',
};

function StoreMark({ name, logoUrl, size }: { name: string; logoUrl?: string; size: string }) {
  if (logoUrl) {
    return <img src={logoUrl} alt="" className={`${size} rounded-xl object-cover bg-white shrink-0`} />;
  }
  return (
    <span className={`${size} rounded-xl bg-[#e10600] grid place-items-center text-xs font-bold shrink-0`}>
      {(name || 'BC').slice(0, 2).toUpperCase()}
    </span>
  );
}

type AccountMenuId = 'sidebar' | 'header' | null;

function AccountMenuPanel({
  storeHref,
  onPersonalize,
  onLogout,
  onClose,
  dark,
}: {
  storeHref: string;
  onPersonalize: () => void;
  onLogout: () => void;
  onClose: () => void;
  dark?: boolean;
}) {
  const itemClass = dark
    ? 'w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-white/90 hover:bg-white/10 text-left'
    : 'w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-gray-800 hover:bg-gray-50 text-left';

  return (
    <div
      className={`absolute z-50 mt-1.5 w-[220px] rounded-xl border p-1.5 shadow-xl ${
        dark
          ? 'left-0 right-0 w-full border-white/15 bg-[#15171c] shadow-black/40'
          : 'right-0 border-[#eadfd4] bg-white'
      }`}
      role="menu"
    >
      <Link
        to={storeHref}
        role="menuitem"
        onClick={onClose}
        className={itemClass}
      >
        <ExternalLink className="w-4 h-4 shrink-0 opacity-70" />
        Ver minha loja
      </Link>
      <button type="button" role="menuitem" className={itemClass} onClick={() => { onPersonalize(); onClose(); }}>
        <Palette className="w-4 h-4 shrink-0 opacity-70" />
        Personalização
      </button>
      <div className={`my-1 h-px ${dark ? 'bg-white/10' : 'bg-gray-100'}`} />
      <button type="button" role="menuitem" className={`${itemClass} ${dark ? 'text-rose-200' : 'text-red-600'}`} onClick={() => { onLogout(); onClose(); }}>
        <LogOut className="w-4 h-4 shrink-0" />
        Sair do painel
      </button>
    </div>
  );
}

export default function RestaurantPanelShell({
  restaurantName,
  logoUrl,
  storeHref,
  activeId,
  items,
  onSelect,
  steps,
  notificationCount,
  onNotificationClick,
  onLogout,
  showBoris,
  storeOpenMode = 'auto',
  onStoreOpenModeChange,
  storeOpenNow,
  children,
}: RestaurantPanelShellProps) {
  const [query, setQuery] = useState('');
  const [drawer, setDrawer] = useState(false);
  const [borisOpen, setBorisOpen] = useState(false);
  const [accountMenu, setAccountMenu] = useState<AccountMenuId>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      return window.localStorage.getItem('panel-theme') === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });
  const isDark = theme === 'dark';

  useEffect(() => {
    try {
      window.localStorage.setItem('panel-theme', theme);
    } catch {
      /* armazenamento indisponível */
    }
  }, [theme]);

  function toggleTheme(event: React.MouseEvent<HTMLButtonElement>) {
    const next = isDark ? 'light' : 'dark';
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion) {
      setTheme(next);
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
        flushSync(() => setTheme(next));
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
      next === 'light' ? '#f7f3ee' : '#0a0b0e'
    };clip-path:circle(0px at ${x}px ${y}px);transition:clip-path 650ms cubic-bezier(0.22,1,0.36,1),opacity 220ms ease;`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => {
      overlay.style.clipPath = `circle(${radius}px at ${x}px ${y}px)`;
    });
    window.setTimeout(() => {
      setTheme(next);
      overlay.style.opacity = '0';
      window.setTimeout(() => overlay.remove(), 240);
    }, 660);
  }

  const sidebarMenuRef = useRef<HTMLDivElement>(null);
  const headerMenuRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.label.toLowerCase().includes(q));
  }, [items, query]);

  const name = restaurantName || 'Sua loja';

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        document.getElementById('panel-search')?.focus();
      }
      if (event.key === 'Escape') setAccountMenu(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!accountMenu) return;
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (accountMenu === 'sidebar' && sidebarMenuRef.current?.contains(target)) return;
      if (accountMenu === 'header' && headerMenuRef.current?.contains(target)) return;
      setAccountMenu(null);
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [accountMenu]);

  function go(id: string) {
    onSelect(id);
    setDrawer(false);
    setQuery('');
    setAccountMenu(null);
  }

  const accountMenuShared = {
    storeHref,
    onPersonalize: () => go('personalizacao'),
    onLogout: () => {
      setAccountMenu(null);
      onLogout();
    },
    onClose: () => setAccountMenu(null),
  };

  const effectiveOpen =
    storeOpenNow ?? (storeOpenMode === 'closed' ? false : true);

  const sidebar = (
    <div className="flex h-full w-full min-h-0 flex-col overflow-hidden bg-[#090a0d] text-white" style={SIDEBAR_BG}>
      <div className="shrink-0 px-5 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <img
            src="/BoraComerlogo.png"
            alt="Bora Comer"
            className="h-14 w-16 object-contain object-center"
          />
          <span className="leading-none">
            <span className="block text-[17px] font-black tracking-tight text-white">Bora<br />Comer</span>
            <span className="mt-1 block text-[7px] font-bold tracking-[0.24em] text-white/55">AUTOMATIC</span>
          </span>
        </div>
      </div>

      <div className="relative mx-4 mb-4 flex shrink-0 items-center gap-2.5" ref={sidebarMenuRef}>
        <StoreMark name={name} logoUrl={logoUrl} size="w-9 h-9" />
        <button
          type="button"
          onClick={() => setAccountMenu((prev) => (prev === 'sidebar' ? null : 'sidebar'))}
          aria-expanded={accountMenu === 'sidebar'}
          aria-haspopup="menu"
          className="min-w-0 flex-1 text-left"
        >
          <span className="block truncate text-xs font-semibold">{name}</span>
          <span className="mt-0.5 flex items-center gap-1 text-[10px] text-white/50">
            <span className={`h-1.5 w-1.5 rounded-full ${effectiveOpen ? 'bg-emerald-400' : 'bg-red-400'}`} />
            {effectiveOpen ? 'Loja aberta' : 'Loja fechada'}
          </span>
        </button>
        <button
          type="button"
          role="switch"
          aria-checked={effectiveOpen}
          aria-label="Loja aberta"
          disabled={!onStoreOpenModeChange}
          onClick={() => onStoreOpenModeChange?.(effectiveOpen ? 'closed' : 'open')}
          className={`relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
            effectiveOpen ? 'bg-[#e10600]' : 'bg-white/20'
          }`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
              effectiveOpen ? 'left-[18px]' : 'left-0.5'
            }`}
          />
        </button>
        <button
          type="button"
          aria-label="Abrir opções da conta"
          onClick={() => setAccountMenu((prev) => (prev === 'sidebar' ? null : 'sidebar'))}
          className="shrink-0 p-1 text-white/45 transition hover:text-white"
        >
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${
              accountMenu === 'sidebar' ? 'rotate-180' : ''
            }`}
          />
        </button>
        {accountMenu === 'sidebar' && <AccountMenuPanel {...accountMenuShared} dark />}
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-4">
        {filtered.map((item) => {
          const Icon = ICONS[item.id] ?? Store;
          const active = item.id === activeId;
          const locked = Boolean(item.locked);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => go(item.id)}
              title={locked ? 'Assinatura necessária' : undefined}
              className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] transition ${
                active
                  ? 'border border-[#ff3a32]/50 bg-gradient-to-r from-[#dc160f]/50 to-[#dc160f]/5 text-white shadow-[0_0_22px_rgba(225,6,0,0.22)]'
                  : locked
                    ? 'text-white/38 hover:bg-white/[0.04] hover:text-white/55'
                    : 'text-white/60 hover:bg-white/[0.06] hover:text-white/90'
              }`}
            >
              {active && <span className="absolute left-0 h-5 w-0.5 rounded-r-full bg-[#ff443b]" />}
              <Icon
                className={`h-[17px] w-[17px] shrink-0 ${locked && !active ? 'opacity-55' : ''}`}
                strokeWidth={1.7}
              />
              <span className={`flex-1 truncate ${locked && !active ? 'opacity-70' : ''}`}>
                {item.label}
              </span>
              {locked ? (
                <Lock
                  className="h-3.5 w-3.5 shrink-0 text-zinc-400 opacity-80"
                  strokeWidth={2}
                  aria-label="Bloqueado"
                />
              ) : item.badge ? (
                <span
                  className={`min-w-[1.25rem] h-5 px-1.5 rounded-full text-[11px] font-bold grid place-items-center ${
                    active ? 'bg-white text-[#e10600]' : 'bg-[#e10600] text-white'
                  }`}
                >
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-xs text-white/60 px-3 py-2">Nada com esse nome no menu.</p>
        )}
      </nav>

      <div className="shrink-0 p-4 pt-3">
        <button
          type="button"
          onClick={() => setBorisOpen(true)}
          className="group relative w-full overflow-hidden rounded-2xl border border-white/25 bg-white/[0.03] px-3 py-3 text-left shadow-[0_18px_40px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.22),inset_0_-1px_0_rgba(255,255,255,0.05)] backdrop-blur-[3px] backdrop-saturate-150 transition duration-300 hover:border-white/35 hover:bg-white/[0.06]"
        >
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-white/[0.01] to-transparent" aria-hidden />
          <span className="pointer-events-none absolute -top-10 -left-6 h-20 w-28 rounded-full bg-white/10 blur-2xl" aria-hidden />
          <img
            src="/boris-mascot.gif?v=4"
            alt=""
            className="absolute bottom-0 right-0 h-[88px] w-[88px] object-contain object-bottom opacity-95 drop-shadow-[0_6px_14px_rgba(0,0,0,0.45)] transition-transform duration-300 group-hover:scale-105"
          />
          <div className="relative max-w-[125px] [text-shadow:0_1px_8px_rgba(0,0,0,0.45)]">
            <p className="text-[11px] font-bold text-white">Boris</p>
            <p className="mt-0.5 text-[10px] leading-snug text-white/70">
              Sua IA para vender mais.
            </p>
            <span className="mt-2 inline-block text-[10px] font-semibold text-[#ff6b64]">Saiba mais</span>
          </div>
        </button>
      </div>
    </div>
  );

  return (
    <div
      className={`flex min-h-0 flex-1 overflow-hidden ${
        isDark ? 'bg-[#0a0b0e] text-zinc-100' : 'bg-[#f7f3ee] text-gray-900'
      }`}
    >
      <aside className="hidden h-full w-[248px] min-w-[248px] max-w-[248px] shrink-0 overflow-hidden md:flex">
        {sidebar}
      </aside>
      {drawer && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button type="button" className="absolute inset-0 bg-black/50" aria-label="Fechar menu" onClick={() => setDrawer(false)} />
          <div className="relative h-full w-[260px] max-w-[85vw] overflow-hidden">{sidebar}</div>
        </div>
      )}

      <div className={`${isDark ? 'panel-theme' : 'panel-light'} flex-1 min-w-0 flex flex-col min-h-0`}>
        <header
          className={`shrink-0 flex items-center gap-2 border-b px-3 py-3 backdrop-blur-xl sm:px-5 ${
            isDark ? 'border-white/[0.06] bg-[#0a0b0e]/90' : 'border-[#eadfd4] bg-[#f7f3ee]/90'
          }`}
        >
          <button
            type="button"
            className={`md:hidden p-2 rounded-xl border ${
              isDark ? 'bg-white/[0.04] border-white/10 text-white' : 'bg-white border-[#eadfd4] text-gray-800'
            }`}
            onClick={() => setDrawer(true)}
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <label
            className={`flex-1 max-w-md flex items-center gap-2 border rounded-full px-3 h-10 transition focus-within:border-[#e10600]/60 ${
              isDark
                ? 'bg-white/[0.04] border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] focus-within:bg-white/[0.06]'
                : 'bg-white border-[#eadfd4] shadow-sm'
            }`}
          >
            <Search className={`w-4 h-4 ${isDark ? 'text-white/40' : 'text-gray-400'}`} />
            <input
              id="panel-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && filtered[0]) go(filtered[0].id);
              }}
              placeholder="Buscar no painel..."
              className={`flex-1 bg-transparent outline-none text-sm min-w-0 ${
                isDark ? 'text-white placeholder:text-white/35' : 'text-gray-800 placeholder:text-gray-400'
              }`}
            />
            <kbd
              className={`hidden sm:inline text-[10px] border rounded-md px-1.5 py-0.5 ${
                isDark ? 'text-white/40 border-white/10 bg-white/[0.04]' : 'text-gray-500 border-gray-200 bg-[#faf7f4]'
              }`}
            >
              Ctrl K
            </kbd>
          </label>
          <Link
            to={storeHref}
            className={`hidden sm:inline-flex items-center gap-1.5 rounded-full border h-10 px-3 text-sm font-semibold transition ${
              isDark
                ? 'bg-white/[0.04] border-white/10 text-white/85 hover:bg-white/[0.08] hover:text-white'
                : 'bg-white border-[#eadfd4] text-gray-800 hover:bg-[#faf7f4]'
            }`}
          >
            <ExternalLink className="w-4 h-4" />
            Ver minha loja
          </Link>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Mudar para modo branco' : 'Mudar para modo escuro'}
            title={isDark ? 'Modo branco' : 'Modo escuro'}
            className={`relative w-10 h-10 shrink-0 rounded-full border grid place-items-center transition ${
              isDark
                ? 'bg-white/[0.04] border-white/10 text-amber-200 hover:bg-white/[0.08]'
                : 'bg-white border-[#eadfd4] text-gray-600 hover:bg-[#faf7f4]'
            }`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={onNotificationClick}
            className={`relative w-10 h-10 rounded-full border grid place-items-center transition ${
              isDark
                ? 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08]'
                : 'bg-white border-[#eadfd4] hover:bg-[#faf7f4]'
            }`}
            aria-label="Chamados"
          >
            <Bell className={`w-4 h-4 ${isDark ? 'text-white/75' : 'text-gray-700'}`} />
            <span
              className={`absolute top-2 right-2 w-2 h-2 rounded-full ${
                notificationCount > 0 ? 'bg-[#e10600]' : 'bg-transparent'
              }`}
            />
            {notificationCount > 0 && (
              <span className="sr-only">{notificationCount} chamados</span>
            )}
          </button>
          <div className="relative hidden sm:block" ref={headerMenuRef}>
            <button
              type="button"
              onClick={() => setAccountMenu((prev) => (prev === 'header' ? null : 'header'))}
              aria-expanded={accountMenu === 'header'}
              aria-haspopup="menu"
              className={`flex items-center gap-2 rounded-full border pl-1 pr-2.5 h-10 transition ${
                isDark
                  ? 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08]'
                  : 'bg-white border-[#eadfd4] hover:bg-[#faf7f4]'
              }`}
            >
              <StoreMark name={name} logoUrl={logoUrl} size="w-8 h-8" />
              <span className="leading-tight pr-0.5 text-left">
                <span className={`block text-xs font-bold max-w-[9rem] truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {name}
                </span>
                <span className={`block text-[10px] ${isDark ? 'text-white/45' : 'text-gray-500'}`}>Proprietário</span>
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${isDark ? 'text-white/45' : 'text-gray-500'} ${
                  accountMenu === 'header' ? 'rotate-180' : ''
                }`}
              />
            </button>
            {accountMenu === 'header' && <AccountMenuPanel {...accountMenuShared} dark={isDark} />}
          </div>
        </header>

        <div
          className={`flex flex-1 min-h-0 ${
            isDark
              ? 'bg-[radial-gradient(900px_320px_at_70%_-80px,rgba(225,6,0,0.07),transparent_65%)]'
              : 'bg-[radial-gradient(900px_320px_at_70%_-80px,rgba(225,6,0,0.05),transparent_65%)]'
          }`}
        >
          <main className="flex-1 min-w-0 overflow-y-auto px-3 sm:px-6 pb-8">{children}</main>
          {showBoris && (
            <div className="hidden xl:block">
              <BorisPanel tab={activeId} steps={steps} onOpenStep={go} />
            </div>
          )}
        </div>
      </div>

      {showBoris && (
        <>
          <button
            type="button"
            onClick={() => setBorisOpen(true)}
            className={`xl:hidden fixed bottom-4 right-4 z-40 rounded-full p-1 ${
              isDark
                ? 'shadow-[0_16px_36px_rgba(0,0,0,0.5)] bg-[#111318] border border-white/15'
                : 'shadow-lg bg-white border border-[#eadfd4]'
            }`}
            aria-label="Abrir Boris"
          >
            <img src="/boris-mascot.gif?v=4" alt="" className="w-14 h-14 rounded-full object-contain" />
          </button>
          {borisOpen && (
            <div className="xl:hidden fixed inset-0 z-50 bg-black/40" onClick={() => setBorisOpen(false)}>
              <div className="absolute right-0 top-0 h-full w-[min(100%,340px)]" onClick={(event) => event.stopPropagation()}>
                <BorisPanel tab={activeId} steps={steps} onOpenStep={go} onClose={() => setBorisOpen(false)} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
