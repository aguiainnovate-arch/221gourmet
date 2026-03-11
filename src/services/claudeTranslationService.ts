/**
 * Serviço de tradução ao vivo com Claude (Anthropic).
 * Traduz textos de cardápio (categorias, produtos) quando o cliente escolhe EN ou FR
 * e não existe tradução salva. Usa cache em memória para não repetir chamadas.
 */

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-3-5-haiku-20241022';

type TargetLang = 'en-US' | 'fr-FR';

const cache = new Map<string, string>();

function cacheKey(text: string, lang: string): string {
  const n = (text || '').trim().toLowerCase();
  return `${n}|${lang}`;
}

function getApiKey(): string | undefined {
  return import.meta.env.VITE_ANTHROPIC_API_KEY;
}

/**
 * Traduz uma lista de textos do português para o idioma alvo em uma única chamada.
 * Retorna o array na mesma ordem. Usa cache: textos já traduzidos não disparam nova chamada.
 */
export async function translateBatch(
  texts: string[],
  targetLang: TargetLang
): Promise<string[]> {
  const key = targetLang;
  const toTranslate: { index: number; text: string }[] = [];
  const result: string[] = new Array(texts.length);

  for (let i = 0; i < texts.length; i++) {
    const t = (texts[i] ?? '').trim();
    if (!t) {
      result[i] = '';
      continue;
    }
    const ck = cacheKey(t, key);
    if (cache.has(ck)) {
      result[i] = cache.get(ck)!;
    } else {
      toTranslate.push({ index: i, text: t });
    }
  }

  if (toTranslate.length === 0) {
    return result;
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn('[claudeTranslation] VITE_ANTHROPIC_API_KEY não definida; usando texto original.');
    toTranslate.forEach(({ index, text }) => {
      result[index] = text;
      cache.set(cacheKey(text, key), text);
    });
    return result;
  }

  const langName = targetLang === 'en-US' ? 'English' : 'French';
  const systemPrompt = `You are a restaurant menu translator. Translate from Portuguese (Brazil) to ${langName}.
Rules:
- Return ONLY a JSON array of strings, in the exact same order as the input list.
- One translated string per item. No explanations, no markdown, no extra text.
- Keep menu/food tone: natural and appetizing.
- Preserve proper nouns and brand names when appropriate.`;

  const inputList = toTranslate.map(({ text }) => text);
  const userMessage = `Translate these ${inputList.length} text(s) to ${langName}. Return only a JSON array of ${inputList.length} strings in the same order.\n\n${JSON.stringify(inputList)}`;

  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[claudeTranslation] API error', res.status, errText);
      toTranslate.forEach(({ index, text }) => {
        result[index] = text;
      });
      return result;
    }

    const data = await res.json();
    const content = data.content?.[0]?.text;
    if (!content || typeof content !== 'string') {
      toTranslate.forEach(({ index, text }) => {
        result[index] = text;
      });
      return result;
    }

    let parsed: string[];
    try {
      const cleaned = content.trim().replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
      parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) parsed = [];
    } catch {
      toTranslate.forEach(({ index, text }) => {
        result[index] = text;
      });
      return result;
    }

    toTranslate.forEach(({ index, text }, i) => {
      const translated = (parsed[i] ?? text).trim() || text;
      result[index] = translated;
      cache.set(cacheKey(text, key), translated);
    });

  } catch (err) {
    console.error('[claudeTranslation]', err);
    toTranslate.forEach(({ index, text }) => {
      result[index] = text;
    });
  }

  return result;
}

/**
 * Traduz um único texto. Usa cache.
 */
export async function translateOne(text: string, targetLang: TargetLang): Promise<string> {
  const [r] = await translateBatch([text], targetLang);
  return r ?? text;
}

export function isClaudeTranslationAvailable(): boolean {
  return !!getApiKey();
}
