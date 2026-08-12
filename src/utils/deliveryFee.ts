import type { DeliveryFeeSettings, DeliveryLocation } from '../types/restaurant';
import { DEFAULT_DELIVERY_FEE } from '../types/restaurant';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function getFeeSettings(fee?: DeliveryFeeSettings): DeliveryFeeSettings {
  return {
    mode: fee?.mode === 'distance' ? 'distance' : 'flat',
    flatFee: fee?.flatFee ?? DEFAULT_DELIVERY_FEE.flatFee,
    perKmFee: fee?.perKmFee ?? DEFAULT_DELIVERY_FEE.perKmFee,
    maxRadiusKm: fee?.maxRadiusKm ?? DEFAULT_DELIVERY_FEE.maxRadiusKm,
  };
}

export function calculateDeliveryFee(params: {
  fee: DeliveryFeeSettings;
  distanceKm?: number | null;
}): { fee: number; outOfRange: boolean } {
  const { fee, distanceKm } = params;
  const base = Math.max(0, fee.flatFee);

  if (fee.mode !== 'distance' || distanceKm == null || !Number.isFinite(distanceKm)) {
    return { fee: round2(base), outOfRange: false };
  }

  if (fee.maxRadiusKm > 0 && distanceKm > fee.maxRadiusKm) {
    return { fee: 0, outOfRange: true };
  }

  return {
    fee: round2(base + Math.max(0, fee.perKmFee) * Math.max(0, distanceKm)),
    outOfRange: false,
  };
}

export function formatFeePreview(fee: DeliveryFeeSettings): string {
  const flat = fee.flatFee.toFixed(2).replace('.', ',');
  if (fee.mode === 'distance') {
    const perKm = fee.perKmFee.toFixed(2).replace('.', ',');
    return `A partir de R$ ${flat} + R$ ${perKm}/km`;
  }
  return `R$ ${flat}`;
}

export function hasValidLocation(location?: DeliveryLocation | null): location is DeliveryLocation {
  return Boolean(
    location &&
      Number.isFinite(location.lat) &&
      Number.isFinite(location.lng)
  );
}
