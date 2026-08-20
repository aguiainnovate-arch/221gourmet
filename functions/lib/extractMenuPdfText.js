"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractMenuPdfText = void 0;
/**
 * Extrai texto de um PDF enviado ao Firebase Storage.
 * PDFs com camada de texto: pdf-parse.
 * PDFs só-imagem (cardápio convertido/escaneado): páginas JPEG/PNG + GPT-4o-mini (visão).
 */
const admin = __importStar(require("firebase-admin"));
const openai_1 = __importDefault(require("openai"));
const https_1 = require("firebase-functions/v2/https");
const openaiSecret_1 = require("./openaiSecret");
const pdfEmbeddedImages_1 = require("./pdfEmbeddedImages");
// pdf-parse é CommonJS
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');
const STORAGE_PATH_REGEX = /^restaurants\/[A-Za-z0-9_-]+\/menu-imports\/[A-Za-z0-9._-]+\.pdf$/;
const MAX_RESPONSE_CHARS = 200000;
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
function meaningfulCharCount(text) {
    return (text.match(/[A-Za-zÀ-ÿ0-9]/g) || []).length;
}
async function transcribePdfImagesWithGpt(apiKey, images) {
    var _a, _b;
    const client = new openai_1.default({ apiKey });
    const content = [
        { type: 'text', text: VISION_PROMPT },
        ...images.map((img) => ({
            type: 'image_url',
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
    const raw = (_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content;
    if (!raw || typeof raw !== 'string' || meaningfulCharCount(raw) < MIN_MEANINGFUL_CHARS) {
        throw new https_1.HttpsError('internal', 'A IA não conseguiu ler os itens neste PDF. Tente um arquivo mais nítido ou envie fotos do cardápio.');
    }
    return raw.trim();
}
exports.extractMenuPdfText = (0, https_1.onCall)({
    secrets: [openaiSecret_1.openaiApiKey],
    region: 'us-central1',
    cors: true,
    memory: '1GiB',
    timeoutSeconds: 180,
}, async (request) => {
    var _a;
    ensureAdmin();
    const storagePath = (_a = request.data) === null || _a === void 0 ? void 0 : _a.storagePath;
    if (typeof storagePath !== 'string' || !STORAGE_PATH_REGEX.test(storagePath)) {
        throw new https_1.HttpsError('invalid-argument', 'storagePath inválido. Use o caminho retornado pelo upload (restaurants/{id}/menu-imports/...pdf).');
    }
    const bucket = admin.storage().bucket();
    const file = bucket.file(storagePath);
    const [exists] = await file.exists();
    if (!exists) {
        throw new https_1.HttpsError('not-found', 'Arquivo não encontrado no Storage.');
    }
    const [metadata] = await file.getMetadata();
    const contentType = (metadata.contentType || '').toLowerCase();
    if (contentType && contentType !== 'application/pdf') {
        throw new https_1.HttpsError('invalid-argument', 'O arquivo precisa ser application/pdf.');
    }
    const [buffer] = await file.download();
    if (!(buffer === null || buffer === void 0 ? void 0 : buffer.length)) {
        throw new https_1.HttpsError('invalid-argument', 'Arquivo vazio.');
    }
    let parsed;
    try {
        parsed = await pdfParse(buffer);
    }
    catch (e) {
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
    const images = (0, pdfEmbeddedImages_1.extractEmbeddedPdfImages)(buffer);
    if (images.length === 0) {
        throw new https_1.HttpsError('invalid-argument', 'Este PDF não tem texto selecionável nem imagens de página que a IA consiga ler. Envie um PDF com texto ou fotos nítidas do cardápio.');
    }
    const apiKey = openaiSecret_1.openaiApiKey.value();
    if (!apiKey) {
        throw new https_1.HttpsError('failed-precondition', 'Chave OpenAI não configurada no servidor (OPENAI_API_KEY).');
    }
    let visionText;
    try {
        visionText = await transcribePdfImagesWithGpt(apiKey, images);
    }
    catch (e) {
        if (e instanceof https_1.HttpsError)
            throw e;
        console.error('[extractMenuPdfText] OpenAI vision:', e);
        throw new https_1.HttpsError('internal', 'Não foi possível ler as imagens do PDF com IA. Tente novamente em instantes.');
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
});
//# sourceMappingURL=extractMenuPdfText.js.map