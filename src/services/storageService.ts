import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject,
  listAll
} from 'firebase/storage';
import { storage } from '../../firebase';

// ============ Constantes para upload de imagens de produtos ============
/** Tipos MIME permitidos para fotos de itens */
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] as const;
/** Extensões permitidas (para validação por nome de arquivo) */
export const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
/** Tamanho máximo por imagem: 5MB */
export const MAX_PRODUCT_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

/** PDF de cardápio para extração de texto (importação) */
export const MAX_MENU_PDF_BYTES = 15 * 1024 * 1024;

export interface UploadResult {
  url: string;
  path: string;
  success: boolean;
  error?: string;
}

export interface ImageMetadata {
  name: string;
  url: string;
  path: string;
  size: number;
  contentType: string;
  uploadedAt: Date;
}

/**
 * Extrai o path do Storage a partir da URL de download do Firebase Storage.
 * Usado para deletar a imagem antiga ao substituir ou remover.
 */
export function extractStoragePathFromUrl(imageUrl: string): string | null {
  if (!imageUrl || typeof imageUrl !== 'string') return null;
  try {
    const url = new URL(imageUrl);
    const match = url.pathname.match(/\/o\/(.+?)(?:\?|$)/);
    if (!match) return null;
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

/**
 * Caminho escalável: restaurants/{restaurantId}/items/{itemId}/{fileName}
 */
export function buildProductImagePath(restaurantId: string, itemId: string, fileName: string): string {
  return `restaurants/${restaurantId}/items/${itemId}/${fileName}`;
}

/**
 * Nome de arquivo seguro (evita path traversal e caracteres inválidos).
 */
export function sanitizeFileName(name: string): string {
  const safe = name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.{2,}/g, '_');
  const ext = (safe.match(/\.[a-z0-9]+$/i) || [])[0] || '';
  const base = safe.replace(/\.[a-z0-9]+$/i, '') || 'image';
  return `${base.slice(0, 80)}${ext}`.toLowerCase() || 'image.jpg';
}

/**
 * Upload de imagem de produto para Firebase Storage.
 * Path: restaurants/{restaurantId}/items/{productId ou temp_ts}/{safeFileName}
 */
export async function uploadProductImage(
  file: File,
  restaurantId: string,
  productId?: string
): Promise<UploadResult> {
  try {
    const type = (file.type || '').toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.includes(type as any)) {
      throw new Error('Formato inválido. Use JPG, PNG ou WebP.');
    }
    if (file.size > MAX_PRODUCT_IMAGE_SIZE_BYTES) {
      throw new Error('Arquivo muito grande. Máximo 5MB.');
    }

    const itemId = productId || `temp_${Date.now()}`;
    const baseName = sanitizeFileName(file.name);
    const ext = (baseName.match(/\.[a-z0-9]+$/i) || ['.jpg'])[0];
    const nameWithoutExt = baseName.replace(/\.[a-z0-9]+$/i, '') || 'image';
    const uniqueName = `${nameWithoutExt}_${Date.now()}${ext}`;
    const fullPath = buildProductImagePath(restaurantId, itemId, uniqueName);

    const storageRef = ref(storage, fullPath);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);

    return { url: downloadURL, path: fullPath, success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao enviar imagem.';
    console.error('uploadProductImage:', err);
    return { url: '', path: '', success: false, error: message };
  }
}

/**
 * Upload de PDF do cardápio para extração de texto no servidor.
 * Path: restaurants/{restaurantId}/menu-imports/import_{timestamp}_{nome}.pdf
 */
export async function uploadMenuPdfForExtraction(
  file: File,
  restaurantId: string
): Promise<UploadResult> {
  try {
    const type = (file.type || '').toLowerCase();
    const nameLower = (file.name || '').toLowerCase();
    if (type !== 'application/pdf' && !nameLower.endsWith('.pdf')) {
      throw new Error('Envie um arquivo PDF.');
    }
    if (file.size > MAX_MENU_PDF_BYTES) {
      throw new Error('PDF muito grande. Máximo 15MB.');
    }

    const base = sanitizeFileName(file.name.replace(/\.pdf$/i, '') || 'cardapio');
    const safeBase = base.replace(/\.[a-z0-9]+$/i, '') || 'cardapio';
    const uniqueName = `import_${Date.now()}_${safeBase}.pdf`;
    const fullPath = `restaurants/${restaurantId}/menu-imports/${uniqueName}`;

    const storageRef = ref(storage, fullPath);
    await uploadBytes(storageRef, file, { contentType: 'application/pdf' });
    const downloadURL = await getDownloadURL(storageRef);

    return { url: downloadURL, path: fullPath, success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao enviar PDF.';
    console.error('uploadMenuPdfForExtraction:', err);
    return { url: '', path: '', success: false, error: message };
  }
}

/**
 * Faz upload de uma imagem para o Firebase Storage
 * @param file - Arquivo de imagem para upload
 * @param folder - Pasta onde salvar (ex: 'products', 'categories')
 * @param fileName - Nome personalizado do arquivo (opcional)
 */
export const uploadImage = async (
  file: File, 
  folder: string, 
  fileName?: string
): Promise<UploadResult> => {
  try {
    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      throw new Error('Arquivo deve ser uma imagem');
    }

    // Validar tamanho (máximo 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error('Arquivo muito grande. Máximo 5MB permitido.');
    }

    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const finalFileName = fileName 
      ? `${fileName}_${timestamp}.${fileExtension}`
      : `${timestamp}_${file.name}`;

    // Criar referência no Storage
    const storageRef = ref(storage, `${folder}/${finalFileName}`);

    // Fazer upload
    const snapshot = await uploadBytes(storageRef, file);
    
    // Obter URL de download
    const downloadURL = await getDownloadURL(snapshot.ref);

    return {
      url: downloadURL,
      path: snapshot.ref.fullPath,
      success: true
    };
  } catch (error) {
    console.error('Erro no upload da imagem:', error);
    return {
      url: '',
      path: '',
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido no upload'
    };
  }
};

/**
 * Remove uma imagem do Firebase Storage
 * @param imagePath - Caminho da imagem no Storage
 */
export const deleteImage = async (imagePath: string): Promise<boolean> => {
  try {
    const imageRef = ref(storage, imagePath);
    await deleteObject(imageRef);
    return true;
  } catch (error) {
    console.error('Erro ao deletar imagem:', error);
    return false;
  }
};

/**
 * Remove uma imagem pela URL
 * @param imageUrl - URL da imagem
 */
export const deleteImageByUrl = async (imageUrl: string): Promise<boolean> => {
  try {
    // Extrair o path da URL
    const url = new URL(imageUrl);
    const pathMatch = url.pathname.match(/\/o\/(.+?)\?/);
    
    if (!pathMatch) {
      throw new Error('URL inválida do Firebase Storage');
    }

    const imagePath = decodeURIComponent(pathMatch[1]);
    return await deleteImage(imagePath);
  } catch (error) {
    console.error('Erro ao deletar imagem por URL:', error);
    return false;
  }
};

/**
 * Lista todas as imagens em uma pasta
 * @param folder - Pasta para listar
 */
export const listImagesInFolder = async (folder: string): Promise<ImageMetadata[]> => {
  try {
    const folderRef = ref(storage, folder);
    const result = await listAll(folderRef);
    
    const images: ImageMetadata[] = [];
    
    for (const itemRef of result.items) {
      try {
        const url = await getDownloadURL(itemRef);
        
        images.push({
          name: itemRef.name,
          url,
          path: itemRef.fullPath,
          size: 0,
          contentType: 'image/*',
          uploadedAt: new Date()
        });
      } catch (error) {
        console.warn(`Erro ao obter metadados de ${itemRef.name}:`, error);
      }
    }
    
    return images;
  } catch (error) {
    console.error('Erro ao listar imagens:', error);
    return [];
  }
};

/**
 * Gera uma URL de preview para uma imagem
 * @param imagePath - Caminho da imagem
 */
export const getImagePreviewUrl = async (imagePath: string): Promise<string> => {
  try {
    const imageRef = ref(storage, imagePath);
    return await getDownloadURL(imageRef);
  } catch (error) {
    console.error('Erro ao obter URL de preview:', error);
    return '';
  }
};

/**
 * Faz upload de um arquivo de áudio para o Firebase Storage
 * @param file - Arquivo de áudio para upload
 * @param folder - Pasta onde salvar (ex: 'audio', 'sounds')
 * @param fileName - Nome personalizado do arquivo (opcional)
 */
export const uploadAudio = async (
  file: File, 
  folder: string, 
  fileName?: string
): Promise<UploadResult> => {
  try {
    // Validar tipo de arquivo (aceitar apenas MP3)
    if (file.type !== 'audio/mpeg' && file.type !== 'audio/mp3') {
      throw new Error('Arquivo deve ser um MP3');
    }

    // Validar tamanho (máximo 10MB para áudio)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('Arquivo muito grande. Máximo 10MB permitido.');
    }

    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const finalFileName = fileName 
      ? `${fileName}_${timestamp}.${fileExtension}`
      : `${timestamp}_${file.name}`;

    // Criar referência no Storage
    const storageRef = ref(storage, `${folder}/${finalFileName}`);

    // Fazer upload
    const snapshot = await uploadBytes(storageRef, file);
    
    // Obter URL de download
    const downloadURL = await getDownloadURL(snapshot.ref);

    return {
      url: downloadURL,
      path: snapshot.ref.fullPath,
      success: true
    };
  } catch (error) {
    console.error('Erro no upload do áudio:', error);
    return {
      url: '',
      path: '',
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido no upload'
    };
  }
};

/**
 * Remove um arquivo de áudio do Firebase Storage
 * @param audioPath - Caminho do áudio no Storage
 */
export const deleteAudio = async (audioPath: string): Promise<boolean> => {
  try {
    const audioRef = ref(storage, audioPath);
    await deleteObject(audioRef);
    return true;
  } catch (error) {
    console.error('Erro ao deletar áudio:', error);
    return false;
  }
};