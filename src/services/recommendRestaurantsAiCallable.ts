/**
 * Recomendações do chat de restaurantes via Cloud Function.
 * A chave OpenAI fica no secret OPENAI_API_KEY (Firebase Functions), nunca no bundle.
 */

import { httpsCallable, type FunctionsError } from 'firebase/functions';
import { functions } from '../../firebase';

export interface RestaurantRecommendation {
  success: boolean;
  response?: string;
  recommendedRestaurants?: Array<{
    id: string;
    name: string;
    reason: string;
  }>;
  error?: string;
}

interface RecommendPayload {
  userMessage: string;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  restaurantsData: unknown[];
}

const recommendFn = httpsCallable<RecommendPayload, RestaurantRecommendation>(
  functions,
  'recommendRestaurantsWithAI'
);

function extractFirebaseCode(err: unknown): string | undefined {
  if (!err || typeof err !== 'object') return undefined;
  const code = (err as FunctionsError).code;
  return typeof code === 'string' ? code : undefined;
}

const GENERIC_TRY_AGAIN =
  'Não foi possível gerar recomendações no momento. Tente novamente em alguns instantes.';

const SERVER_NOT_CONFIGURED =
  'As recomendações inteligentes não estão disponíveis: o servidor precisa do segredo OPENAI_API_KEY nas Firebase Functions. Peça ao administrador para executar: firebase functions:secrets:set OPENAI_API_KEY e fazer o deploy das functions.';

const MAX_HISTORY_CLIENT = 24;
const MAX_RESTAURANTS_CLIENT = 50;

export async function recommendRestaurants(
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  restaurantsData: unknown[]
): Promise<RestaurantRecommendation> {
  const trimmedHistory = conversationHistory.slice(-MAX_HISTORY_CLIENT);
  const trimmedRestaurants = Array.isArray(restaurantsData)
    ? restaurantsData.slice(0, MAX_RESTAURANTS_CLIENT)
    : [];

  try {
    const result = await recommendFn({
      userMessage,
      conversationHistory: trimmedHistory,
      restaurantsData: trimmedRestaurants,
    });
    const data = result.data;
    if (!data || typeof data !== 'object') {
      return { success: false, error: GENERIC_TRY_AGAIN };
    }
    if (typeof data.success !== 'boolean') {
      return { success: false, error: GENERIC_TRY_AGAIN };
    }
    if (data.success && typeof data.response === 'string') {
      return {
        success: true,
        response: data.response,
        recommendedRestaurants: data.recommendedRestaurants ?? [],
      };
    }
    return {
      success: false,
      error: typeof data.error === 'string' && data.error.trim() ? data.error.trim() : GENERIC_TRY_AGAIN,
    };
  } catch (err: unknown) {
    const code = extractFirebaseCode(err);

    if (code === 'functions/failed-precondition') {
      return {
        success: false,
        error: SERVER_NOT_CONFIGURED,
      };
    }

    if (code === 'functions/invalid-argument') {
      return {
        success: false,
        error: 'Os dados enviados são inválidos ou excedem os limites permitidos. Recarregue a página e tente de novo.',
      };
    }

    if (
      code === 'functions/unavailable' ||
      code === 'functions/deadline-exceeded' ||
      code === 'functions/resource-exhausted'
    ) {
      return { success: false, error: GENERIC_TRY_AGAIN };
    }

    if (code === 'functions/internal') {
      return { success: false, error: GENERIC_TRY_AGAIN };
    }

    return { success: false, error: GENERIC_TRY_AGAIN };
  }
}
