/**
 * Extrai texto de um PDF enviado ao Firebase Storage.
 * PDFs com camada de texto: pdf-parse.
 * PDFs só-imagem (cardápio convertido/escaneado): páginas JPEG/PNG + GPT-4o-mini (visão).
 */
import * as admin from 'firebase-admin';
import OpenAI from 'openai';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { openaiApiKey } from './openaiSecret';
import { extractEmbeddedPdfImages } from './pdfEmbeddedImages';

// pdf-parse é CommonJS
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (
  data: Buffer
) => Promise<{ text: string; numpages: number }>;

const STORAGE_PATH_REGEX =
  /^restaurants\/[A-Za-z0-9_-]+\/menu-imports\/[A-Za-z0-9._-]+\.pdf$/;

const MAX_RESPONSE_CHARS = 200_000;
const MIN_MEANINGFUL_CHARS = 40;
const MODEL = 'gpt-4o-mini';

const VISION_PROMPT = `Transcreva TODO o cardápio visível nestas imagens de páginas de PDF.

Formato de cada item (uma linha):
CATEGORIA | NOME | DESCRIÇÃO | R$ PREÇO

Regras:
- Inclua todos os pratos, pizzas, petiscos, caldos, bebidas e tamanhos visíveis.
- Não invente item nem preço. Se o preço não aparecer, omita a linha.
- Ignore telefone, endereço, Instagram, WhatsApp e formas de pagamento.
- Não copie slogans nem nome do restaurante como item.
- Se houver tabela de tamanhos (ex.: Pizza M/G/GG/XG com preços) e uma lista de sabores sem preço individual, gere UMA linha por sabor e tamanho: "Pizzas | Calabresa (G) | ingredientes | R$ 60".
- Mantenha nomes como no cardápio.
- Responda só com as linhas do cardápio, sem markdown e sem comentário.`;

function ensureAdmin() {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
}

function meaningfulCharCount(text: string): number {
  return (text.match(/[A-Za-zÀ-ÿ0-9]/g) || []).length;
}

async function transcribePdfImagesWithGpt(
  apiKey: string,
  images: ReturnType<typeof extractEmbeddedPdfImages>
): Promise<string> {
  const client = new OpenAI({ apiKey });
  const content: OpenAI.Chat.ChatCompletionContentPart[] = [
    { type: 'text', text: VISION_PROMPT },
    ...images.map((img) => ({
      type: 'image_url' as const,
      image_url: {
        url: `data:${img.mimeType};base64,${img.buffer.toString('base64')}`,
      },
    })),
  ];

  const response = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    max_tokens: 4096,
    messages: [{ role: 'user', content }],
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw || typeof raw !== 'string' || meaningfulCharCount(raw) < MIN_MEANINGFUL_CHARS) {
    throw new HttpsError(
      'internal',
      'A IA não conseguiu ler os itens neste PDF. Tente um arquivo mais nítido ou envie fotos do cardápio.'
    );
  }
  return raw.trim();
}

export const extractMenuPdfText = onCall(
  {
    secrets: [openaiApiKey],
    region: 'us-central1',
    cors: true,
    memory: '1GiB',
    timeoutSeconds: 180,
  },
  async (request): Promise<{
    text: string;
    pageCount: number;
    charCount: number;
    truncated: boolean;
    usedVision: boolean;
  }> => {
    ensureAdmin();

    const storagePath = request.data?.storagePath;
    if (typeof storagePath !== 'string' || !STORAGE_PATH_REGEX.test(storagePath)) {
      throw new HttpsError(
        'invalid-argument',
        'storagePath inválido. Use o caminho retornado pelo upload (restaurants/{id}/menu-imports/...pdf).'
      );
    }

    const bucket = admin.storage().bucket();
    const file = bucket.file(storagePath);
    const [exists] = await file.exists();
    if (!exists) {
      throw new HttpsError('not-found', 'Arquivo não encontrado no Storage.');
    }

    const [metadata] = await file.getMetadata();
    const contentType = (metadata.contentType || '').toLowerCase();
    if (contentType && contentType !== 'application/pdf') {
      throw new HttpsError('invalid-argument', 'O arquivo precisa ser application/pdf.');
    }

    const [buffer] = await file.download();
    if (!buffer?.length) {
      throw new HttpsError('invalid-argument', 'Arquivo vazio.');
    }

    let parsed: { text: string; numpages: number };
    try {
      parsed = await pdfParse(buffer);
    } catch (e) {
      console.error('[extractMenuPdfText] pdf-parse:', e);
      parsed = { text: '', numpages: 0 };
    }

    const rawText = (parsed.text || '').replace(/\r\n/g, '\n').trim();
    const pageCount = typeof parsed.numpages === 'number' ? parsed.numpages : 0;

    if (meaningfulCharCount(rawText) >= MIN_MEANINGFUL_CHARS) {
      const truncated = rawText.length > MAX_RESPONSE_CHARS;
      const text = truncated ? rawText.slice(0, MAX_RESPONSE_CHARS) : rawText;
      return {
        text,
        pageCount,
        charCount: rawText.length,
        truncated,
        usedVision: false,
      };
    }

    const images = extractEmbeddedPdfImages(buffer);
    if (images.length === 0) {
      throw new HttpsError(
        'invalid-argument',
        'Este PDF não tem texto selecionável nem imagens de página que a IA consiga ler. Envie um PDF com texto ou fotos nítidas do cardápio.'
      );
    }

    const apiKey = openaiApiKey.value();
    if (!apiKey) {
      throw new HttpsError(
        'failed-precondition',
        'Chave OpenAI não configurada no servidor (OPENAI_API_KEY).'
      );
    }

    let visionText: string;
    try {
      visionText = await transcribePdfImagesWithGpt(apiKey, images);
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      console.error('[extractMenuPdfText] OpenAI vision:', e);
      throw new HttpsError(
        'internal',
        'Não foi possível ler as imagens do PDF com IA. Tente novamente em instantes.'
      );
    }

    const truncated = visionText.length > MAX_RESPONSE_CHARS;
    const text = truncated ? visionText.slice(0, MAX_RESPONSE_CHARS) : visionText;

    return {
      text,
      pageCount: pageCount || images.length,
      charCount: visionText.length,
      truncated,
      usedVision: true,
    };
  }
);
