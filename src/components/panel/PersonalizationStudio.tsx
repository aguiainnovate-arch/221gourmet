import { useEffect, useRef, useState } from 'react';
import {
  Bold,
  CloudUpload,
  Eye,
  ImagePlus,
  Italic,
  List,
  Music,
  Paintbrush,
  Star,
  Store,
  Volume2,
} from 'lucide-react';
import ThemeColorsPanel from '../ThemeColorsPanel';
import MenuPreview from '../MenuPreview';

type StudioTab = 'identidade' | 'informacoes' | 'cores' | 'destaques' | 'previa';

interface PersonalizationStudioProps {
  restaurantName: string;
  description: string;
  address: string;
  logoUrl: string;
  bannerUrl: string;
  audioUrl: string;
  primaryColor: string;
  secondaryColor: string;
  saving: boolean;
  storeOpen?: boolean;
  extractedColors: { primaryColor: string; secondaryColor: string; palette: string[] } | null;
  extractingColors: boolean;
  onName: (value: string) => void;
  onDescription: (value: string) => void;
  onAddress: (value: string) => void;
  onPrimary: (value: string) => void;
  onSecondary: (value: string) => void;
  onLogoFile: (file: File) => void;
  onBannerFile: (file: File) => void;
  onRemoveLogo: () => void;
  onRemoveBanner: () => void;
  onAudioFile: (file: File) => void;
  onRemoveAudio: () => void;
  onExtractColors: () => void;
  onSave: () => void;
}

const TABS: { id: StudioTab; label: string; icon: typeof Store }[] = [
  { id: 'identidade', label: 'Identidade visual', icon: ImagePlus },
  { id: 'informacoes', label: 'Informações', icon: Store },
  { id: 'cores', label: 'Cores e tema', icon: Paintbrush },
  { id: 'destaques', label: 'Destaques', icon: Star },
  { id: 'previa', label: 'Prévia da loja', icon: Eye },
];

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
      className={`rounded-2xl border-2 border-dashed px-4 py-6 ${
        over ? 'border-[#e10600] bg-[#fff5f5]' : 'border-[#eadfd4] bg-[#fffdfb]'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {preview ? (
          <img src={preview} alt="" className="w-16 h-16 rounded-2xl object-cover" />
        ) : (
          <CloudUpload className="w-10 h-10 text-sky-500 shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-800">Arraste sua imagem aqui</p>
          <p className="text-xs text-gray-500">ou clique para escolher</p>
          <p className="text-[11px] text-gray-400 mt-1">{hint}</p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#e10600] text-white px-3 py-2 text-sm font-semibold shrink-0"
        >
          <ImagePlus className="w-4 h-4" />
          Escolher arquivo
        </button>
      </div>
      {preview && onRemove && (
        <button type="button" onClick={onRemove} className="mt-3 text-xs text-red-600">
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
    <div className="relative rounded-2xl overflow-hidden border border-[#eadfd4] min-h-[168px] bg-[#2a211c]">
      {preview ? (
        <img src={preview} alt="" className="w-full h-44 object-cover" />
      ) : (
        <div className="h-44 grid place-items-center text-xs text-white/50 px-6 text-center">
          A foto de capa da sua loja entra aqui
        </div>
      )}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow"
      >
        <ImagePlus className="w-4 h-4" />
        Adicionar foto de capa
      </button>
      {preview && onRemove && (
        <button type="button" onClick={onRemove} className="absolute top-2 right-2 text-xs bg-white/90 rounded-lg px-2 py-1 text-red-600">
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
    <div className="rounded-2xl border border-[#eadfd4] overflow-hidden">
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-[#f0e7df] bg-[#faf7f4]">
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
        className="min-h-[110px] px-3 py-3 text-sm outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400"
      />
      <p className="text-right text-[11px] text-gray-400 px-3 pb-2">{value.length}/500</p>
    </div>
  );
}

export default function PersonalizationStudio(props: PersonalizationStudioProps) {
  const [tab, setTab] = useState<StudioTab>('identidade');
  const name = props.restaurantName.trim() || 'Seu restaurante';

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900">Personalização</h1>
          <p className="text-sm text-gray-500 mt-1 max-w-xl">
            Deixe seu restaurante com a sua identidade. Essas informações são exibidas para seus clientes.
          </p>
        </div>
        <button
          type="button"
          onClick={props.onSave}
          disabled={props.saving}
          className="rounded-xl bg-[#e10600] text-white font-semibold px-4 py-2.5 text-sm disabled:opacity-60"
        >
          {props.saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-[#eadfd4] mb-4">
        {TABS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2.5 text-sm border-b-2 -mb-px ${
                active ? 'border-[#e10600] text-[#e10600] font-semibold' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === 'identidade' && (
        <div className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <section className="rounded-3xl bg-white border border-[#efe6dc] p-4">
              <h2 className="font-bold text-gray-900">Logo do restaurante</h2>
              <p className="text-xs text-gray-500 mt-1 mb-3">
                Use uma imagem nítida. De preferência com fundo transparente. Ela aparece para os clientes.
              </p>
              <LogoDrop
                hint="PNG, JPG ou WEBP (máx. 5 MB)"
                preview={props.logoUrl}
                onFile={props.onLogoFile}
                onRemove={props.onRemoveLogo}
              />
            </section>
            <section className="rounded-3xl bg-white border border-[#efe6dc] p-4">
              <h2 className="font-bold text-gray-900">Exemplo de como aparece</h2>
              <div className="mt-3 rounded-2xl overflow-hidden border border-[#efe6dc] bg-white text-gray-900">
                <div className="h-28 bg-[#2a211c] relative">
                  {props.bannerUrl ? (
                    <img src={props.bannerUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="h-full grid place-items-center text-xs text-white/50 px-4 text-center">
                      A foto de capa entra aqui
                    </div>
                  )}
                </div>
                <div className="p-3 flex items-center gap-3">
                  {props.logoUrl ? (
                    <img src={props.logoUrl} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-white -mt-8 bg-white" />
                  ) : (
                    <span className="w-12 h-12 rounded-full bg-[#e10600] text-white grid place-items-center text-xs font-bold -mt-8">
                      {name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold truncate">{name}</p>
                      {props.storeOpen && (
                        <span className="shrink-0 text-[10px] font-semibold text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5">
                          Aberto
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">Cardápio digital</p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <section className="rounded-3xl bg-white border border-[#efe6dc] p-4">
            <h2 className="font-bold text-gray-900">Foto de capa</h2>
            <p className="text-xs text-gray-500 mt-1 mb-3">
              Escolha uma foto que represente seu restaurante. Pode ser o ambiente, um prato ou um produto principal.
            </p>
            <CoverDrop preview={props.bannerUrl} onFile={props.onBannerFile} onRemove={props.onRemoveBanner} />
            <p className="text-[11px] text-gray-400 mt-2">Recomendado: 1200 x 400 px (máx. 5 MB)</p>
          </section>

          <section className="rounded-3xl bg-white border border-[#efe6dc] p-4">
            <h2 className="font-bold text-gray-900">Descrição do restaurante</h2>
            <p className="text-xs text-gray-500 mt-1 mb-3">
              Conte um pouco sobre o seu restaurante. Essa descrição será exibida para seus clientes.
            </p>
            <DescriptionBox value={props.description} onChange={props.onDescription} />
          </section>
        </div>
      )}

      {tab === 'informacoes' && (
        <section className="rounded-3xl bg-white border border-[#efe6dc] p-5 space-y-4 max-w-2xl">
          <label className="block">
            <span className="text-sm font-semibold text-gray-800">Nome do restaurante</span>
            <input
              value={props.restaurantName}
              onChange={(event) => props.onName(event.target.value)}
              className="mt-1 w-full rounded-xl border border-[#eadfd4] px-3 py-2.5 text-sm outline-none focus:border-[#e10600]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-gray-800">Endereço</span>
            <input
              value={props.address}
              onChange={(event) => props.onAddress(event.target.value)}
              className="mt-1 w-full rounded-xl border border-[#eadfd4] px-3 py-2.5 text-sm outline-none focus:border-[#e10600]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-gray-800">Descrição</span>
            <textarea
              value={props.description}
              maxLength={500}
              onChange={(event) => props.onDescription(event.target.value.slice(0, 500))}
              className="mt-1 w-full min-h-[100px] rounded-xl border border-[#eadfd4] px-3 py-2.5 text-sm outline-none focus:border-[#e10600]"
            />
          </label>
        </section>
      )}

      {tab === 'cores' && (
        <section className="rounded-3xl bg-white border border-[#efe6dc] p-5">
          <ThemeColorsPanel
            primaryColor={props.primaryColor}
            secondaryColor={props.secondaryColor}
            onPrimaryChange={props.onPrimary}
            onSecondaryChange={props.onSecondary}
            extractedColors={props.extractedColors}
            bannerUrl={props.bannerUrl}
            onExtractColors={props.onExtractColors}
            isExtractingColors={props.extractingColors}
          />
        </section>
      )}

      {tab === 'destaques' && (
        <section className="rounded-3xl bg-white border border-[#efe6dc] p-5 max-w-2xl space-y-3">
          <h2 className="font-bold text-gray-900">Áudio de boas-vindas</h2>
          <p className="text-sm text-gray-500">Toca quando o cliente abre o cardápio da mesa. MP3, até 10 MB.</p>
          {props.audioUrl && (
            <div className="flex items-center gap-3">
              <Volume2 className="w-5 h-5 text-[#e10600]" />
              <audio controls className="h-8 flex-1" src={props.audioUrl} />
              <button type="button" onClick={props.onRemoveAudio} className="text-sm text-red-600">
                Remover
              </button>
            </div>
          )}
          <label className="inline-flex items-center gap-2 rounded-xl border border-[#eadfd4] px-3 py-2 text-sm cursor-pointer">
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
      )}

      {tab === 'previa' && (
        <section className="rounded-3xl bg-white border border-[#efe6dc] p-4">
          <div className="max-h-[560px] overflow-y-auto bg-[#f6f1ea] p-4 rounded-2xl">
            <MenuPreview
              key={`${props.primaryColor}-${props.secondaryColor}-${props.bannerUrl}`}
              restaurantName={name}
              primaryColor={props.primaryColor || '#5c0b14'}
              secondaryColor={props.secondaryColor || '#f6f1ea'}
              bannerUrl={props.bannerUrl}
              className="shadow-xl"
            />
          </div>
        </section>
      )}
    </div>
  );
}
