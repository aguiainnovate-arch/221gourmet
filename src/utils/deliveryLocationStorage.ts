const STORAGE_KEY = 'delivery_user_location';

export interface DeliveryLocation {
  label: string;
  city: string;
  neighborhood?: string;
  lat?: number;
  lng?: number;
}

const DEFAULT_LOCATION: DeliveryLocation = {
  label: 'São Paulo, SP',
  city: 'São Paulo',
  neighborhood: 'Centro',
  lat: -23.5505,
  lng: -46.6333,
};

function withOptionalCoords(location: DeliveryLocation): DeliveryLocation {
  const lat = Number(location.lat);
  const lng = Number(location.lng);
  return {
    ...location,
    lat: Number.isFinite(lat) ? lat : undefined,
    lng: Number.isFinite(lng) ? lng : undefined,
  };
}

export function hasSavedDeliveryLocation(): boolean {
  try {
    return Boolean(localStorage.getItem(STORAGE_KEY));
  } catch {
    return false;
  }
}

export function getDeliveryLocation(): DeliveryLocation {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LOCATION;
    const parsed = JSON.parse(raw) as DeliveryLocation;
    if (parsed?.label && parsed?.city) return withOptionalCoords(parsed);
  } catch {
    // ignore
  }
  return DEFAULT_LOCATION;
}

export function setDeliveryLocation(location: DeliveryLocation): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(withOptionalCoords(location)));
}

export const DELIVERY_LOCATION_PRESETS: DeliveryLocation[] = [
  { label: 'São Paulo — Centro', city: 'São Paulo', neighborhood: 'Centro', lat: -23.5505, lng: -46.6333 },
  { label: 'São Paulo — Pinheiros', city: 'São Paulo', neighborhood: 'Pinheiros', lat: -23.5614, lng: -46.7019 },
  { label: 'São Paulo — Moema', city: 'São Paulo', neighborhood: 'Moema', lat: -23.6016, lng: -46.6631 },
  { label: 'São Paulo — Vila Mariana', city: 'São Paulo', neighborhood: 'Vila Mariana', lat: -23.5893, lng: -46.6346 },
  { label: 'Rio de Janeiro — Copacabana', city: 'Rio de Janeiro', neighborhood: 'Copacabana', lat: -22.9711, lng: -43.1822 },
  { label: 'Belo Horizonte — Savassi', city: 'Belo Horizonte', neighborhood: 'Savassi', lat: -19.937, lng: -43.9352 },
  { label: 'Recife — Centro', city: 'Recife', neighborhood: 'Centro', lat: -8.0476, lng: -34.877 },
];
