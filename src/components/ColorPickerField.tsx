import { useEffect, useId, useRef, useState } from 'react';
import { Check, Copy, Pipette } from 'lucide-react';
import { generateColorVariations, isValidHexColor, normalizeHexColor } from '../utils/colorUtils';

interface ColorPickerFieldProps {
  label: string;
  description: string;
  value: string;
  fallback: string;
  onChange: (color: string) => void;
  presets?: string[];
}

export default function ColorPickerField({
  label,
  description,
  value,
  fallback,
  onChange,
  presets = [],
}: ColorPickerFieldProps) {
  const inputId = useId();
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [hexInput, setHexInput] = useState(value || fallback);
  const [copied, setCopied] = useState(false);

  const displayColor = isValidHexColor(value) ? normalizeHexColor(value)! : fallback;
  const variations = generateColorVariations(displayColor);
  const variationKeys = ['100', '300', '500', '700', '900'] as const;

  useEffect(() => {
    setHexInput(value || fallback);
  }, [value, fallback]);

  const commitHex = (raw: string) => {
    const normalized = normalizeHexColor(raw);
    if (normalized) {
      onChange(normalized);
      setHexInput(normalized);
      return;
    }
    setHexInput(value || fallback);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayColor);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/60 overflow-hidden">
      <button
        type="button"
        onClick={() => colorInputRef.current?.click()}
        className="group relative w-full h-24 block"
        aria-label={`Selecionar ${label}`}
      >
        <div className="absolute inset-0" style={{ backgroundColor: displayColor }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-white/10" />
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          <div className="text-left">
            <p className="text-sm font-semibold text-white drop-shadow-sm">{label}</p>
            <p className="text-xs font-mono text-white/90 drop-shadow-sm">{displayColor}</p>
          </div>
          <span className="flex items-center gap-1.5 rounded-lg bg-white/90 px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
            <Pipette className="w-3.5 h-3.5" />
            Escolher
          </span>
        </div>
        <input
          ref={colorInputRef}
          id={inputId}
          type="color"
          value={displayColor}
          onChange={(e) => onChange(e.target.value)}
          className="sr-only"
          tabIndex={-1}
        />
      </button>

      <div className="p-4 space-y-3 bg-white">
        <div className="flex gap-2">
          <div className="flex flex-1 items-center rounded-lg border border-gray-300 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
            <span className="pl-3 pr-1 text-sm font-mono text-gray-400 select-none">#</span>
            <input
              type="text"
              value={hexInput.replace(/^#/, '')}
              onChange={(e) => {
                const next = e.target.value.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6);
                setHexInput(next ? `#${next}` : '');
              }}
              onBlur={() => commitHex(hexInput)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              placeholder={fallback.replace(/^#/, '')}
              className="flex-1 py-2 pr-3 text-sm font-mono text-gray-900 outline-none uppercase"
              maxLength={6}
            />
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 p-2.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            title="Copiar código"
          >
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        <p className="text-xs text-gray-500 leading-relaxed">{description}</p>

        <div>
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-2">Tons gerados</p>
          <div className="flex rounded-lg overflow-hidden border border-gray-200 h-6">
            {variationKeys.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => onChange(
                  typeof variations[key] === 'string' && variations[key].startsWith('rgb')
                    ? rgbToHex(variations[key] as string)
                    : displayColor
                )}
                className="flex-1 hover:scale-y-125 transition-transform origin-bottom"
                style={{ backgroundColor: variations[key] }}
                title={`Tom ${key}`}
              />
            ))}
          </div>
        </div>

        {presets.length > 0 && (
          <div>
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-2">Sugestões</p>
            <div className="flex flex-wrap gap-2">
              {presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onChange(preset)}
                  className={`w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 ${
                    displayColor === preset ? 'border-blue-500 ring-2 ring-blue-200' : 'border-white shadow-sm'
                  }`}
                  style={{ backgroundColor: preset }}
                  title={preset}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function rgbToHex(rgb: string): string {
  const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return '#000000';
  const [, r, g, b] = match;
  return `#${[r, g, b].map((n) => Number(n).toString(16).padStart(2, '0')).join('')}`;
}
