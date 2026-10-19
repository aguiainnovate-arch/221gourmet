import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
  Palette,
  Rocket,
  Search,
  Store,
  Table as TableIcon,
  Truck,
  Users,
  Utensils,
  Gift,
} from 'lucide-react';
import BorisPanel from './BorisPanel';
import type { PanelChecklistStep, PanelNavItem } from './panelChecklist';

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
  children: ReactNode;
}

const SIDEBAR_BG: React.CSSProperties = {
  backgroundImage: `
    repeating-linear-gradient(118deg, rgba(255,255,255,0.045) 0 1px, transparent 1px 18px),
    linear-gradient(180deg, #8d1424 0%, #5c0b16 42%, #3a0610 100%)
  `,
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
          ? 'left-0 right-0 w-full border-white/15 bg-[#2a0710] shadow-black/40'
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
  showAccountActions,
  onDeleteAccount,
  deletingAccount,
  onLogout,
  showBoris,
  children,
}: RestaurantPanelShellProps) {
  const [query, setQuery] = useState('');
  const [drawer, setDrawer] = useState(false);
  const [borisOpen, setBorisOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [accountMenu, setAccountMenu] = useState<AccountMenuId>(null);
  const sidebarMenuRef = useRef<HTMLDivElement>(null);
  const headerMenuRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.label.toLowerCase().includes(q));
  }, [items, query]);

  const done = steps.filter((step) => step.done).length;
  const next = steps.find((step) => !step.done);
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
      setConfirmLogout(true);
    },
    onClose: () => setAccountMenu(null),
  };

  const sidebar = (
    <div className="flex flex-col h-full text-white" style={SIDEBAR_BG}>
      <div className="px-3 pt-5 pb-2">
        <img
          src="/BoraComerlogo.png"
          alt="Bora Comer"
          className="h-[4.5rem] w-full max-w-[210px] object-contain object-left drop-shadow-[0_4px_12px_rgba(0,0,0,0.35)]"
        />
        <p className="text-[11px] tracking-[0.28em] text-[#ffd23a] font-bold mt-1.5 pl-0.5">
          PEDIU, CHEGOU!
        </p>
      </div>

      <div className="relative mx-3 mb-3" ref={sidebarMenuRef}>
        <button
          type="button"
          onClick={() => setAccountMenu((prev) => (prev === 'sidebar' ? null : 'sidebar'))}
          aria-expanded={accountMenu === 'sidebar'}
          aria-haspopup="menu"
          className="w-full rounded-2xl bg-black/25 border border-white/10 px-2.5 py-2 flex items-center gap-2.5 text-left hover:bg-black/35 transition"
        >
          <StoreMark name={name} logoUrl={logoUrl} size="w-11 h-11" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold truncate leading-tight">{name}</span>
            <span className="block text-[11px] text-white/60">Restaurante</span>
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold px-1.5 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Online
            </span>
          </span>
          <ChevronDown
            className={`w-4 h-4 text-white/70 shrink-0 transition-transform ${
              accountMenu === 'sidebar' ? 'rotate-180' : ''
            }`}
          />
        </button>
        {accountMenu === 'sidebar' && (
          <AccountMenuPanel {...accountMenuShared} dark />
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 space-y-0.5">
        {filtered.map((item) => {
          const Icon = ICONS[item.id] ?? Store;
          const active = item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => go(item.id)}
              className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-left transition ${
                active ? 'bg-[#e10600] text-white shadow-[0_8px_18px_rgba(0,0,0,0.28)]' : 'text-white/80 hover:bg-white/10'
              }`}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge ? (
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

      <div className="p-3 space-y-2">
        <div className="rounded-2xl bg-[#2a0710]/90 border border-white/10 p-3">
          <div className="flex items-start gap-2">
            <span className="w-8 h-8 rounded-xl bg-[#e10600] grid place-items-center shrink-0">
              <Rocket className="w-4 h-4 text-white" />
            </span>
            <div>
              <p className="text-sm font-bold leading-tight">
                {done >= steps.length ? 'Sua loja está pronta!' : 'Sua loja quase pronta!'}
              </p>
              <p className="text-[11px] text-white/70 mt-1 leading-snug">
                {done >= steps.length
                  ? 'Os passos principais já estão feitos.'
                  : 'Complete a configuração para começar a receber mais pedidos.'}
              </p>
            </div>
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-white/15 overflow-hidden">
            <div className="h-full bg-[#ffd23a]" style={{ width: `${steps.length ? (done / steps.length) * 100 : 0}%` }} />
          </div>
          <p className="text-[11px] text-white/70 mt-1">
            {done} de {steps.length} concluídos
          </p>
          {next && (
            <button
              type="button"
              onClick={() => go(next.tab)}
              className="mt-3 w-full rounded-xl bg-[#e10600] py-2.5 text-sm font-semibold hover:bg-[#c70500]"
            >
              Continuar configuração →
            </button>
          )}
        </div>
        {showAccountActions && onDeleteAccount && (
          <button
            type="button"
            onClick={onDeleteAccount}
            disabled={deletingAccount}
            className="w-full text-left text-[11px] text-white/45 hover:text-white/80 px-1 disabled:opacity-50"
          >
            {deletingAccount ? 'Excluindo…' : 'Excluir conta'}
          </button>
        )}
        {confirmLogout ? (
          <div className="rounded-xl bg-white text-gray-900 p-3 text-sm">
            <p className="font-medium">Sair do painel?</p>
            <div className="mt-2 flex gap-2">
              <button type="button" className="flex-1 rounded-lg bg-[#e10600] text-white py-1.5" onClick={onLogout}>
                Sair
              </button>
              <button type="button" className="flex-1 rounded-lg bg-gray-100 py-1.5" onClick={() => setConfirmLogout(false)}>
                Ficar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmLogout(true)}
            className="w-full rounded-xl bg-black/25 py-2 text-sm font-semibold hover:bg-black/40"
          >
            Sair
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-1 min-h-0 bg-[#f7f3ee]">
      <aside className="hidden md:flex w-[248px] shrink-0">{sidebar}</aside>
      {drawer && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button type="button" className="absolute inset-0 bg-black/50" aria-label="Fechar menu" onClick={() => setDrawer(false)} />
          <div className="relative h-full w-[260px]">{sidebar}</div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        <header className="shrink-0 flex items-center gap-2 px-3 sm:px-5 py-3 bg-[#f7f3ee]">
          <button type="button" className="md:hidden p-2 rounded-xl bg-white border border-[#eadfd4]" onClick={() => setDrawer(true)} aria-label="Abrir menu">
            <Menu className="w-5 h-5" />
          </button>
          <label className="flex-1 max-w-md flex items-center gap-2 bg-white border border-[#eadfd4] rounded-full px-3 h-10 shadow-sm">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              id="panel-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && filtered[0]) go(filtered[0].id);
              }}
              placeholder="Buscar no painel..."
              className="flex-1 bg-transparent outline-none text-sm min-w-0 text-gray-800 placeholder:text-gray-400"
            />
            <kbd className="hidden sm:inline text-[10px] text-gray-500 border border-gray-200 rounded-md px-1.5 py-0.5 bg-[#faf7f4]">Ctrl K</kbd>
          </label>
          <Link
            to={storeHref}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-white border border-[#eadfd4] h-10 px-3 text-sm font-semibold text-gray-800"
          >
            <ExternalLink className="w-4 h-4" />
            Ver minha loja
          </Link>
          <button
            type="button"
            onClick={onNotificationClick}
            className="relative w-10 h-10 rounded-full bg-white border border-[#eadfd4] grid place-items-center"
            aria-label="Chamados"
          >
            <Bell className="w-4 h-4 text-gray-700" />
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
              className="flex items-center gap-2 rounded-full bg-white border border-[#eadfd4] pl-1 pr-2.5 h-10 hover:bg-[#faf7f4] transition"
            >
              <StoreMark name={name} logoUrl={logoUrl} size="w-8 h-8" />
              <span className="leading-tight pr-0.5 text-left">
                <span className="block text-xs font-bold text-gray-900 max-w-[9rem] truncate">{name}</span>
                <span className="block text-[10px] text-gray-500">Proprietário</span>
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-gray-500 transition-transform ${
                  accountMenu === 'header' ? 'rotate-180' : ''
                }`}
              />
            </button>
            {accountMenu === 'header' && <AccountMenuPanel {...accountMenuShared} />}
          </div>
        </header>

        <div className="flex flex-1 min-h-0">
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
            className="xl:hidden fixed bottom-4 right-4 z-40 rounded-full shadow-lg bg-white border border-[#eadfd4] p-1"
            aria-label="Abrir Boris"
          >
            <img src="/boris-painel.png" alt="" className="w-14 h-14 rounded-full object-cover" />
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
