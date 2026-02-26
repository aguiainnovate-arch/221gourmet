/**
 * Perfil exibido e editável do motoboy (coleção motoboyProfiles, docId = userId).
 */
export interface MotoboyProfile {
  userId: string;
  name: string;
  phone?: string;
  photoUrl?: string;
  /** Exibido no header; usado para disponibilidade */
  isOnline: boolean;
  city?: string;
  updatedAt: Date;
}

export interface MotoboyProfileUpdate {
  name?: string;
  phone?: string;
  photoUrl?: string;
  isOnline?: boolean;
  city?: string;
}
