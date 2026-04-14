import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase';

export interface ImportMenuFromClaudeResponse {
  success: boolean;
  categoriesCreated: number;
  productsCreated: number;
  productsSkipped: number;
  warnings: string[];
  errors: string[];
}

const importFn = httpsCallable<
  { restaurantId: string; menuText: string },
  ImportMenuFromClaudeResponse
>(functions, 'importMenuFromClaudeText');

/**
 * Envia o texto do cardápio para o Claude (via Cloud Function) e grava
 * categorias e produtos no Firestore do restaurante.
 */
export async function importMenuFromClaudeText(
  restaurantId: string,
  menuText: string
): Promise<ImportMenuFromClaudeResponse> {
  const res = await importFn({ restaurantId, menuText });
  return res.data;
}
