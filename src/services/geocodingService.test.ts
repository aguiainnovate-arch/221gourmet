import { describe, it, expect, vi } from 'vitest';
import { geocodeAddress, getDistanceKm, type GeoPoint } from './geocodingService';
import { calculateDeliveryFee } from './deliveryFeeService';
import type { DeliveryFeeRule } from '../types/restaurant';

describe('geocodingService', () => {
  describe('getDistanceKm', () => {
    it('retorna 0 para mesmo ponto', () => {
      const p: GeoPoint = { lat: -23.55, lng: -46.63 };
      expect(getDistanceKm(p, p)).toBe(0);
    });

    it('retorna distância aproximada entre dois pontos conhecidos', () => {
      // São Paulo (Av. Paulista) e um ponto ~5km ao sul (Haversine aproximado)
      const sp: GeoPoint = { lat: -23.5615, lng: -46.6559 };
      const sul: GeoPoint = { lat: -23.608, lng: -46.6559 };
      const km = getDistanceKm(sp, sul);
      expect(km).toBeGreaterThan(4);
      expect(km).toBeLessThan(7);
    });

    it('é simétrico: distância A->B = B->A', () => {
      const a: GeoPoint = { lat: -23.5, lng: -46.6 };
      const b: GeoPoint = { lat: -23.6, lng: -46.7 };
      expect(getDistanceKm(a, b)).toBe(getDistanceKm(b, a));
    });
  });

  describe('geocodeAddress', () => {
    it('retorna null para endereço vazio', async () => {
      expect(await geocodeAddress('')).toBe(null);
      expect(await geocodeAddress('   ')).toBe(null);
    });

    it('chama fetch com URL Nominatim e User-Agent', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ lat: '-23.55', lon: '-46.63' }]
      });
      vi.stubGlobal('fetch', mockFetch);
      const result = await geocodeAddress('Av. Paulista, São Paulo');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('nominatim.openstreetmap.org'),
        expect.objectContaining({ headers: expect.objectContaining({ 'User-Agent': expect.any(String) }) })
      );
      expect(result).toEqual({ lat: -23.55, lng: -46.63 });
      vi.unstubAllGlobals();
    });

    it('retorna null quando a API retorna array vazio', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => []
      });
      vi.stubGlobal('fetch', mockFetch);
      const result = await geocodeAddress('Endereço inexistente 12345');
      expect(result).toBe(null);
      vi.unstubAllGlobals();
    });
  });

  describe('integração: distância + cálculo da taxa', () => {
    it('taxa varia com a distância (Haversine + feeRule)', () => {
      const rule: DeliveryFeeRule = {
        baseFee: 3,
        perKmFee: 2.5,
        maxRadiusKm: 15
      };
      // Dois pontos: ~5 km de distância (São Paulo - Av. Paulista vs. ponto ao sul)
      const origem: GeoPoint = { lat: -23.5615, lng: -46.6559 };
      const destino: GeoPoint = { lat: -23.608, lng: -46.6559 };
      const distanceKm = getDistanceKm(origem, destino);
      expect(distanceKm).toBeGreaterThan(4);
      expect(distanceKm).toBeLessThan(7);

      const fee = calculateDeliveryFee(distanceKm, 50, rule);
      expect(fee).not.toBe(null);
      expect(fee).toBeCloseTo(3 + 2.5 * distanceKm, 2);

      // Outro par mais distante mas ainda dentro do raio (15 km): taxa maior
      const destinoLonge: GeoPoint = { lat: -23.62, lng: -46.66 }; // ~7 km ao sul
      const distanceKm2 = getDistanceKm(origem, destinoLonge);
      expect(distanceKm2).toBeLessThanOrEqual(15);
      expect(distanceKm2).toBeGreaterThan(distanceKm);
      const fee2 = calculateDeliveryFee(distanceKm2, 50, rule);
      expect(fee2).not.toBe(null);
      expect((fee2 as number)).toBeGreaterThan(fee as number);
    });
  });
});
