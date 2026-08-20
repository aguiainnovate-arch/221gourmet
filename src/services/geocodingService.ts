/**
 * Geocodificação e distância para cálculo de taxa de entrega.
 * Photon (Komoot) no browser (CORS liberado) com fallback Nominatim.
 */

import type { DeliveryLocation } from '../utils/deliveryLocationStorage';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface ReverseGeocodePlace {
  city: string;
  neighborhood?: string;
}

const PHOTON_URL = 'https://photon.komoot.io/api/';
const PHOTON_REVERSE_URL = 'https://photon.komoot.io/reverse';
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
const USER_AGENT = 'bora-comer-delivery/1.0';
const GPS_TIMEOUT_MS = 8000;

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

function firstNonEmpty(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

async function reversePhoton(lat: number, lng: number): Promise<ReverseGeocodePlace | null> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    lang: 'pt',
  });
  const res = await fetch(`${PHOTON_REVERSE_URL}?${params}`);
  if (!res.ok) return null;
  const data = await res.json();
  const props = data?.features?.[0]?.properties as Record<string, unknown> | undefined;
  if (!props) return null;
  const city = firstNonEmpty(props.city, props.town, props.village, props.municipality, props.county);
  if (!city) return null;
  const neighborhood = firstNonEmpty(props.district, props.locality, props.suburb, props.name) || undefined;
  return { city, neighborhood: neighborhood === city ? undefined : neighborhood };
}

async function reverseNominatim(lat: number, lng: number): Promise<ReverseGeocodePlace | null> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: 'json',
    addressdetails: '1',
    'accept-language': 'pt-BR',
  });
  const res = await fetch(`${NOMINATIM_REVERSE_URL}?${params}`, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const address = data?.address as Record<string, unknown> | undefined;
  if (!address) return null;
  const city = firstNonEmpty(address.city, address.town, address.village, address.municipality);
  if (!city) return null;
  const neighborhood =
    firstNonEmpty(address.suburb, address.neighbourhood, address.city_district) || undefined;
  return { city, neighborhood };
}

export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodePlace | null> {
  try {
    return (await reversePhoton(lat, lng)) ?? (await reverseNominatim(lat, lng));
  } catch {
    return null;
  }
}

export async function detectDeliveryLocationFromGps(): Promise<DeliveryLocation | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null;

  const position = await new Promise<GeolocationPosition | null>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: GPS_TIMEOUT_MS, maximumAge: 60_000 }
    );
  });

  if (!position) return null;

  const lat = position.coords.latitude;
  const lng = position.coords.longitude;
  const place = await reverseGeocode(lat, lng);
  if (!place?.city) return null;

  const neighborhood = place.neighborhood;
  const label = neighborhood ? `${place.city} — ${neighborhood}` : place.city;
  return { label, city: place.city, neighborhood, lat, lng };
}

export async function enrichDeliveryLocationCoords(
  location: DeliveryLocation
): Promise<DeliveryLocation> {
  if (Number.isFinite(location.lat) && Number.isFinite(location.lng)) return location;
  const query = [location.neighborhood, location.city, 'Brasil'].filter(Boolean).join(', ');
  const point = await geocodeAddress(query);
  if (!point) return location;
  return { ...location, lat: point.lat, lng: point.lng };
}

export interface NearbyNeighborhood {
  name: string;
  city?: string;
  lat: number;
  lng: number;
  distanceKm: number;
}

const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

function neighborhoodKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function pushNearby(
  acc: Map<string, NearbyNeighborhood>,
  origin: GeoPoint,
  name: string,
  lat: number,
  lng: number,
  radiusKm: number,
  city?: string
): void {
  const trimmed = name.trim();
  if (!trimmed || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
  const distanceKm = getDistanceKm(origin, { lat, lng });
  if (distanceKm > radiusKm) return;
  const key = neighborhoodKey(trimmed);
  if (!key) return;
  const current = acc.get(key);
  if (!current || distanceKm < current.distanceKm) {
    acc.set(key, { name: trimmed, city, lat, lng, distanceKm });
  }
}

async function nearbyFromOverpass(
  origin: GeoPoint,
  radiusKm: number
): Promise<NearbyNeighborhood[]> {
  const radiusM = Math.round(radiusKm * 1000);
  const query = `[out:json][timeout:15];node["place"~"^(suburb|neighbourhood|quarter)$"](around:${radiusM},${origin.lat},${origin.lng});out tags;`;
  for (const url of OVERPASS_URLS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: `data=${encodeURIComponent(query)}`,
      });
      if (!res.ok) continue;
      const data = await res.json();
      const acc = new Map<string, NearbyNeighborhood>();
      const elements = Array.isArray(data?.elements) ? data.elements : [];
      for (const el of elements) {
        const tags = el?.tags as Record<string, unknown> | undefined;
        const name = typeof tags?.name === 'string' ? tags.name : '';
        const city =
          typeof tags?.['addr:city'] === 'string' ? tags['addr:city'] : undefined;
        pushNearby(acc, origin, name, Number(el.lat), Number(el.lon), radiusKm, city);
      }
      if (acc.size > 0) return [...acc.values()];
    } catch {
      // tenta o próximo endpoint
    }
  }
  return [];
}

async function nearbyFromPhoton(
  origin: GeoPoint,
  city: string,
  radiusKm: number
): Promise<NearbyNeighborhood[]> {
  const q = city.trim() || 'bairro';
  const params = new URLSearchParams({
    q,
    lat: String(origin.lat),
    lon: String(origin.lng),
    limit: '40',
    lang: 'pt',
  });
  params.append('osm_tag', 'place:suburb');
  params.append('osm_tag', 'place:neighbourhood');
  params.append('osm_tag', 'place:quarter');
  const res = await fetch(`${PHOTON_URL}?${params}`);
  if (!res.ok) return [];
  const data = await res.json();
  const acc = new Map<string, NearbyNeighborhood>();
  const features = Array.isArray(data?.features) ? data.features : [];
  for (const feature of features) {
    const props = feature?.properties as Record<string, unknown> | undefined;
    const coords = feature?.geometry?.coordinates;
    if (!props || !Array.isArray(coords) || coords.length < 2) continue;
    const name = firstNonEmpty(props.name, props.district, props.locality);
    const featureCity = firstNonEmpty(props.city, props.town, city);
    pushNearby(acc, origin, name, Number(coords[1]), Number(coords[0]), radiusKm, featureCity || undefined);
  }
  return [...acc.values()];
}

/**
 * Bairros ao redor do restaurante, limitados ao raio de entrega.
 * Overpass (OSM) primeiro; Photon como fallback. Sem Google Maps.
 */
export async function searchNearbyNeighborhoods(
  origin: GeoPoint,
  city: string,
  radiusKm: number
): Promise<NearbyNeighborhood[]> {
  const overpass = await nearbyFromOverpass(origin, radiusKm);
  const photon = overpass.length >= 8 ? [] : await nearbyFromPhoton(origin, city, radiusKm);
  const acc = new Map<string, NearbyNeighborhood>();
  for (const item of [...overpass, ...photon]) {
    const key = neighborhoodKey(item.name);
    const current = acc.get(key);
    if (!current || item.distanceKm < current.distanceKm) acc.set(key, item);
  }
  return [...acc.values()].sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 40);
}
