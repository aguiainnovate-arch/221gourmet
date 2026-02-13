/**
 * Geocodificação e distância para cálculo de taxa de entrega.
 * Usa Nominatim (OpenStreetMap) sem API key. Para produção com alto volume,
 * considere Google Maps Geocoding ou outro provedor com rate limit maior.
 */

export interface GeoPoint {
  lat: number;
  lng: number;
}

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'noctis-delivery/1.0';

/**
 * Converte um endereço em coordenadas (lat, lng). Retorna null se não encontrar ou der erro.
 */
export async function geocodeAddress(address: string): Promise<GeoPoint | null> {
  const trimmed = address?.trim();
  if (!trimmed) return null;

  try {
    const params = new URLSearchParams({
      q: trimmed,
      format: 'json',
      limit: '1'
    });
    const res = await fetch(`${NOMINATIM_BASE}?${params}`, {
      headers: { 'User-Agent': USER_AGENT }
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const first = data[0];
    const lat = parseFloat(first.lat);
    const lng = parseFloat(first.lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

/**
 * Distância em km entre dois pontos (fórmula de Haversine).
 */
export function getDistanceKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371; // raio da Terra em km
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
