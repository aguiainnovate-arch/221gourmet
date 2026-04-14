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
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractMenuPdfText = void 0;
/**
 * Extrai texto de um PDF enviado ao Firebase Storage (fluxo binário → texto).
 * Funciona bem em PDFs com camada de texto. PDFs só-imagem exigem OCR (fora do escopo aqui).
 */
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
// pdf-parse é CommonJS
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');
const STORAGE_PATH_REGEX = /^restaurants\/[A-Za-z0-9_-]+\/menu-imports\/[A-Za-z0-9._-]+\.pdf$/;
const MAX_RESPONSE_CHARS = 200000;
function ensureAdmin() {
    if (!admin.apps.length) {
        admin.initializeApp();
    }
}
exports.extractMenuPdfText = (0, https_1.onCall)({
    region: 'us-central1',
    cors: true,
    memory: '512MiB',
    timeoutSeconds: 120,
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
        throw new https_1.HttpsError('invalid-argument', 'Não foi possível ler este PDF. Confirme que não está corrompido e que possui texto selecionável (não é apenas escaneado como imagem).');
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
});
//# sourceMappingURL=extractMenuPdfText.js.map