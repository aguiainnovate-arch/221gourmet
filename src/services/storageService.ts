import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject,
  listAll
} from 'firebase/storage';
import { storage } from '../../firebase';

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