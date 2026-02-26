import { describe, it, expect, vi } from 'vitest';
import {
  normalizeCep,
  formatCep,
  buildAddressLine,
  fetchAddressByCep
} from './viaCepService';

describe('viaCepService', () => {
  describe('normalizeCep', () => {
    it('remove não-dígitos e limita a 8 caracteres', () => {
      expect(normalizeCep('12345-678')).toBe('12345678');
      expect(normalizeCep('12.345.678')).toBe('12345678');
      expect(normalizeCep('12345678')).toBe('12345678');
      expect(normalizeCep('123456789')).toBe('12345678');
    });

    it('retorna string vazia para CEP inválido', () => {
      expect(normalizeCep('')).toBe('');
      expect(normalizeCep('1234')).toBe('1234');
    });
  });

  describe('formatCep', () => {
    it('formata CEP com hífen quando tem 8 dígitos', () => {
      expect(formatCep('12345678')).toBe('12345-678');
      expect(formatCep('12345-678')).toBe('12345-678');
    });

    it('retorna sem hífen quando menos de 6 dígitos', () => {
      expect(formatCep('12345')).toBe('12345');
    });
  });

  describe('buildAddressLine', () => {
    it('monta linha com todos os campos obrigatórios', () => {
      const line = buildAddressLine({
        street: 'Rua das Flores',
        number: '123',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        cep: '01310100'
      });
      expect(line).toContain('Rua das Flores');
      expect(line).toContain('123');
      expect(line).toContain('Centro');
      expect(line).toContain('São Paulo');
      expect(line).toContain('SP');
      expect(line).toContain('01310-100');
    });

    it('inclui complemento quando informado', () => {
      const line = buildAddressLine({
        street: 'Av. Paulista',
        number: '1000',
        complement: 'Apto 42',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        cep: '01310100'
      });
      expect(line).toContain('1000');
      expect(line).toContain('Apto 42');
    });

    it('validação implícita: CEP com 8 dígitos é formatado', () => {
      const line = buildAddressLine({
        street: 'Rua X',
        number: '1',
        neighborhood: 'B',
        city: 'C',
        state: 'SP',
        cep: '01310100'
      });
      expect(line).toMatch(/\d{5}-\d{3}/);
    });
  });

  describe('fetchAddressByCep', () => {
    it('retorna null para CEP com menos de 8 dígitos', async () => {
      expect(await fetchAddressByCep('1234')).toBe(null);
      expect(await fetchAddressByCep('1234567')).toBe(null);
    });

    it('chama a API ViaCEP com dígitos corretos', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          cep: '01310-100',
          logradouro: 'Av. Paulista',
          bairro: 'Bela Vista',
          localidade: 'São Paulo',
          uf: 'SP'
        })
      });
      vi.stubGlobal('fetch', mockFetch);
      const result = await fetchAddressByCep('01310-100');
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('01310100'));
      expect(result).not.toBe(null);
      expect(result?.logradouro).toBe('Av. Paulista');
      expect(result?.localidade).toBe('São Paulo');
      vi.unstubAllGlobals();
    });

    it('retorna null quando API retorna erro', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ erro: true })
      });
      vi.stubGlobal('fetch', mockFetch);
      const result = await fetchAddressByCep('00000000');
      expect(result).toBe(null);
      vi.unstubAllGlobals();
    });
  });
});
