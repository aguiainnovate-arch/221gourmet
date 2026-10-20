import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Bike,
  Bold,
  Check,
  Clock,
  CloudUpload,
  ExternalLink,
  Heart,
  ImagePlus,
  Info,
  Italic,
  List,
  MapPin,
  Music,
  Palette,
  Plus,
  Share2,
  Star,
  Store,
  Truck,
  Upload,
  Volume2,
} from 'lucide-react';
import ThemeColorsPanel from '../ThemeColorsPanel';
import { normalizeHexColor } from '../../utils/colorUtils';
import type { RestaurantCardStyle } from '../../types/restaurant';

type StudioTab = 'aparencia' | 'informacoes' | 'banners';

interface PersonalizationStudioProps {
  restaurantName: string;
  description: string;
  address: string;
  logoUrl: string;
  bannerUrl: string;
  audioUrl: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  cardStyle: RestaurantCardStyle;
  storeHref?: string;
  onNavigateTab?: (tabId: string) => void;
  saving: boolean;
  storeOpen?: boolean;
  extractedColors: { primaryColor: string; secondaryColor: string; palette: string[] } | null;
  extractingColors: boolean;
  onName: (value: string) => void;
  onDescription: (value: string) => void;
  onAddress: (value: string) => void;
  onPrimary: (value: string) => void;
  onSecondary: (value: string) => void;
  onBackground: (value: string) => void;
  onCardStyle: (value: RestaurantCardStyle) => void;
  onLogoFile: (file: File) => void;
  onBannerFile: (file: File) => void;
  onRemoveLogo: () => void;
  onRemoveBanner: () => void;
  onAudioFile: (file: File) => void;
  onRemoveAudio: () => void;
  onExtractColors: () => void;
  onSave: () => void;
}

const TABS: { id: StudioTab | 'horarios' | 'taxas'; label: string; icon: typeof Store }[] = [
  { id: 'aparencia', label: 'Aparência', icon: Palette },
  { id: 'informacoes', label: 'Informações', icon: Info },
  { id: 'banners', label: 'Banners', icon: ImagePlus },
  { id: 'horarios', label: 'Horários', icon: Clock },
  { id: 'taxas', label: 'Taxas e entrega', icon: Truck },
];

const CARD_STYLES: {
  id: RestaurantCardStyle;
  label: string;
  description: string;
}[] = [
  { id: 'padrao', label: 'Padrão', description: 'Imagem grande e informações completas.' },
  { id: 'compacto', label: 'Compacto', description: 'Mais itens na tela.' },
  { id: 'moderno', label: 'Moderno', description: 'Visual mais limpo e atual.' },
];

function ColorSwatch({
  label,
  value,
  fallback,
  onChange,
}: {
  label: string;
  value: string;
  fallback: string;
  onChange: (value: string) => void;
}) {
  const colorRef = useRef<HTMLInputElement>(null);
  const display = normalizeHexColor(value) || fallback;
  const [hex, setHex] = useState(display);

  useEffect(() => {
    setHex(display);
  }, [display]);

  return (
    <div>
      <p className="text-xs font-medium text-gray-600 mb-1.5">{label}</p>
      <button
        type="button"
        onClick={() => colorRef.current?.click()}
        className="block w-11 h-11 rounded-xl border border-black/10 shadow-inner"
        style={{ backgroundColor: display }}
        aria-label={`Escolher ${label}`}
      />
      <input
        ref={colorRef}
        type="color"
        value={display}
        onChange={(event) => onChange(event.target.value)}
        className="sr-only"
        tabIndex={-1}
      />
      <input
        value={hex}
        onChange={(event) => setHex(event.target.value)}
        onBlur={() => {
          const normalized = normalizeHexColor(hex);
          if (normalized) onChange(normalized);
          else setHex(display);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
        }}
        className="mt-1.5 w-[86px] bg-transparent text-xs font-mono uppercase text-gray-700 outline-none border-b border-transparent focus:border-[#e10600]"
        aria-label={`Código hexadecimal da ${label}`}
      />
    </div>
  );
}

function LogoDrop({
  hint,
  onFile,
  preview,
  onRemove,
}: {
  hint: string;
  onFile: (file: File) => void;
  preview?: string;
  onRemove?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        const file = event.dataTransfer.files?.[0];
        if (file) onFile(file);
      }}
      className={`rounded-2xl border-2 border-dashed px-4 py-5 text-center ${
        over ? 'border-[#e10600] bg-[#fff5f5]' : 'border-[#e7ddd0] bg-white/60'
      }`}
    >
      <Upload className="w-6 h-6 mx-auto text-gray-500" />
      <p className="text-sm font-semibold text-gray-800 mt-2">Enviar logo</p>
      <p className="text-[11px] text-gray-500 mt-1">{hint}</p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#111111] text-white px-3.5 py-2 text-xs font-semibold"
      >
        <ImagePlus className="w-3.5 h-3.5" />
        Escolher arquivo
      </button>
      {preview && onRemove && (
        <button type="button" onClick={onRemove} className="block mx-auto mt-2.5 text-xs text-red-600">
          Remover logo
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = '';
        }}
      />
    </div>
  );
}

function CoverDrop({
  preview,
  onFile,
  onRemove,
}: {
  preview?: string;
  onFile: (file: File) => void;
  onRemove?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="relative rounded-2xl overflow-hidden border border-[#eadfd4] min-h-[150px] bg-[#2a211c]">
      {preview ? (
        <img src={preview} alt="" className="w-full h-44 object-cover" />
      ) : (
        <img src="/cardapio-digital/burger.jpg" alt="" className="w-full h-44 object-cover opacity-70" />
      )}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-gray-900 shadow"
      >
        <ImagePlus className="w-3.5 h-3.5" />
        {preview ? 'Alterar imagem' : 'Adicionar foto de capa'}
      </button>
      {preview && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-2 right-2 text-xs bg-white/90 rounded-full px-2.5 py-1 text-red-600 shadow"
        >
          Remover
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = '';
        }}
      />
    </div>
  );
}

function DescriptionBox({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (ref.current.innerText === value) return;
    if (document.activeElement === ref.current) return;
    ref.current.innerText = value;
  }, [value]);

  function sync() {
    const text = (ref.current?.innerText || '').replace(/\u00a0/g, ' ').slice(0, 500);
    if ((ref.current?.innerText || '').length > 500 && ref.current) {
      ref.current.innerText = text;
    }
    onChange(text);
  }

  function format(command: 'bold' | 'italic' | 'insertUnorderedList') {
    ref.current?.focus();
    document.execCommand(command);
    sync();
  }

  return (
    <div className="rounded-2xl border border-[#eadfd4] overflow-hidden bg-white text-gray-900">
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-[#f0e7df] bg-[#faf7f4] text-gray-700">
        <button type="button" aria-label="Negrito" onClick={() => format('bold')} className="w-8 h-8 rounded-lg hover:bg-white grid place-items-center">
          <Bold className="w-4 h-4" />
        </button>
        <button type="button" aria-label="Itálico" onClick={() => format('italic')} className="w-8 h-8 rounded-lg hover:bg-white grid place-items-center">
          <Italic className="w-4 h-4" />
        </button>
        <button type="button" aria-label="Lista" onClick={() => format('insertUnorderedList')} className="w-8 h-8 rounded-lg hover:bg-white grid place-items-center">
          <List className="w-4 h-4" />
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        role="textbox"
        aria-label="Descrição do restaurante"
        data-placeholder="Ex.: Hamburgueria artesanal, ingredientes selecionados, em um ambiente acolhedor."
        onInput={sync}
        className="min-h-[110px] px-3 py-3 text-sm text-gray-900 bg-white outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-500"
      />
      <p className="text-right text-[11px] text-gray-500 px-3 pb-2">{value.length}/500</p>
    </div>
  );
}

const SAMPLE_DISHES = [
  {
    name: 'Prato da casa',
    description: 'Receita especial, ingredientes selecionados.',
    price: 'R$ 45,90',
    image: '/cardapio-digital/burger.jpg',
  },
  {
    name: 'Favorito dos clientes',
    description: 'O mais pedido da semana na sua loja.',
    price: 'R$ 49,90',
    image: '/cardapio-digital/pizza.jpg',
  },
];

function PhonePreview(props: PersonalizationStudioProps & { name: string }) {
  /*
   * A prévia é uma moldura de referência do produto, não uma segunda edição do
   * tema. Ela fica sempre clara e estável para manter todos os textos legíveis,
   * inclusive enquanto o restaurante experimenta cores muito escuras.
   */
  const primary = '#0f172a';
  const background = '#fff8f2';
  const accent = '#f97316';
  const foreground = '#111827';
  const mutedForeground = '#4b5563';
  const subduedForeground = '#6b7280';
  const divider = 'rgba(0,0,0,0.10)';
  const cardBackground = '#ffffff';
  const cardText = '#111827';
  const cardMuted = '#6b7280';
  const primaryText = '#ffffff';
  const bannerText = '#ffffff';
  const accentText = accent;
  const cover = props.bannerUrl || '/cardapio-digital/pizza.jpg';
  const dishes = SAMPLE_DISHES.map((dish, index) =>
    index === 0 && props.bannerUrl ? { ...dish, image: props.bannerUrl } : dish
  );

  return (
    <div className="mx-auto w-full max-w-[360px]">
      <div className="rounded-[46px] bg-black p-[10px] shadow-[0_30px_60px_rgba(0,0,0,0.45)] ring-1 ring-white/20">
        <div
          className="preview-phone-static relative overflow-hidden rounded-[38px]"
          style={{ backgroundColor: background, color: foreground }}
        >
          <div className="relative h-[660px] overflow-y-auto scrollbar-hide pb-24">
            <div className="relative h-40 shrink-0">
              <img src={cover} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/10" />
              <div
                className="absolute top-0 inset-x-0 flex items-center justify-between px-5 pt-3 text-white text-[11px] font-semibold"
                style={{ color: '#ffffff' }}
              >
                <span>9:41</span>
                <span className="tracking-widest">●●●</span>
              </div>
              <div className="absolute top-9 inset-x-0 flex items-center justify-between px-4">
                <span
                  className="w-8 h-8 rounded-full bg-black/45 backdrop-blur ring-1 ring-white/40 grid place-items-center text-white"
                  style={{ color: '#ffffff' }}
                >
                  <ArrowLeft className="w-4 h-4" />
                </span>
                <span className="flex gap-2 text-white" style={{ color: '#ffffff' }}>
                  <span
                    className="w-8 h-8 rounded-full bg-black/45 backdrop-blur ring-1 ring-white/40 grid place-items-center"
                    style={{ color: '#ffffff' }}
                  >
                    <Share2 className="w-4 h-4" />
                  </span>
                  <span
                    className="w-8 h-8 rounded-full bg-black/45 backdrop-blur ring-1 ring-white/40 grid place-items-center"
                    style={{ color: '#ffffff' }}
                  >
                    <Heart className="w-4 h-4" />
                  </span>
                </span>
              </div>
              <span
                className="absolute bottom-2 right-3 rounded-full bg-black/45 backdrop-blur px-2 py-0.5 text-[9px] font-medium text-white"
                style={{ color: '#ffffff' }}
              >
                Prévia ilustrativa
              </span>
            </div>

            <div className="px-4">
              <div className="flex items-end justify-between">
                {props.logoUrl ? (
                  <img
                    src={props.logoUrl}
                    alt=""
                    className="w-[76px] h-[76px] -mt-10 rounded-full object-cover border-4 border-white bg-white shadow-lg relative"
                  />
                ) : (
                  <span
                    className="w-[76px] h-[76px] -mt-10 rounded-full border-4 border-white shadow-lg relative grid place-items-center text-white text-lg font-black"
                    style={{ backgroundColor: primary, color: '#ffffff' }}
                  >
                    {props.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
                {props.storeOpen && (
                  <span className="mt-2 shrink-0 text-[10px] font-bold text-emerald-700 bg-emerald-100 rounded-full px-2 py-1">
                    Aberto
                  </span>
                )}
              </div>

              <h3 className="mt-2 text-[22px] leading-tight font-black tracking-tight">{props.name}</h3>
              <p className="mt-1 flex items-center gap-1 text-xs font-semibold" style={{ color: accentText }}>
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                4.8
                <span className="font-normal" style={{ color: mutedForeground }}>(256 avaliações)</span>
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]" style={{ color: mutedForeground }}>
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> 30-45 min
                </span>
                <span className="inline-flex items-center gap-1">
                  <Bike className="w-3.5 h-3.5" /> R$ 5,00
                </span>
                <span>Pedido mínimo R$ 15,00</span>
              </div>
              {props.address.trim() && (
                <p className="mt-1.5 flex items-center gap-1 text-[11px]" style={{ color: subduedForeground }}>
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{props.address}</span>
                </p>
              )}

              <div className="mt-4 flex gap-4 border-b text-[13px]" style={{ borderColor: divider }}>
                {['Destaques', 'Pratos', 'Bebidas', 'Promoções'].map((label, index) => (
                  <span
                    key={label}
                    className={`pb-2 ${index === 0 ? 'font-bold border-b-2' : ''}`}
                    style={index === 0
                      ? { color: primary, borderColor: primary }
                      : { color: subduedForeground }}
                  >
                    {label}
                  </span>
                ))}
              </div>

              <div className="relative mt-4 h-[118px] overflow-hidden rounded-2xl">
                <img src={cover} alt="" className="h-full w-full object-cover" />
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(90deg, ${accent} 0%, ${accent}cc 38%, transparent 78%)`,
                  }}
                />
                <div className="absolute inset-y-0 left-0 flex w-[62%] flex-col justify-center px-4" style={{ color: bannerText }}>
                  <p className="text-lg font-black leading-tight">Sabor que conecta</p>
                  <p className="mt-1 text-[9px] uppercase tracking-wide opacity-75">
                    Feito para pedir de novo
                  </p>
                  <span
                    className="mt-2 w-fit rounded-full px-2.5 py-1 text-[10px] font-bold"
                    style={{ backgroundColor: primary, color: primaryText }}
                  >
                    Pedir agora
                  </span>
                </div>
              </div>

              <h4 className="mt-5 text-[15px] font-extrabold">Destaques da casa</h4>
              {props.cardStyle === 'compacto' ? (
                <div className="mt-2.5 space-y-2">
                  {dishes.map((dish) => (
                    <div key={dish.name} className="flex gap-3 rounded-2xl p-2.5 shadow-sm" style={{ backgroundColor: cardBackground, color: cardText }}>
                      <img src={dish.image} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold leading-tight">{dish.name}</p>
                        <p className="text-[10px] line-clamp-1 mt-0.5" style={{ color: cardMuted }}>{dish.description}</p>
                        <p className="text-xs font-extrabold mt-1">{dish.price}</p>
                      </div>
                      <span
                        className="self-center w-7 h-7 rounded-full grid place-items-center shrink-0"
                        style={{ backgroundColor: primary, color: primaryText }}
                      >
                        <Plus className="w-4 h-4" />
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                  {dishes.map((dish) => (
                    <div
                      key={dish.name}
                      className={
                        props.cardStyle === 'moderno'
                          ? 'rounded-[20px] p-1.5 shadow-sm'
                          : 'overflow-hidden rounded-2xl shadow-sm'
                      }
                      style={{ backgroundColor: cardBackground, color: cardText }}
                    >
                      <img
                        src={dish.image}
                        alt=""
                        className={
                          props.cardStyle === 'moderno'
                            ? 'h-[104px] w-full rounded-2xl object-cover'
                            : 'h-24 w-full object-cover'
                        }
                      />
                      <div className="p-2">
                        <p className="text-xs font-bold leading-tight">{dish.name}</p>
                        <p className="text-[10px] line-clamp-2 mt-0.5" style={{ color: cardMuted }}>{dish.description}</p>
                        <div className="mt-1.5 flex items-center justify-between">
                          <span className="text-xs font-extrabold">{dish.price}</span>
                          <span
                            className="w-6 h-6 rounded-full grid place-items-center"
                            style={{ backgroundColor: primary, color: primaryText }}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="absolute bottom-3 inset-x-3">
            <div
              className="rounded-full py-3 text-center text-sm font-bold shadow-xl"
              style={{ backgroundColor: primary, color: primaryText }}
            >
              Ver carrinho &nbsp;•&nbsp; R$ 0,00
            </div>
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-[11px] text-white/45">
        Prévia com a sua logo, capa e cores. Salve para publicar na loja.
      </p>
    </div>
  );
}

export default function PersonalizationStudio(props: PersonalizationStudioProps) {
  const [tab, setTab] = useState<StudioTab>('aparencia');
  const name = props.restaurantName.trim() || 'Seu restaurante';
  const primary = normalizeHexColor(props.primaryColor) || '#e10600';

  function handleTab(id: StudioTab | 'horarios' | 'taxas') {
    if (id === 'horarios') {
      props.onNavigateTab?.('horarios');
      return;
    }
    if (id === 'taxas') {
      props.onNavigateTab?.('delivery');
      return;
    }
    setTab(id);
  }

  return (
    <div className="studio-dark rounded-[28px] bg-[#0b0b0e] px-3 py-5 sm:px-5 sm:py-6 text-white shadow-xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-[28px] font-black tracking-tight leading-tight">
            Personalização do Marketplace
          </h1>
          <p className="text-sm text-white/55 mt-1">Deixe sua loja com a cara do seu restaurante.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {props.storeHref && (
            <a
              href={props.storeHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/10"
            >
              Ver minha loja
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <button
            type="button"
            onClick={props.onSave}
            disabled={props.saving}
            className="rounded-full bg-[#e10600] px-4 py-2 text-xs font-bold text-white disabled:opacity-60 hover:bg-[#c70500]"
          >
            {props.saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      <div className="mt-5 flex gap-1 overflow-x-auto rounded-full border border-white/10 bg-white/[0.04] p-1 scrollbar-hide">
        {TABS.map((item) => {
          const Icon = item.icon;
          const active = item.id === tab;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleTab(item.id)}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] transition ${
                active
                  ? 'bg-[#e10600] text-white font-semibold shadow-[0_6px_18px_rgba(225,6,0,0.35)]'
                  : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_370px] items-start">
        <div className="min-w-0 rounded-[24px] bg-[#fff8ec] p-4 sm:p-5 text-gray-900 shadow-inner">
          {tab === 'aparencia' && (
            <div className="space-y-7">
              <section>
                <h2 className="font-extrabold text-gray-900">Cores da sua loja</h2>
                <p className="text-xs text-gray-500 mt-0.5">Escolha as cores que combinam com a sua marca.</p>
                <div className="mt-3 flex flex-wrap gap-6">
                  <ColorSwatch label="Cor principal" value={props.primaryColor} fallback="#e10600" onChange={props.onPrimary} />
                  <ColorSwatch label="Cor secundária" value={props.secondaryColor} fallback="#111111" onChange={props.onSecondary} />
                  <ColorSwatch label="Cor de fundo" value={props.backgroundColor} fallback="#fff6ed" onChange={props.onBackground} />
                </div>
              </section>

              <section>
                <h2 className="font-extrabold text-gray-900">Logo do restaurante</h2>
                <p className="text-xs text-gray-500 mt-0.5">Use uma imagem quadrada (mín. 512x512px).</p>
                <div className="mt-3 grid sm:grid-cols-2 gap-3">
                  <LogoDrop
                    hint="PNG, JPG ou WEBP (máx. 5 MB)"
                    preview={props.logoUrl}
                    onFile={props.onLogoFile}
                    onRemove={props.onRemoveLogo}
                  />
                  <div className="rounded-2xl border border-[#e7ddd0] bg-white/60 grid place-items-center px-4 py-5">
                    {props.logoUrl ? (
                      <img src={props.logoUrl} alt="" className="w-28 h-28 rounded-full object-cover shadow" />
                    ) : (
                      <span
                        className="w-28 h-28 rounded-full grid place-items-center text-white text-2xl font-black shadow"
                        style={{ backgroundColor: primary }}
                      >
                        {name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <p className="mt-2 max-w-full truncate text-xs font-semibold text-gray-700">{name}</p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="font-extrabold text-gray-900">Imagem de capa</h2>
                <p className="text-xs text-gray-500 mt-0.5 mb-3">Resolução ideal: 1200 x 400px.</p>
                <CoverDrop preview={props.bannerUrl} onFile={props.onBannerFile} onRemove={props.onRemoveBanner} />
              </section>

              <section>
                <h2 className="font-extrabold text-gray-900">Card de destaque</h2>
                <p className="text-xs text-gray-500 mt-0.5">Escolha como seus pratos aparecem na loja.</p>
                <div className="mt-3 grid sm:grid-cols-3 gap-3" role="radiogroup" aria-label="Estilo do card de produto">
                  {CARD_STYLES.map((style) => {
                    const selected = props.cardStyle === style.id;
                    return (
                      <button
                        key={style.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => props.onCardStyle(style.id)}
                        className={`relative rounded-2xl border-2 bg-white p-2.5 text-left transition ${
                          selected
                            ? 'border-[#e10600] ring-2 ring-[#e10600]/15'
                            : 'border-[#eadfd4] hover:border-[#d8c9b8]'
                        }`}
                      >
                        {selected && (
                          <span className="absolute -top-2 -right-2 z-10 w-6 h-6 rounded-full bg-[#e10600] text-white grid place-items-center shadow">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        )}
                        {style.id === 'compacto' ? (
                          <span className="flex items-center gap-2 rounded-xl bg-[#fff8ec] p-1.5">
                            <img src="/cardapio-digital/burger.jpg" alt="" className="w-10 h-10 rounded-lg object-cover" />
                            <span className="min-w-0">
                              <span className="block h-2 w-14 rounded bg-gray-800/80" />
                              <span className="mt-1.5 block h-1.5 w-10 rounded bg-gray-400/70" />
                            </span>
                          </span>
                        ) : (
                          <span className={`block overflow-hidden ${style.id === 'moderno' ? 'rounded-[16px] p-1 bg-[#fff8ec]' : ''}`}>
                            <img
                              src="/cardapio-digital/burger.jpg"
                              alt=""
                              className={`w-full object-cover ${style.id === 'moderno' ? 'h-16 rounded-xl' : 'h-16 rounded-xl'}`}
                            />
                            <span className="mt-1.5 block h-2 w-16 rounded bg-gray-800/80" />
                            <span className="mt-1 block h-1.5 w-11 rounded bg-gray-400/70" />
                          </span>
                        )}
                        {style.id !== 'compacto' && (
                          <span className="mt-2 flex items-center justify-between px-0.5">
                            <span className="text-[10px] font-extrabold text-gray-800">R$ 45,90</span>
                            <span
                              className="w-5 h-5 rounded-full grid place-items-center text-white"
                              style={{ backgroundColor: primary }}
                            >
                              <Plus className="w-3 h-3" />
                            </span>
                          </span>
                        )}
                        <span className={`block mt-2 text-sm font-bold ${selected ? 'text-[#e10600]' : 'text-gray-900'}`}>
                          {style.label}
                        </span>
                        <span className="block text-[11px] leading-snug text-gray-500">{style.description}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <details className="rounded-2xl border border-[#eadfd4] bg-white/70 px-4 py-3">
                <summary className="cursor-pointer text-sm font-bold text-gray-800">
                  Paleta avançada, temas prontos e cores do banner
                </summary>
                <div className="pt-4">
                  <ThemeColorsPanel
                    primaryColor={props.primaryColor}
                    secondaryColor={props.backgroundColor}
                    onPrimaryChange={props.onPrimary}
                    onSecondaryChange={props.onBackground}
                    extractedColors={props.extractedColors}
                    bannerUrl={props.bannerUrl}
                    onExtractColors={props.onExtractColors}
                    isExtractingColors={props.extractingColors}
                  />
                </div>
              </details>
            </div>
          )}

          {tab === 'informacoes' && (
            <div className="space-y-4">
              <div>
                <h2 className="font-extrabold text-gray-900">Informações da loja</h2>
                <p className="text-xs text-gray-500 mt-0.5">Nome, endereço e descrição exibidos para os clientes.</p>
              </div>
              <label className="block">
                <span className="text-sm font-semibold text-gray-800">Nome do restaurante</span>
                <input
                  value={props.restaurantName}
                  onChange={(event) => props.onName(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#eadfd4] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#e10600]"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-gray-800">Endereço</span>
                <input
                  value={props.address}
                  onChange={(event) => props.onAddress(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#eadfd4] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#e10600]"
                />
              </label>
              <div>
                <span className="text-sm font-semibold text-gray-800">Descrição do restaurante</span>
                <div className="mt-1">
                  <DescriptionBox value={props.description} onChange={props.onDescription} />
                </div>
              </div>
            </div>
          )}

          {tab === 'banners' && (
            <div className="space-y-6">
              <section>
                <h2 className="font-extrabold text-gray-900">Banner da loja</h2>
                <p className="text-xs text-gray-500 mt-0.5 mb-3">
                  A foto de capa aparece no topo da sua loja. Resolução ideal: 1200 x 400px.
                </p>
                <CoverDrop preview={props.bannerUrl} onFile={props.onBannerFile} onRemove={props.onRemoveBanner} />
                <button
                  type="button"
                  onClick={props.onExtractColors}
                  disabled={props.extractingColors || !props.bannerUrl}
                  className="mt-3 rounded-full border border-[#eadfd4] bg-white px-3.5 py-2 text-xs font-semibold text-gray-800 disabled:opacity-50"
                >
                  {props.extractingColors ? 'Extraindo cores...' : 'Extrair cores deste banner'}
                </button>
              </section>

              <section className="rounded-2xl border border-[#eadfd4] bg-white/70 p-4">
                <h2 className="font-extrabold text-gray-900">Áudio de boas-vindas</h2>
                <p className="text-xs text-gray-500 mt-0.5">Toca quando o cliente abre o cardápio da mesa. MP3, até 10 MB.</p>
                {props.audioUrl && (
                  <div className="mt-3 flex items-center gap-3">
                    <Volume2 className="w-5 h-5 text-[#e10600] shrink-0" />
                    <audio controls className="h-8 flex-1 min-w-0" src={props.audioUrl} />
                    <button type="button" onClick={props.onRemoveAudio} className="text-sm text-red-600 shrink-0">
                      Remover
                    </button>
                  </div>
                )}
                <label className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#eadfd4] bg-white px-3.5 py-2 text-xs font-semibold cursor-pointer">
                  <Music className="w-4 h-4" />
                  {props.audioUrl ? 'Trocar áudio' : 'Adicionar áudio'}
                  <input
                    type="file"
                    accept="audio/mpeg,audio/mp3"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) props.onAudioFile(file);
                      event.target.value = '';
                    }}
                  />
                </label>
              </section>
            </div>
          )}

          <p className="mt-6 flex items-center gap-2 text-[11px] text-gray-500">
            <CloudUpload className="w-3.5 h-3.5 shrink-0" />
            As alterações aparecem na prévia ao lado. Clique em Salvar para publicar na loja.
          </p>
        </div>

        <div className="xl:sticky xl:top-2">
          <PhonePreview {...props} name={name} />
        </div>
      </div>
    </div>
  );
}
