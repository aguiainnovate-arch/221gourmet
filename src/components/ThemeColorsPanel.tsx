import { Sparkles } from 'lucide-react';
import ColorPickerField from './ColorPickerField';
import { normalizeHexColor } from '../utils/colorUtils';

export const THEME_PRESETS = [
  { id: 'wine', name: 'Vinho', primary: '#8b0000', secondary: '#fff8f0' },
  { id: 'ocean', name: 'Oceano', primary: '#1397c3', secondary: '#f0f9ff' },
  { id: 'forest', name: 'Floresta', primary: '#166534', secondary: '#f0fdf4' },
  { id: 'elegant', name: 'Elegante', primary: '#1e293b', secondary: '#f8fafc' },
  { id: 'sunset', name: 'Pôr do sol', primary: '#ea580c', secondary: '#fff7ed' },
  { id: 'royal', name: 'Real', primary: '#4b0082', secondary: '#f7f4fc' },
] as const;

const PRIMARY_PRESETS = ['#b82828', '#1e3a8a', '#166534', '#92400e', '#7c3aed', '#0f766e'];
const SECONDARY_PRESETS = ['#f3f4f6', '#fffbeb', '#f0f9ff', '#faf5ff', '#fef2f2', '#ecfdf5'];

interface ThemeColorsPanelProps {
  primaryColor: string;
  secondaryColor: string;
  onPrimaryChange: (color: string) => void;
  onSecondaryChange: (color: string) => void;
  extractedColors?: {
    primaryColor: string;
    secondaryColor: string;
    palette: string[];
  } | null;
  bannerUrl?: string;
  onExtractColors?: () => void;
  isExtractingColors?: boolean;
}

export default function ThemeColorsPanel({
  primaryColor,
  secondaryColor,
  onPrimaryChange,
  onSecondaryChange,
  extractedColors,
  bannerUrl,
  onExtractColors,
  isExtractingColors = false,
}: ThemeColorsPanelProps) {
  const primary = primaryColor || '#4b0082';
  const secondary = secondaryColor || '#f7f4fc';

  const applyPaletteColor = (color: string, target: 'primary' | 'secondary') => {
    const normalized = normalizeHexColor(color);
    if (!normalized) return;
    if (target === 'primary') onPrimaryChange(normalized);
    else onSecondaryChange(normalized);
  };

  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-1">Paleta de cores</h4>
        <p className="text-xs text-gray-500">
          Defina as cores que os clientes verão no cardápio digital
        </p>
      </div>

      {/* Prévia combinada */}
      <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div
          className="h-10 flex items-center px-4"
          style={{ backgroundColor: primary }}
        >
          <span className="text-sm font-semibold text-white drop-shadow-sm">Header do cardápio</span>
        </div>
        <div
          className="p-4 space-y-3"
          style={{ backgroundColor: secondary }}
        >
          <div className="flex gap-2">
            <span
              className="px-3 py-1 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: primary }}
            >
              Categoria ativa
            </span>
            <span
              className="px-3 py-1 rounded-full text-xs font-medium border"
              style={{ color: primary, borderColor: `${primary}40` }}
            >
              Categoria
            </span>
          </div>
          <div className="flex items-center justify-between bg-white/70 rounded-lg px-3 py-2">
            <span className="text-sm font-medium text-gray-800">Prato exemplo</span>
            <span className="text-sm font-bold" style={{ color: primary }}>
              R$ 32,90
            </span>
          </div>
        </div>
      </div>

      {/* Temas prontos */}
      <div>
        <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-2">
          Temas prontos
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {THEME_PRESETS.map((preset) => {
            const isActive =
              normalizeHexColor(primaryColor) === preset.primary &&
              normalizeHexColor(secondaryColor) === preset.secondary;

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  onPrimaryChange(preset.primary);
                  onSecondaryChange(preset.secondary);
                }}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all hover:shadow-md ${
                  isActive
                    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex shrink-0 rounded-md overflow-hidden border border-gray-200 w-10 h-7">
                  <div className="w-1/2 h-full" style={{ backgroundColor: preset.primary }} />
                  <div className="w-1/2 h-full" style={{ backgroundColor: preset.secondary }} />
                </div>
                <span className="text-xs font-medium text-gray-700 truncate">{preset.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Extração do banner */}
      {bannerUrl && onExtractColors && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h4 className="text-sm font-medium text-blue-900 mb-0.5">
                Extração automática
              </h4>
              <p className="text-xs text-blue-700">
                Use as cores dominantes do seu banner como ponto de partida
              </p>
            </div>
            <button
              type="button"
              onClick={onExtractColors}
              disabled={isExtractingColors}
              className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                isExtractingColors
                  ? 'bg-blue-200 text-blue-600 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              {isExtractingColors ? 'Extraindo...' : 'Extrair do banner'}
            </button>
          </div>
        </div>
      )}

      {/* Paleta extraída */}
      {extractedColors && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
          <div>
            <h4 className="text-sm font-medium text-emerald-900">Cores do banner</h4>
            <p className="text-xs text-emerald-700 mt-0.5">
              Clique em uma cor para aplicar como primária ou secundária
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {extractedColors.palette.map((color, index) => (
              <div key={`${color}-${index}`} className="flex flex-col items-center gap-1">
                <div className="flex rounded-lg overflow-hidden border border-emerald-200 shadow-sm">
                  <button
                    type="button"
                    onClick={() => applyPaletteColor(color, 'primary')}
                    className="w-8 h-8 hover:ring-2 hover:ring-emerald-400 transition-shadow"
                    style={{ backgroundColor: color }}
                    title={`Usar ${color} como primária`}
                  />
                  <button
                    type="button"
                    onClick={() => applyPaletteColor(color, 'secondary')}
                    className="w-3 h-8 bg-emerald-100 hover:bg-emerald-200 text-[8px] font-bold text-emerald-700 flex items-center justify-center"
                    title={`Usar ${color} como secundária`}
                  >
                    2
                  </button>
                </div>
                <span className="text-[10px] font-mono text-emerald-800">{color}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => applyPaletteColor(extractedColors.primaryColor, 'primary')}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-emerald-200 text-xs font-medium text-emerald-800 hover:bg-emerald-100 transition-colors"
            >
              <span
                className="w-4 h-4 rounded border border-emerald-300"
                style={{ backgroundColor: extractedColors.primaryColor }}
              />
              Aplicar primária sugerida
            </button>
            <button
              type="button"
              onClick={() => applyPaletteColor(extractedColors.secondaryColor, 'secondary')}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-emerald-200 text-xs font-medium text-emerald-800 hover:bg-emerald-100 transition-colors"
            >
              <span
                className="w-4 h-4 rounded border border-emerald-300"
                style={{ backgroundColor: extractedColors.secondaryColor }}
              />
              Aplicar secundária sugerida
            </button>
          </div>
        </div>
      )}

      {/* Seletores individuais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ColorPickerField
          label="Cor primária"
          description="Header, filtros ativos, preços e botões do cardápio"
          value={primaryColor}
          fallback="#4b0082"
          onChange={onPrimaryChange}
          presets={PRIMARY_PRESETS}
        />
        <ColorPickerField
          label="Cor secundária"
          description="Fundo da página do cardápio digital (área principal)"
          value={secondaryColor}
          fallback="#f7f4fc"
          onChange={onSecondaryChange}
          presets={SECONDARY_PRESETS}
        />
      </div>
    </div>
  );
}
