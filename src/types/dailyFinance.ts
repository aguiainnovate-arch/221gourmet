/**
 * Registro de finanças do dia do motoboy (despesas + resumo calculado).
 * totalExpense = fuelExpense + otherExpense
 * netProfit = grossProfit - totalExpense
 */
export interface DailyFinance {
  id?: string;
  /** ID do motoboy (dono do registro) */
  motoboyUserId: string;
  /** Data no formato YYYY-MM-DD */
  date: string;
  /** Lucro bruto do dia (soma das fees das entregas aceitas/concluídas no dia) */
  grossProfit: number;
  /** Despesa com gasolina (R$) */
  fuelExpense: number;
  /** Outras despesas (R$) */
  otherExpense: number;
  /** Total de despesas (calculado: fuelExpense + otherExpense) */
  totalExpense: number;
  /** Lucro líquido (calculado: grossProfit - totalExpense) */
  netProfit: number;
  /** Observação opcional */
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Dados para criar/atualizar (sem campos calculados; grossProfit vem do backend no dia). */
export interface DailyFinanceInput {
  date: string;
  fuelExpense: number;
  otherExpense: number;
  note?: string;
}

/** Resumo do dia (para exibir na tela principal). */
export interface DaySummary {
  date: string;
  deliveriesCount: number;
  grossProfit: number;
  totalExpense: number;
  netProfit: number;
}
