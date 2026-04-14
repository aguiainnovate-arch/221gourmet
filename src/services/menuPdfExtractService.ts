import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase';

export interface ExtractMenuPdfTextResult {
  text: string;
  pageCount: number;
  charCount: number;
  truncated: boolean;
}

const extractFn = httpsCallable<{ storagePath: string }, ExtractMenuPdfTextResult>(
  functions,
  'extractMenuPdfText'
);

/**
 * Chama a Cloud Function que baixa o PDF do Storage (binário) e devolve o texto extraído.
 */
export async function extractMenuPdfTextFromStorage(
  storagePath: string
): Promise<ExtractMenuPdfTextResult> {
  const res = await extractFn({ storagePath });
  return res.data;
}
