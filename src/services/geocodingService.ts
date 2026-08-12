/**
 * Geocodificação e distância para cálculo de taxa de entrega.
 * Photon (Komoot) no browser (CORS liberado) com fallback Nominatim.
 */

export interface GeoPoint {
  lat: number;
  lng: number;
}

const PHOTON_URL = 'https://photon.komoot.io/api/';
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'bora-comer-delivery/1.0';

const cache = new Map<string, GeoPoint | null>();

function cacheKey(address: string): string {
  return address.trim().toLowerCase().replace(/\s+/g, ' ');
}

async function geocodePhoton(address: string): Promise<GeoPoint | null> {
  const params = new URLSearchParams({
    q: address,
    limit: '1',
    lang: 'pt',
  });
  const res = await fetch(`${PHOTON_URL}?${params}`);
  if (!res.ok) return null;
  const data = await res.json();
  const coords = data?.features?.[0]?.geometry?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const lng = Number(coords[0]);
  const lat = Number(coords[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

async function geocodeNominatim(address: string): Promise<GeoPoint | null> {
  const params = new URLSearchParams({
    q: address,
    format: 'json',
    limit: '1',
    countrycodes: 'br',
  });
  const res = await fetch(`${NOMINATIM_BASE}?${params}`, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  const lat = parseFloat(data[0].lat);
  const lng = parseFloat(data[0].lon);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
}

/**
 * Converte um endereço em coordenadas (lat, lng). Retorna null se não encontrar.
 */
export async function geocodeAddress(address: string): Promise<GeoPoint | null> {
  const trimmed = address?.trim();
  if (!trimmed) return null;

  const key = cacheKey(trimmed);
  if (cache.has(key)) return cache.get(key) ?? null;

  try {
    const point = (await geocodePhoton(trimmed)) ?? (await geocodeNominatim(trimmed));
    cache.set(key, point);
    return point;
  } catch {
    cache.set(key, null);
    return null;
  }
}

/**
 * Distância em km entre dois pontos (fórmula de Haversine).
 */
export function getDistanceKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return Math.round(R * c * 100) / 100;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
