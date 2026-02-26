/**
 * Papel do usuário no sistema (login único: mesma tela, redirecionamento por role).
 */
export type UserRole = 'RESTAURANT' | 'MOTOBOY';

export interface AppUser {
  id: string;
  email: string;
  /** Hash bcrypt da senha */
  passwordHash: string;
  role: UserRole;
  displayName?: string;
  phone?: string;
  /** Apenas para role RESTAURANT: ID do restaurante vinculado */
  restaurantId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMotoboyData {
  email: string;
  password: string;
  displayName?: string;
  phone?: string;
}
