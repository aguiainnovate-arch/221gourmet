/**
 * Tradução de cardápio via Cloud Function (secret OPENAI_API_KEY no servidor).
 */

import { httpsCallable, type FunctionsError } from 'firebase/functions';
import { functions } from '../../firebase';

export interface MenuTranslateItem {
  id: string;
  name: string;
  description: string;
  type: 'product' | 'category';
}

export interface MenuLangFields {
  name: string;
  description: string;
}

export interface TranslateMenuResult {
  success: boolean;
  translations?: Record<string, { 'en-US': MenuLangFields; 'fr-FR': MenuLangFields }>;
  error?: string;
}

interface TranslatePayload {
  restaurantId: string;
  items: MenuTranslateItem[];
  restaurantName?: string;
  cuisineType?: string;
}

const BATCH_SIZE = 30;

const translateFn = httpsCallable<TranslatePayload, TranslateMenuResult>(
  functions,
  'translateMenuWithAI'
);

function extractFirebaseCode(err: unknown): string | undefined {
  if (!err || typeof err !== 'object') return undefined;
  const code = (err as FunctionsError).code;
  return typeof code === 'string' ? code : undefined;
}

function mapCallableError(err: unknown): string {
  const code = extractFirebaseCode(err);
  if (code === 'functions/unauthenticated') {
    return 'Faça login para traduzir o cardápio.';
  }
  if (code === 'functions/failed-precondition') {
    return 'Tradução por IA não está configurada no servidor (OPENAI_API_KEY).';
  }
  if (code === 'functions/invalid-argument') {
    const msg = err && typeof err === 'object' && 'message' in err
      ? String((err as { message?: string }).message || '')
      : '';
    return msg || 'Dados inválidos para tradução.';
  }
  if (
    code === 'functions/unavailable' ||
    code === 'functions/deadline-exceeded' ||
    code === 'functions/resource-exhausted' ||
    code === 'functions/internal'
  ) {
    return 'Servidor de tradução indisponível no momento. Tente novamente.';
  }
  return 'Não foi possível traduzir. Tente novamente.';
}

/** Um produto/categoria (modal). */
export async function translateMenuItem(params: {
  restaurantId: string;
  id: string;
  name: string;
  description: string;
  type?: 'product' | 'category';
  restaurantName?: string;
}): Promise<{
  success: boolean;
  translations?: {
    'en-US': MenuLangFields;
    'fr-FR': MenuLangFields;
  };
  error?: string;
}> {
  const result = await translateMenuBatch({
    restaurantId: params.restaurantId,
    restaurantName: params.restaurantName,
    items: [
      {
        id: params.id,
        name: params.name,
        description: params.description,
        type: params.type ?? 'product',
      },
    ],
  });

  if (!result.success || !result.translations) {
    return { success: false, error: result.error };
  }

  const entry = result.translations[params.id];
  if (!entry) {
    return { success: false, error: 'Tradução não retornada para este item.' };
  }

  return { success: true, translations: entry };
}

/** Lote único (até BATCH_SIZE). */
export async function translateMenuBatch(params: {
  restaurantId: string;
  items: MenuTranslateItem[];
  restaurantName?: string;
  cuisineType?: string;
}): Promise<TranslateMenuResult> {
  if (!params.restaurantId?.trim()) {
    return { success: false, error: 'restaurantId é obrigatório.' };
  }
  if (!params.items.length) {
    return { success: false, error: 'Nenhum item para traduzir.' };
  }

  try {
    const { data } = await translateFn({
      restaurantId: params.restaurantId,
      items: params.items,
      restaurantName: params.restaurantName,
      cuisineType: params.cuisineType,
    });
    if (!data || typeof data !== 'object' || typeof data.success !== 'boolean') {
      return { success: false, error: 'Resposta inválida do servidor.' };
    }
    return data;
  } catch (err) {
    console.error('[translateMenuBatch]', err);
    return { success: false, error: mapCallableError(err) };
  }
}

/**
 * Cardápio inteiro: dispara N lotes em sequência.
 * onProgress(done, total) para UI.
 */
export async function translateFullMenu(params: {
  restaurantId: string;
  items: MenuTranslateItem[];
  restaurantName?: string;
  cuisineType?: string;
  onProgress?: (done: number, total: number) => void;
}): Promise<TranslateMenuResult> {
  const { items } = params;
  const total = items.length;
  if (total === 0) {
    return { success: false, error: 'Nenhum item no cardápio.' };
  }

  const merged: Record<string, { 'en-US': MenuLangFields; 'fr-FR': MenuLangFields }> = {};
  let done = 0;
  params.onProgress?.(0, total);

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const chunk = items.slice(i, i + BATCH_SIZE);
    const result = await translateMenuBatch({
      restaurantId: params.restaurantId,
      items: chunk,
      restaurantName: params.restaurantName,
      cuisineType: params.cuisineType,
    });
    if (!result.success || !result.translations) {
      return {
        success: false,
        error: result.error || `Falha no lote a partir do item ${i + 1}.`,
        translations: Object.keys(merged).length ? merged : undefined,
      };
    }
    Object.assign(merged, result.translations);
    done = Math.min(total, i + chunk.length);
    params.onProgress?.(done, total);
  }

  return { success: true, translations: merged };
}

export { BATCH_SIZE };
