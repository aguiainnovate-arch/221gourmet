export interface Waiter {
  id: string;
  restaurantId: string;
  name: string;
  cpf: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWaiterData {
  restaurantId: string;
  name: string;
  cpf: string;
  password: string;
}
