/**
 * Serviço de imagens de comida.
 * Usa a API do Unsplash quando VITE_UNSPLASH_ACCESS_KEY está definida.
 * Sem chave, retorna URLs estáticas de fallback (Unsplash CDN).
 *
 * Para obter uma chave gratuita: https://unsplash.com/developers
 * Crie uma aplicação e use "Access Key" em .env como VITE_UNSPLASH_ACCESS_KEY=
 */

const UNSPLASH_ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY as string | undefined;

export interface FoodImage {
  url: string;
  alt: string;
  thumb?: string;
}

/** Imagens de fallback (Unsplash CDN, sem API) quando não há chave */
const FALLBACK_FOOD_IMAGES: FoodImage[] = [
  { url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&h=320&fit=crop', alt: 'Pizza' },
  { url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&h=320&fit=crop', alt: 'Prato' },
  { url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&h=320&fit=crop', alt: 'Lanches' },
  { url: 'https://images.unsplash.com/photo-1551183053-bf0a3f510e27?w=500&h=320&fit=crop', alt: 'Massas' },
];

/** Queries para buscar fotos de comida na API Unsplash */
const FOOD_QUERIES = ['pizza', 'prato comida', 'hamburguer lanches', 'massas comida'];

/**
 * Busca imagens de comida na API Unsplash (uma por query).
 * Retorna até 4 imagens. Em caso de erro ou sem chave, retorna fallback.
 */
export async function fetchFeaturedFoodImages(): Promise<FoodImage[]> {
  if (!UNSPLASH_ACCESS_KEY?.trim()) {
    return FALLBACK_FOOD_IMAGES;
  }

  try {
    const results: FoodImage[] = [];
    for (const query of FOOD_QUERIES) {
      const url = new URL('https://api.unsplash.com/search/photos');
      url.searchParams.set('query', query);
      url.searchParams.set('client_id', UNSPLASH_ACCESS_KEY);
      url.searchParams.set('per_page', '1');
      url.searchParams.set('orientation', 'landscape');

      const res = await fetch(url.toString());
      if (!res.ok) {
        if (res.status === 403 || res.status === 401) {
          console.warn('Unsplash API: chave inválida ou limite atingido. Usando imagens de fallback.');
          return FALLBACK_FOOD_IMAGES;
        }
        continue;
      }
      const data = await res.json();
      const hit = data.results?.[0];
      if (hit?.urls?.regular) {
        const imgUrl = `${hit.urls.regular}?w=500&h=320&fit=crop`;
        results.push({
          url: imgUrl,
          alt: hit.alt_description || query,
          thumb: hit.urls.small,
        });
      }
    }
    if (results.length >= 2) {
      return results;
    }
  } catch (e) {
    console.warn('Erro ao buscar imagens Unsplash:', e);
  }
  return FALLBACK_FOOD_IMAGES;
}

/**
 * Retorna imagens de destaque: tenta API primeiro, depois fallback.
 * Para uso imediato (SSR ou sem await), use getDefaultFoodImages().
 */
export function getDefaultFoodImages(): FoodImage[] {
  return FALLBACK_FOOD_IMAGES;
}
