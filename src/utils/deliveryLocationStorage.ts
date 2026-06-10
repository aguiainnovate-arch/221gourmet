const STORAGE_KEY = 'delivery_user_location';

export interface DeliveryLocation {
  label: string;
  city: string;
  neighborhood?: string;
}

const DEFAULT_LOCATION: DeliveryLocation = {
  label: 'São Paulo, SP',
  city: 'São Paulo',
  neighborhood: 'Centro',
};

export function getDeliveryLocation(): DeliveryLocation {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LOCATION;
    const parsed = JSON.parse(raw) as DeliveryLocation;
    if (parsed?.label && parsed?.city) return parsed;
  } catch {
    // ignore
  }
  return DEFAULT_LOCATION;
}

export function setDeliveryLocation(location: DeliveryLocation): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
}

export const DELIVERY_LOCATION_PRESETS: DeliveryLocation[] = [
  { label: 'São Paulo — Centro', city: 'São Paulo', neighborhood: 'Centro' },
  { label: 'São Paulo — Pinheiros', city: 'São Paulo', neighborhood: 'Pinheiros' },
  { label: 'São Paulo — Moema', city: 'São Paulo', neighborhood: 'Moema' },
  { label: 'São Paulo — Vila Mariana', city: 'São Paulo', neighborhood: 'Vila Mariana' },
  { label: 'Rio de Janeiro — Copacabana', city: 'Rio de Janeiro', neighborhood: 'Copacabana' },
  { label: 'Belo Horizonte — Savassi', city: 'Belo Horizonte', neighborhood: 'Savassi' },
];
