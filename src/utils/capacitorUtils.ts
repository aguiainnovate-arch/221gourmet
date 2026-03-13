/**
 * Utilitários para React + Capacitor (app nativo vs navegador).
 *
 * Problema comum no Android nativo:
 * - A status bar pode sobrepor o conteúdo ou a área de toque do sistema pode "roubar" cliques.
 * - env(safe-area-inset-top) no Android costuma ser 0 se o app não estiver em modo edge-to-edge com insets.
 *
 * Uso: aplicar padding-top mínimo apenas no app nativo para manter botões (ex.: voltar) abaixo da status bar
 * e com área de toque clicável. No navegador mobile não alteramos nada.
 */

import { Capacitor } from '@capacitor/core';

/** True se estiver rodando dentro do app nativo (Android/iOS), false no navegador. */
export const isNativePlatform = (): boolean => Capacitor.isNativePlatform();

/** 'android' | 'ios' | 'web' */
export const getPlatform = (): string => Capacitor.getPlatform();

/** True apenas no Android nativo. */
export const isAndroid = (): boolean => getPlatform() === 'android';

/**
 * Valor de padding-top recomendado para o topo da tela no app nativo (status bar / safe area).
 * Use em elementos fixos ou absolutos no topo (ex.: header com botão voltar).
 *
 * - No navegador: retorna undefined (não aplicar nada).
 * - No nativo: retorna string CSS, ex. "max(28px, env(safe-area-inset-top, 0px))".
 */
export const getNativeSafeAreaTop = (): string | undefined => {
  if (!isNativePlatform()) return undefined;
  return 'max(28px, env(safe-area-inset-top, 0px))';
};
