import { useState } from 'react';
import { MapPin, Plus, Trash2, Search } from 'lucide-react';
import type { NeighborhoodDeliveryZone } from '../../types/restaurant';
import { MAX_NEIGHBORHOOD_ZONES } from '../../types/restaurant';
import { extractCityFromAddress } from '../../utils/restaurantRegion';
import { clampDeliveryRadiusKm } from '../../types/restaurant';
import { normalizeNeighborhoodName } from '../../utils/deliveryFee';
import {
  geocodeAddress,
  getDistanceKm,
  searchNearbyNeighborhoods,
  type GeoPoint,
} from '../../services/geocodingService';
import { panelInputClass, panelLabelClass } from '../panel';

interface Props {
  originAddress: string;
  originLocation?: GeoPoint | null;
  maxRadiusKm: number;
  zones: NeighborhoodDeliveryZone[];
  onChange: (zones: NeighborhoodDeliveryZone[]) => void;
}

function createZoneId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `zone-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function NeighborhoodZonesEditor({
  originAddress,
  originLocation,
  maxRadiusKm,
  zones,
  onChange,
}: Props) {
  const [customName, setCustomName] = useState('');
  const [customFee, setCustomFee] = useState('7');
  const [suggestions, setSuggestions] = useState<
    Array<{ name: string; lat: number; lng: number; distanceKm: number }>
  >([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const radiusKm = clampDeliveryRadiusKm(maxRadiusKm);

  const resolveOrigin = async (): Promise<GeoPoint | null> => {
    if (originLocation && Number.isFinite(originLocation.lat) && Number.isFinite(originLocation.lng)) {
      return originLocation;
    }
    const address = originAddress.trim();
    if (!address) return null;
    return geocodeAddress(address);
  };

  const upsertZone = (name: string, fee: number, point?: GeoPoint, distanceKm?: number) => {
    const key = normalizeNeighborhoodName(name);
    const next = zones.filter((zone) => normalizeNeighborhoodName(zone.name) !== key);
    next.push({
      id: createZoneId(),
      name: name.trim(),
      fee,
      lat: point?.lat,
      lng: point?.lng,
      distanceKm,
    });
    onChange(next.slice(0, MAX_NEIGHBORHOOD_ZONES));
  };

  const handleSearchNearby = async () => {
    setError(null);
    setLoadingNearby(true);
    try {
      const origin = await resolveOrigin();
      if (!origin) {
        setError('Informe e localize o endereço do restaurante antes de buscar bairros.');
        return;
      }
      const city = extractCityFromAddress(originAddress) ?? '';
      const nearby = await searchNearbyNeighborhoods(origin, city, radiusKm);
      const selected = new Set(zones.map((zone) => normalizeNeighborhoodName(zone.name)));
      setSuggestions(
        nearby.filter((item) => !selected.has(normalizeNeighborhoodName(item.name)))
      );
      if (nearby.length === 0) {
        setError('Não encontramos bairros nesse raio. Adicione o nome do bairro manualmente.');
      }
    } catch {
      setError('Não foi possível buscar bairros agora. Tente de novo ou adicione manualmente.');
    } finally {
      setLoadingNearby(false);
    }
  };

  const handleAddCustom = async () => {
    const name = customName.trim();
    const fee = parseFloat(customFee.replace(',', '.'));
    if (!name) {
      setError('Informe o nome do bairro.');
      return;
    }
    if (!Number.isFinite(fee) || fee < 0) {
      setError('Informe uma taxa válida para o bairro.');
      return;
    }
    setAdding(true);
    setError(null);
    try {
      const origin = await resolveOrigin();
      const city = extractCityFromAddress(originAddress) ?? '';
      const query = [name, city, 'Brasil'].filter(Boolean).join(', ');
      const point = await geocodeAddress(query);
      if (!origin || !point) {
        setError('Não localizamos esse bairro perto do restaurante. Confira o nome e o endereço de origem.');
        return;
      }
      const distanceKm = getDistanceKm(origin, point);
      if (distanceKm > radiusKm) {
        setError(
          `${name} está a ${distanceKm.toFixed(1).replace('.', ',')} km — fora do raio máximo de ${radiusKm} km.`
        );
        return;
      }
      upsertZone(name, fee, point, distanceKm);
      setCustomName('');
      setSuggestions((current) =>
        current.filter((item) => normalizeNeighborhoodName(item.name) !== normalizeNeighborhoodName(name))
      );
    } finally {
      setAdding(false);
    }
  };

  const handleAddSuggestion = (item: { name: string; lat: number; lng: number; distanceKm: number }) => {
    const fee = parseFloat(customFee.replace(',', '.'));
    const safeFee = Number.isFinite(fee) && fee >= 0 ? fee : 7;
    upsertZone(item.name, safeFee, { lat: item.lat, lng: item.lng }, item.distanceKm);
    setSuggestions((current) =>
      current.filter((row) => normalizeNeighborhoodName(row.name) !== normalizeNeighborhoodName(item.name))
    );
  };

  return (
    <div className="space-y-4 border-t border-gray-200 pt-4">
      <div>
        <h4 className="text-sm font-semibold text-gray-900">Bairros atendidos</h4>
        <p className="text-xs text-gray-500 mt-1">
          Só entram bairros até {radiusKm} km do restaurante. O cliente paga a taxa do bairro informado no pedido.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label className={panelLabelClass}>Adicionar bairro</label>
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Ex: Pinheiros"
            className={panelInputClass}
          />
        </div>
        <div>
          <label className={panelLabelClass}>Taxa (R$)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={customFee}
            onChange={(e) => setCustomFee(e.target.value)}
            className={panelInputClass}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void handleAddCustom()}
          disabled={adding}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
        >
          <Plus className="w-4 h-4" />
          {adding ? 'Verificando...' : 'Adicionar bairro'}
        </button>
        <button
          type="button"
          onClick={() => void handleSearchNearby()}
          disabled={loadingNearby}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          <Search className="w-4 h-4" />
          {loadingNearby ? 'Buscando...' : 'Buscar bairros próximos'}
        </button>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {suggestions.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
          <p className="text-xs font-medium text-gray-600">Sugestões no raio de {radiusKm} km</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.slice(0, 24).map((item) => (
              <button
                key={`${item.name}-${item.lat}`}
                type="button"
                onClick={() => handleAddSuggestion(item)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium bg-white border border-gray-300 text-gray-800 hover:border-blue-400"
              >
                {item.name}
                <span className="text-gray-400">{item.distanceKm.toFixed(1).replace('.', ',')} km</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {zones.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhum bairro cadastrado ainda.</p>
      ) : (
        <ul className="space-y-2">
          {zones
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
            .map((zone) => (
              <li
                key={zone.id}
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2"
              >
                <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{zone.name}</p>
                  {zone.distanceKm != null && (
                    <p className="text-xs text-gray-500">
                      {zone.distanceKm.toFixed(1).replace('.', ',')} km do restaurante
                    </p>
                  )}
                </div>
                <div className="w-24">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={zone.fee}
                    onChange={(e) => {
                      const fee = parseFloat(e.target.value.replace(',', '.'));
                      onChange(
                        zones.map((item) =>
                          item.id === zone.id
                            ? { ...item, fee: Number.isFinite(fee) && fee >= 0 ? fee : 0 }
                            : item
                        )
                      );
                    }}
                    className={panelInputClass}
                    aria-label={`Taxa de ${zone.name}`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onChange(zones.filter((item) => item.id !== zone.id))}
                  className="p-2 rounded-lg text-red-600 hover:bg-red-50"
                  aria-label={`Remover ${zone.name}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
