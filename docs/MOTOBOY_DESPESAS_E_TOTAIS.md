# Despesas do dia e totais (Motoboy)

## O que foi implementado

- **Tela principal (Motoboy):** apenas resumo do dia atual:
  - Entregas do dia
  - Lucro bruto do dia
  - Despesas do dia
  - Lucro líquido do dia (em destaque; vermelho se negativo)
- **Botão "Despesas e totais":** abre a sidebar (drawer) à direita.
- **Sidebar (drawer):**
  1. **Detalhes do dia:** Gasolina (R$) obrigatório, Outras despesas (R$), Observação. Botões Salvar, Limpar; indicação "Já existe lançamento hoje" quando há registro.
  2. **Resumo do dia:** Lucro bruto, Total de despesas, Lucro líquido (verde/vermelho).
  3. **Totais:** Filtro 7 dias / 30 dias / 1 ano. Totais acumulados (lucro bruto, despesas, lucro líquido).

## Persistência

- Firestore coleção `motoboyDailyFinances`.
- Documento por (motoboyUserId + date): um registro por motoboy por dia.
- Campos: `motoboyUserId`, `date` (YYYY-MM-DD), `grossProfit`, `fuelExpense`, `otherExpense`, `totalExpense`, `netProfit`, `note`, `createdAt`, `updatedAt`.

## Regras de negócio

- `totalExpense = fuelExpense + otherExpense`
- `netProfit = grossProfit - totalExpense` (lucro bruto vem das entregas do dia; despesas do registro).
- Valores em R$ aceitos apenas >= 0; máscara de moeda nos inputs.
- Lucro líquido negativo é permitido e exibido em vermelho.

## Como rodar e testar

1. **Subir o app**
   ```bash
   npm run dev
   ```

2. **Acessar como motoboy**
   - Ir em Delivery → fazer login com um usuário que seja motoboy (conforme CREDENCIAIS_DEMO ou usuário criado com `create:motoboy`).

3. **Tela principal**
   - Ver "Resumo do dia" com 4 cards (entregas, lucro bruto, despesas, lucro líquido).
   - Clicar em **"Despesas e totais"** para abrir o drawer.

4. **Drawer**
   - Preencher **Gasolina (R$)** (ex.: 25,00) e opcionalmente Outras despesas e Observação.
   - Clicar **Salvar** → o resumo do dia e os totais são recalculados.
   - **Limpar** zera apenas os campos do formulário (não apaga o registro salvo).
   - Trocar o filtro em **Totais** (7 dias / 30 dias / 1 ano) e conferir os valores acumulados.

5. **Regras do Firestore**
   - Garantir que a coleção `motoboyDailyFinances` esteja permitida para o usuário autenticado (leitura/escrita pelo motoboy dono do documento, por exemplo `motoboyUserId == request.auth.uid` ou pela regra que o projeto já usa para motoboys).

## Arquivos criados/alterados

- `src/types/dailyFinance.ts` – tipos
- `src/utils/currencyUtils.ts` – formatação e parse de R$
- `src/utils/dateUtils.ts` – datas (YYYY-MM-DD, períodos)
- `src/services/dailyFinanceService.ts` – CRUD e totais por período
- `src/services/deliveryRequestService.ts` – `getMotoboyDayStats` e `getMotoboyDayStatsBatch`
- `src/components/MotoboyFinanceDrawer.tsx` – drawer com formulário e totais
- `src/pages/MotoboyDashboard.tsx` – resumo do dia + botão que abre o drawer
