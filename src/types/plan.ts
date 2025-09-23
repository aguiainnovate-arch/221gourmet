export interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  period: 'monthly' | 'yearly';
  features: string[];
  maxTables: number;
  maxProducts: number;
  supportLevel: 'basic' | 'priority' | 'premium';
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePlanData {
  name: string;
  description: string;
  price: number;
  period: 'monthly' | 'yearly';
  features: string[];
  maxTables: number;
  maxProducts: number;
  supportLevel: 'basic' | 'priority' | 'premium';
  active: boolean;
}

export interface UpdatePlanData extends Partial<CreatePlanData> {}
