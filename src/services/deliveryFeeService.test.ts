import { describe, it, expect } from 'vitest';
import {
  calculateDeliveryFee,
  validateFeeRule,
  isFeeRuleUsable,
  FALLBACK_FIXED_FEE
} from './deliveryFeeService';
import type { DeliveryFeeRule } from '../types/restaurant';

const baseRule: DeliveryFeeRule = {
  baseFee: 3,
  perKmFee: 2.5,
  maxRadiusKm: 10
};

describe('deliveryFeeService', () => {
  describe('calculateDeliveryFee', () => {
    it('retorna null quando distância excede raio máximo', () => {
      expect(calculateDeliveryFee(11, 50, baseRule)).toBe(null);
      expect(calculateDeliveryFee(10.01, 50, baseRule)).toBe(null);
    });

    it('permite distância igual ao raio máximo', () => {
      const fee = calculateDeliveryFee(10, 50, baseRule);
      expect(fee).toBe(3 + 2.5 * 10); // 28
    });

    it('calcula taxa linear: base + perKm * distância', () => {
      expect(calculateDeliveryFee(0, 50, baseRule)).toBe(3);
      expect(calculateDeliveryFee(4, 50, baseRule)).toBe(3 + 2.5 * 4); // 13
    });

    it('aplica taxa mínima quando configurada', () => {
      const rule: DeliveryFeeRule = { ...baseRule, minFee: 5 };
      expect(calculateDeliveryFee(0, 50, rule)).toBe(5);
      expect(calculateDeliveryFee(4, 50, rule)).toBe(13);
    });

    it('aplica taxa máxima quando configurada', () => {
      const rule: DeliveryFeeRule = { ...baseRule, maxFee: 22 };
      expect(calculateDeliveryFee(8, 50, baseRule)).toBe(3 + 20); // 23
      expect(calculateDeliveryFee(8, 50, rule)).toBe(22);
    });

    it('aplica isenção por pedido mínimo (subtotal >= freeDeliveryAboveSubtotal)', () => {
      const rule: DeliveryFeeRule = { ...baseRule, freeDeliveryAboveSubtotal: 80 };
      expect(calculateDeliveryFee(4, 90, rule)).toBe(0);
      expect(calculateDeliveryFee(4, 80, rule)).toBe(0);
      expect(calculateDeliveryFee(4, 79, rule)).toBe(13);
    });

    it('arredonda para 2 casas decimais', () => {
      const rule: DeliveryFeeRule = { baseFee: 1.111, perKmFee: 1.111, maxRadiusKm: 5 };
      const fee = calculateDeliveryFee(1, 50, rule);
      expect(Number(fee?.toFixed(2))).toBe(fee);
    });

    it('integração: regra completa (base + perKm, min, max, isenção)', () => {
      const rule: DeliveryFeeRule = {
        baseFee: 3,
        perKmFee: 2.5,
        maxRadiusKm: 10,
        minFee: 5,
        maxFee: 22,
        freeDeliveryAboveSubtotal: 80
      };
      // 0 km, subtotal 50: bruto 3 → min 5
      expect(calculateDeliveryFee(0, 50, rule)).toBe(5);
      // 4 km, subtotal 30: bruto 13, dentro de min/max
      expect(calculateDeliveryFee(4, 30, rule)).toBe(13);
      // 4 km, subtotal 90: isenção
      expect(calculateDeliveryFee(4, 90, rule)).toBe(0);
      // 8 km, subtotal 40: bruto 23 → max 22
      expect(calculateDeliveryFee(8, 40, rule)).toBe(22);
      // 12 km: fora do raio
      expect(calculateDeliveryFee(12, 50, rule)).toBe(null);
    });
  });

  describe('validateFeeRule', () => {
    it('retorna vazio para regra válida', () => {
      expect(validateFeeRule(baseRule)).toEqual([]);
    });

    it('rejeita baseFee negativa', () => {
      const err = validateFeeRule({ ...baseRule, baseFee: -1 });
      expect(err.some(m => m.includes('Valor base'))).toBe(true);
    });

    it('rejeita perKmFee negativa', () => {
      const err = validateFeeRule({ ...baseRule, perKmFee: -1 });
      expect(err.some(m => m.includes('Valor por km'))).toBe(true);
    });

    it('rejeita maxRadiusKm zero ou negativo', () => {
      expect(validateFeeRule({ ...baseRule, maxRadiusKm: 0 }).some(m => m.includes('Raio máximo'))).toBe(true);
      expect(validateFeeRule({ ...baseRule, maxRadiusKm: -1 }).some(m => m.includes('Raio máximo'))).toBe(true);
    });

    it('rejeita minFee > maxFee quando ambos preenchidos', () => {
      const err = validateFeeRule({ ...baseRule, minFee: 10, maxFee: 5 });
      expect(err.some(m => m.includes('Taxa mínima'))).toBe(true);
    });

    it('rejeita freeDeliveryAboveSubtotal <= 0 quando preenchido', () => {
      const err = validateFeeRule({ ...baseRule, freeDeliveryAboveSubtotal: 0 });
      expect(err.some(m => m.includes('Pedido mínimo'))).toBe(true);
    });
  });

  describe('isFeeRuleUsable', () => {
    it('retorna false para undefined ou null', () => {
      expect(isFeeRuleUsable(undefined)).toBe(false);
      expect(isFeeRuleUsable(null)).toBe(false);
    });

    it('retorna false para regra inválida', () => {
      expect(isFeeRuleUsable({ ...baseRule, maxRadiusKm: 0 })).toBe(false);
    });

    it('retorna true para regra válida', () => {
      expect(isFeeRuleUsable(baseRule)).toBe(true);
    });
  });

  describe('FALLBACK_FIXED_FEE', () => {
    it('é 5', () => {
      expect(FALLBACK_FIXED_FEE).toBe(5);
    });
  });
});
