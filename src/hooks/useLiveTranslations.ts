import { useState, useEffect, useMemo } from 'react';
import { getProductTranslation, getCategoryTranslation } from '../utils/translationUtils';
import { translateBatch } from '../services/claudeTranslationService';
import type { Product } from '../types/product';
import type { Category } from '../services/categoryService';

type Lang = string;

/**
 * Hook que aplica traduções salvas e, quando o idioma é EN ou FR,
 * preenche traduções faltantes via Claude (tradução ao vivo).
 * Retorna produtos e categorias com name/description já traduzidos para exibição.
 */
export function useLiveTranslations(
  products: Product[],
  categories: Category[],
  language: Lang
): { products: Product[]; categories: Category[]; loading: boolean } {
  const targetLang = language === 'en-US' || language === 'fr-FR' ? language : null;
  const [liveOverrides, setLiveOverrides] = useState<{
    productNames: Record<string, string>;
    productDescriptions: Record<string, string>;
    categoryNames: Record<string, string>;
  }>({ productNames: {}, productDescriptions: {}, categoryNames: {} });
  const [loading, setLoading] = useState(false);

  // Limpar overrides ao mudar idioma para pt-BR ou ao mudar lista
  useEffect(() => {
    if (!targetLang) {
      setLiveOverrides({ productNames: {}, productDescriptions: {}, categoryNames: {} });
    }
  }, [targetLang]);

  // Coletar textos sem tradução salva e chamar Claude em batch
  useEffect(() => {
    if (!targetLang || !products.length) return;

    const toTranslate: { type: 'productName' | 'productDesc' | 'categoryName'; id: string; text: string }[] = [];

    products.forEach((p) => {
      const current = getProductTranslation(p, targetLang);
      if (current.name === p.name && p.name.trim()) {
        toTranslate.push({ type: 'productName', id: p.id, text: p.name });
      }
      if (current.description === p.description && (p.description || '').trim()) {
        toTranslate.push({ type: 'productDesc', id: p.id, text: p.description || '' });
      }
    });

    categories.forEach((c) => {
      const current = getCategoryTranslation(c, targetLang);
      if (current === c.name && c.name.trim()) {
        toTranslate.push({ type: 'categoryName', id: c.id, text: c.name });
      }
    });

    if (toTranslate.length === 0) {
      return;
    }

    setLoading(true);
    const texts = toTranslate.map((x) => x.text);
    let cancelled = false;

    translateBatch(texts, targetLang).then((translated) => {
      if (cancelled) return;
      setLoading(false);
      const productNames: Record<string, string> = {};
      const productDescriptions: Record<string, string> = {};
      const categoryNames: Record<string, string> = {};
      toTranslate.forEach((item, i) => {
        const value = translated[i] ?? item.text;
        if (item.type === 'productName') productNames[item.id] = value;
        else if (item.type === 'productDesc') productDescriptions[item.id] = value;
        else if (item.type === 'categoryName') categoryNames[item.id] = value;
      });
      setLiveOverrides((prev) => ({
        productNames: { ...prev.productNames, ...productNames },
        productDescriptions: { ...prev.productDescriptions, ...productDescriptions },
        categoryNames: { ...prev.categoryNames, ...categoryNames },
      }));
    });

    return () => {
      cancelled = true;
      setLoading(false);
    };
  }, [targetLang, products, categories]);

  return useMemo(() => {
    if (language === 'pt-BR') {
      return {
        products,
        categories,
        loading: false,
      };
    }

    const lang = language as 'en-US' | 'fr-FR';
    const hasStoredOrLive = (p: Product) => {
      const stored = getProductTranslation(p, lang);
      const liveName = liveOverrides.productNames[p.id];
      const liveDesc = liveOverrides.productDescriptions[p.id];
      return {
        name: liveName ?? stored.name,
        description: liveDesc ?? stored.description,
      };
    };
    const translatedProducts: Product[] = products.map((p) => {
      const { name, description } = hasStoredOrLive(p);
      return { ...p, name, description };
    });

    const translatedCategories: Category[] = categories.map((c) => {
      const stored = getCategoryTranslation(c, lang);
      const liveName = liveOverrides.categoryNames[c.id];
      return { ...c, name: liveName ?? stored };
    });

return {
        products: translatedProducts,
        categories: translatedCategories,
        loading: targetLang ? loading : false,
      };
  }, [language, products, categories, liveOverrides, loading, targetLang]);
}
