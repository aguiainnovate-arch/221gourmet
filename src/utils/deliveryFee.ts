import type {
  DeliveryFeeSettings,
  DeliveryLocation,
  NeighborhoodDeliveryZone,
} from '../types/restaurant';
import {
  DEFAULT_DELIVERY_FEE,
  clampDeliveryRadiusKm,
} from '../types/restaurant';
import { normalizeCityName } from './restaurantRegion';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function getFeeSettings(fee?: DeliveryFeeSettings): DeliveryFeeSettings {
  return {
    mode:
      fee?.mode === 'distance' || fee?.mode === 'neighborhood' ? fee.mode : 'flat',
    flatFee: fee?.flatFee ?? DEFAULT_DELIVERY_FEE.flatFee,
    perKmFee: fee?.perKmFee ?? DEFAULT_DELIVERY_FEE.perKmFee,
    maxRadiusKm: clampDeliveryRadiusKm(fee?.maxRadiusKm ?? DEFAULT_DELIVERY_FEE.maxRadiusKm),
    neighborhoodZones: fee?.neighborhoodZones ?? [],
  };
}

export function normalizeNeighborhoodName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function findNeighborhoodZone(
  zones: NeighborhoodDeliveryZone[] | undefined,
  neighborhood: string
): NeighborhoodDeliveryZone | undefined {
  const needle = normalizeNeighborhoodName(neighborhood);
  if (!needle || !zones?.length) return undefined;
  return zones.find((zone) => normalizeNeighborhoodName(zone.name) === needle);
}

export function calculateDeliveryFee(params: {
  fee: DeliveryFeeSettings;
  distanceKm?: number | null;
  neighborhood?: string;
  city?: string;
  restaurantCity?: string;
}): { fee: number; outOfRange: boolean } {
  const { fee, distanceKm, neighborhood, city, restaurantCity } = params;
  const radiusKm = clampDeliveryRadiusKm(fee.maxRadiusKm);
  const beyondRadius =
    distanceKm != null && Number.isFinite(distanceKm) && distanceKm > radiusKm;

  if (fee.mode === 'neighborhood') {
    const zone = findNeighborhoodZone(fee.neighborhoodZones, neighborhood ?? '');
    if (!zone) return { fee: 0, outOfRange: true };
    if (city && restaurantCity && normalizeCityName(city) !== normalizeCityName(restaurantCity)) {
      return { fee: 0, outOfRange: true };
    }
    if (beyondRadius) return { fee: 0, outOfRange: true };
    return { fee: round2(Math.max(0, zone.fee)), outOfRange: false };
  }

  if (beyondRadius && fee.mode === 'distance') {
    return { fee: 0, outOfRange: true };
  }

  const base = Math.max(0, fee.flatFee);
  if (fee.mode !== 'distance' || distanceKm == null || !Number.isFinite(distanceKm)) {
    return { fee: round2(base), outOfRange: false };
  }

  return {
    fee: round2(base + Math.max(0, fee.perKmFee) * Math.max(0, distanceKm)),
    outOfRange: false,
  };
}

export function formatFeePreview(fee: DeliveryFeeSettings): string {
  if (fee.mode === 'neighborhood') {
    const values = (fee.neighborhoodZones ?? [])
      .map((zone) => zone.fee)
      .filter((value) => Number.isFinite(value) && value >= 0);
    if (values.length === 0) return 'Taxa por bairro';
    const min = Math.min(...values);
    return `A partir de R$ ${min.toFixed(2).replace('.', ',')}`;
  }

  const flat = fee.flatFee.toFixed(2).replace('.', ',');
  if (fee.mode === 'distance') {
    const perKm = fee.perKmFee.toFixed(2).replace('.', ',');
    return `A partir de R$ ${flat} + R$ ${perKm}/km`;
  }
  return `R$ ${flat}`;
}

export function previewDeliveryFee(fee: DeliveryFeeSettings): number {
  if (fee.mode === 'neighborhood') {
    const values = (fee.neighborhoodZones ?? [])
      .map((zone) => zone.fee)
      .filter((value) => Number.isFinite(value) && value >= 0);
    if (values.length === 0) return 0;
    return Math.min(...values);
  }
  return Math.max(0, fee.flatFee);
}

export function hasValidLocation(location?: DeliveryLocation | null): location is DeliveryLocation {
  return Boolean(
    location &&
      Number.isFinite(location.lat) &&
      Number.isFinite(location.lng)
  );
}
