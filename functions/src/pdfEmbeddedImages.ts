const MIN_IMAGE_BYTES = 20_000;
const MAX_IMAGES = 8;

export interface EmbeddedPdfImage {
  mimeType: 'image/jpeg' | 'image/png';
  buffer: Buffer;
}

const JPEG_SOI = Buffer.from([0xff, 0xd8]);
const JPEG_EOI = Buffer.from([0xff, 0xd9]);
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PNG_IEND = Buffer.from([0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);

/**
 * PDFs de cardápio convertidos (flyer/foto) costumam embutir JPEG/PNG por página.
 * Extraímos esses bytes para enviar à API de visão quando não há camada de texto.
 */
export function extractEmbeddedPdfImages(pdf: Buffer): EmbeddedPdfImage[] {
  const found: Array<EmbeddedPdfImage & { start: number }> = [
    ...findSlices(pdf, JPEG_SOI, JPEG_EOI).map((hit) => ({
      start: hit.start,
      mimeType: 'image/jpeg' as const,
      buffer: hit.buffer,
    })),
    ...findSlices(pdf, PNG_SIG, PNG_IEND).map((hit) => ({
      start: hit.start,
      mimeType: 'image/png' as const,
      buffer: hit.buffer,
    })),
  ];

  found.sort((a, b) => a.start - b.start);
  return found.slice(0, MAX_IMAGES).map(({ mimeType, buffer }) => ({ mimeType, buffer }));
}

function findSlices(
  pdf: Buffer,
  startMarker: Buffer,
  endMarker: Buffer
): Array<{ start: number; buffer: Buffer }> {
  const out: Array<{ start: number; buffer: Buffer }> = [];
  let from = 0;
  while (from < pdf.length) {
    const start = pdf.indexOf(startMarker, from);
    if (start < 0) break;
    const end = pdf.indexOf(endMarker, start + startMarker.length);
    if (end < 0) break;
    const finish = end + endMarker.length;
    const buffer = Buffer.from(pdf.subarray(start, finish));
    if (buffer.length >= MIN_IMAGE_BYTES) {
      out.push({ start, buffer });
    }
    from = finish;
  }
  return out;
}
