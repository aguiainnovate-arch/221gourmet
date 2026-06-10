/**
 * Recomendações do chat de restaurantes via Cloud Function.
 * A chave OpenAI fica no secret OPENAI_API_KEY (Firebase Functions), nunca no bundle.
 */

import { httpsCallable, type FunctionsError } from 'firebase/functions';
import { functions } from '../../firebase';
import { recommendRestaurantsClientFallback } from './recommendRestaurantsClientFallback';
import { nativeFetch } from '../utils/nativeFetch';

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

const FIREBASE_SERVER_DOWN =
  'O servidor Firebase (Cloud Functions / Storage) parece indisponível. Verifique no Console Firebase se o projeto está com faturamento ativo e as functions publicadas.';

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
      return tryClientFallback(userMessage, trimmedHistory, trimmedRestaurants, GENERIC_TRY_AGAIN);
    }
    if (typeof data.success !== 'boolean') {
      return tryClientFallback(userMessage, trimmedHistory, trimmedRestaurants, GENERIC_TRY_AGAIN);
    }
    if (data.success && typeof data.response === 'string') {
      return {
        success: true,
        response: data.response,
        recommendedRestaurants: data.recommendedRestaurants ?? [],
      };
    }
    const serverError =
      typeof data.error === 'string' && data.error.trim() ? data.error.trim() : GENERIC_TRY_AGAIN;
    return tryClientFallback(userMessage, trimmedHistory, trimmedRestaurants, serverError);
  } catch (err: unknown) {
    const code = extractFirebaseCode(err);

    if (code === 'functions/failed-precondition') {
      return tryClientFallback(userMessage, trimmedHistory, trimmedRestaurants, SERVER_NOT_CONFIGURED);
    }

    if (code === 'functions/internal') {
      return tryClientFallback(userMessage, trimmedHistory, trimmedRestaurants, FIREBASE_SERVER_DOWN);
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
      return tryClientFallback(userMessage, trimmedHistory, trimmedRestaurants, FIREBASE_SERVER_DOWN);
    }

    return tryClientFallback(userMessage, trimmedHistory, trimmedRestaurants, GENERIC_TRY_AGAIN);
  }
}

/** Fallback HTTP direto (útil no Capacitor quando o SDK callable falha). */
async function recommendViaHttpEndpoint(
  payload: RecommendPayload
): Promise<RestaurantRecommendation | null> {
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined;
  if (!projectId?.trim()) return null;

  try {
    const url = `https://us-central1-${projectId.trim()}.cloudfunctions.net/recommendRestaurantsWithAI`;
    const res = await nativeFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: payload }),
    });
    if (!res.ok) return null;

    const json = (await res.json()) as { result?: RestaurantRecommendation; data?: RestaurantRecommendation };
    const data = json.result ?? json.data;
    if (data?.success && typeof data.response === 'string') {
      return {
        success: true,
        response: data.response,
        recommendedRestaurants: data.recommendedRestaurants ?? [],
      };
    }
    return null;
  } catch (e) {
    console.warn('[recommendRestaurants] HTTP endpoint falhou:', e);
    return null;
  }
}

async function tryClientFallback(
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  restaurantsData: unknown[],
  serverError: string
): Promise<RestaurantRecommendation> {
  const httpPayload: RecommendPayload = {
    userMessage,
    conversationHistory,
    restaurantsData,
  };

  const httpResult = await recommendViaHttpEndpoint(httpPayload);
  if (httpResult?.success) {
    console.warn('[recommendRestaurants] SDK falhou; HTTP endpoint funcionou.');
    return httpResult;
  }

  const fallback = await recommendRestaurantsClientFallback(
    userMessage,
    conversationHistory,
    restaurantsData
  );
  if (fallback?.success) {
    console.warn('[recommendRestaurants] Cloud Function indisponível; usando OpenAI no app.');
    return fallback;
  }
  return { success: false, error: serverError };
}
