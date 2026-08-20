import { getDistanceKm } from '../services/geocodingService';
import type { RestaurantDeliverySettings } from '../types/restaurant';
import type { DeliveryLocation } from './deliveryLocationStorage';

/** Raio usado na listagem quando o restaurante não definiu maxRadiusKm. */
export const DEFAULT_REGION_RADIUS_KM = 20;

const CITY_CANONICAL: Record<string, string> = {
  'sao paulo': 'sao paulo',
  sp: 'sao paulo',
  'rio de janeiro': 'rio de janeiro',
  rio: 'rio de janeiro',
  rj: 'rio de janeiro',
  'belo horizonte': 'belo horizonte',
  bh: 'belo horizonte',
};

export function normalizeCityName(value: string): string {
  const stripped = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return CITY_CANONICAL[stripped] ?? stripped;
}

export function extractCityFromAddress(address: string): string | null {
  const cleaned = address.trim();
  if (!cleaned) return null;

  const withUf = cleaned.match(/([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ.'\s]+?)\s*[-–,]\s*[A-Za-z]{2}\s*$/);
  if (withUf?.[1]) return withUf[1].trim();

  const parts = cleaned.split(/\s[-–]\s/);
  if (parts.length >= 2) {
    const last = parts[parts.length - 1].replace(/,?\s*[A-Za-z]{2}\s*$/, '').trim();
    if (last) return last;
  }

  return null;
}

function addressMentionsCity(address: string, city: string): boolean {
  const haystack = normalizeCityName(address);
  const needle = normalizeCityName(city);
  if (!haystack || !needle) return false;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  return new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`).test(haystack);
}

export interface RegionRestaurant {
  address?: string;
  deliverySettings?: RestaurantDeliverySettings;
}

function restaurantCityMatches(restaurant: RegionRestaurant, city: string): boolean {
  const userCity = normalizeCityName(city);
  if (!userCity) return false;

  const origin = restaurant.deliverySettings?.originAddress ?? '';
  const extracted =
    extractCityFromAddress(restaurant.address ?? '') ?? extractCityFromAddress(origin);

  if (extracted && normalizeCityName(extracted) === userCity) return true;

  return (
    addressMentionsCity(restaurant.address ?? '', city) ||
    addressMentionsCity(origin, city)
  );
}

function restaurantWithinRadius(
  restaurant: RegionRestaurant,
  location: DeliveryLocation
): boolean {
  const restLoc = restaurant.deliverySettings?.location;
  const userLat = location.lat;
  const userLng = location.lng;
  if (!restLoc || !Number.isFinite(userLat) || !Number.isFinite(userLng)) return false;

  const km = getDistanceKm({ lat: userLat as number, lng: userLng as number }, restLoc);
  const configured = restaurant.deliverySettings?.fee?.maxRadiusKm;
  const limit =
    Number.isFinite(configured) && (configured as number) > 0
      ? (configured as number)
      : DEFAULT_REGION_RADIUS_KM;
  return km <= limit;
}

export function restaurantMatchesRegion(
  restaurant: RegionRestaurant,
  location: DeliveryLocation
): boolean {
  if (restaurantCityMatches(restaurant, location.city)) return true;
  return restaurantWithinRadius(restaurant, location);
}
