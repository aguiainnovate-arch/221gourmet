import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, X, Check } from 'lucide-react';
import {
  DELIVERY_LOCATION_PRESETS,
  type DeliveryLocation,
} from '../../utils/deliveryLocationStorage';

interface Props {
  open: boolean;
  current: DeliveryLocation;
  onClose: () => void;
  onSave: (location: DeliveryLocation) => void;
}

export default function DeliveryLocationModal({ open, current, onClose, onSave }: Props) {
  const { t } = useTranslation();
  const [customNeighborhood, setCustomNeighborhood] = useState('');
  const [customCity, setCustomCity] = useState('');
  const [selected, setSelected] = useState<DeliveryLocation>(current);

  useEffect(() => {
    if (!open) return;
    setSelected(current);
    setCustomCity(current.city);
    setCustomNeighborhood(current.neighborhood ?? '');
  }, [open, current]);

  if (!open) return null;

  const applyCustom = () => {
    const city = customCity.trim();
    const neighborhood = customNeighborhood.trim();
    if (!city) return;
    const label = neighborhood ? `${city} — ${neighborhood}` : city;
    onSave({ label, city, neighborhood: neighborhood || undefined });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label={t('delivery.cancel')}
        onClick={onClose}
      />
      <div
        className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border shadow-2xl overflow-hidden max-h-[85dvh] flex flex-col"
        style={{ backgroundColor: '#FFF8F2', borderColor: '#E9D7C4' }}
      >
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: '#E9D7C4' }}
        >
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5" style={{ color: '#E91120' }} />
            <h2 className="font-bold text-base" style={{ color: '#2A1E1A' }}>
              {t('delivery.locationModalTitle')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: '#FAF0DB', color: '#6B5A54' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <p className="text-sm" style={{ color: '#6B5A54' }}>
            {t('delivery.locationModalHint')}
          </p>

          <div className="space-y-2">
            {DELIVERY_LOCATION_PRESETS.map((preset) => {
              const active = selected.label === preset.label;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setSelected(preset);
                    onSave(preset);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between gap-2 px-3 py-3 rounded-xl border-2 text-left transition-all active:scale-[0.99]"
                  style={
                    active
                      ? { borderColor: '#E91120', backgroundColor: 'rgba(233,17,32,0.08)' }
                      : { borderColor: '#E9D7C4', backgroundColor: '#FAF0DB' }
                  }
                >
                  <span className="text-sm font-semibold" style={{ color: '#2A1E1A' }}>
                    {preset.label}
                  </span>
                  {active ? <Check className="w-4 h-4 shrink-0" style={{ color: '#E91120' }} /> : null}
                </button>
              );
            })}
          </div>

          <div
            className="rounded-xl border p-3 space-y-3"
            style={{ borderColor: '#E9D7C4', backgroundColor: '#FAF0DB' }}
          >
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#6B5A54' }}>
              {t('delivery.locationCustom')}
            </p>
            <input
              type="text"
              value={customCity}
              onChange={(e) => setCustomCity(e.target.value)}
              placeholder={t('delivery.cityPlaceholder')}
              className="w-full px-3 py-2.5 rounded-xl border text-sm"
              style={{ borderColor: '#E9D7C4', backgroundColor: '#FFFFFF', color: '#2A1E1A' }}
            />
            <input
              type="text"
              value={customNeighborhood}
              onChange={(e) => setCustomNeighborhood(e.target.value)}
              placeholder={t('delivery.neighborhoodPlaceholder')}
              className="w-full px-3 py-2.5 rounded-xl border text-sm"
              style={{ borderColor: '#E9D7C4', backgroundColor: '#FFFFFF', color: '#2A1E1A' }}
            />
            <button
              type="button"
              onClick={applyCustom}
              disabled={!customCity.trim()}
              className="w-full py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-50"
              style={{ backgroundColor: '#E91120' }}
            >
              {t('delivery.locationUseCustom')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
