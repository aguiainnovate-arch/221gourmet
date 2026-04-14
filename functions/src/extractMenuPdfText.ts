/**
 * Extrai texto de um PDF enviado ao Firebase Storage (fluxo binário → texto).
 * Funciona bem em PDFs com camada de texto. PDFs só-imagem exigem OCR (fora do escopo aqui).
 */
import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

// pdf-parse é CommonJS
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (
  data: Buffer
) => Promise<{ text: string; numpages: number }>;

const STORAGE_PATH_REGEX =
  /^restaurants\/[A-Za-z0-9_-]+\/menu-imports\/[A-Za-z0-9._-]+\.pdf$/;

const MAX_RESPONSE_CHARS = 200_000;

function ensureAdmin() {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
}

export const extractMenuPdfText = onCall(
  {
    region: 'us-central1',
    cors: true,
    memory: '512MiB',
    timeoutSeconds: 120,
  },
  async (request): Promise<{
    text: string;
    pageCount: number;
    charCount: number;
    truncated: boolean;
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
      throw new HttpsError(
        'invalid-argument',
        'Não foi possível ler este PDF. Confirme que não está corrompido e que possui texto selecionável (não é apenas escaneado como imagem).'
      );
    }

    const rawText = (parsed.text || '').replace(/\r\n/g, '\n').trim();
    const truncated = rawText.length > MAX_RESPONSE_CHARS;
    const text = truncated ? rawText.slice(0, MAX_RESPONSE_CHARS) : rawText;

    return {
      text,
      pageCount: typeof parsed.numpages === 'number' ? parsed.numpages : 0,
      charCount: rawText.length,
      truncated,
    };
  }
);
