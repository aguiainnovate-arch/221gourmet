export interface MotoboyProfile {
  id: string;
  motoboyUserId: string;
  name: string;
  phone?: string;
  city?: string;
  photoUrl?: string;
  isOnline?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
