# Relatório de Desenvolvimento — Entrega: Tempo Real, Motoboy e UI

**Data:** 19/02/2026  
**Escopo:** Atualização em tempo real na página Meus Pedidos, correção da taxa de aceitação do motoboy, funcionalidade de despesas do dia, melhorias de UI no carrinho e na tela do motoboy.

---

## Código 1 — Página Meus Pedidos (Orders) e tempo real

1. **Problema:** O status do pedido (ex.: "Pronto para entrega") só atualizava quando o cliente recarregava a página ou após o intervalo de 30 segundos.

2. **Solução:** Foi criada a função `subscribeDeliveryOrdersByPhone(phone, onOrders)` no serviço de delivery, utilizando `onSnapshot` do Firestore na coleção `deliveries` filtrada por `customerPhone`.

3. **Motivo:** O Firestore envia eventos em tempo real sempre que um documento é alterado; assim, qualquer mudança feita pelo restaurante no status do pedido é refletida imediatamente na tela do cliente.

4. **Implementação na Orders:** O efeito que chamava `loadOrders` uma vez e o intervalo de 30 segundos foram substituídos por um único `useEffect` que, quando há telefone do cliente, chama `subscribeDeliveryOrdersByPhone` e mantém a lista atualizada via callback.

5. **Cleanup:** Ao desmontar o componente ou ao mudar o telefone, a função retornada pelo `subscribeDeliveryOrdersByPhone` (unsubscribe) é chamada para evitar vazamento de listeners e leituras desnecessárias.

6. **Correção de sintaxe:** Foi removido um `const` duplicado na declaração do estado `expandedOrders` na página Orders, que gerava erro de compilação.

7. **Benefício para o cliente:** O cliente passa a ver mudanças de status (confirmado, preparando, pronto para entrega, em entrega, entregue) assim que o restaurante ou o sistema as alteram, sem precisar recarregar a página.

---

## Código 2 — Taxa de aceitação e recusa do motoboy

8. **Problema:** A taxa de aceitação do motoboy não considerava as recusas: ao recusar uma chamada, o valor não era contabilizado e as métricas ficavam incorretas.

9. **Causa raiz:** A lista de chamadas do motoboy é obtida com `getDeliveryRequestsByMotoboy(motoboyUserId)`, que filtra por `motoboyUserId`. Ao recusar, apenas o status era alterado para `RECUSADA`, sem gravar o `motoboyUserId` no documento.

10. **Ajuste na API:** A função `refuseDeliveryRequest` passou a receber o parâmetro `motoboyUserId` e a gravar no documento, além de `status: 'RECUSADA'` e `updatedAt`, o campo `motoboyUserId`.

11. **Ajuste na tela:** No MotoboyDashboard, a chamada de recusa foi atualizada para `refuseDeliveryRequest(requestId, motoboyUserId)` e foi adicionada a verificação `if (!motoboyUserId) return` antes de executar a recusa.

12. **Resultado:** As chamadas recusadas passam a integrar a lista retornada por `getDeliveryRequestsByMotoboy`, e o cálculo de `acceptanceRate` e `refusalRate` em `getMotoboyKPIs` passa a refletir corretamente aceites e recusas.

13. **Benefício:** Métricas de desempenho do motoboy (taxa de aceitação e de recusa) ficam confiáveis para gestão e acompanhamento.

---

## Código 3 — Resumo do pedido no Delivery (DeliveryMenu)

14. **Objetivo:** Deixar o card "Seu Pedido" no carrinho do delivery mais claro e alinhado visualmente ao restante da tela.

15. **Card:** O container do resumo passou a usar `rounded-xl`, `shadow-lg` e `border border-stone-100` para dar profundidade sem poluir.

16. **Título:** O título "Seu Pedido" recebeu um bloco ao lado do ícone com `bg-amber-100` e ícone `text-amber-600` para destacar a seção.

17. **Itens e preços:** Nomes e quantidades em `text-stone-700`, preços em `text-stone-800`, e observações em `text-stone-500` para hierarquia de leitura.

18. **Linha do total:** A linha do total foi destacada com `bg-amber-50/80`, `border-t-2 border-amber-100` e `rounded-lg`, com o valor em `text-amber-700`.

19. **Botão Finalizar:** O botão "Finalizar Pedido" passou a usar gradiente `from-amber-500 to-amber-600`, `rounded-xl`, `shadow-md`, hover em tons mais escuros e `active:scale-[0.98]` para feedback ao toque.

20. **Benefício:** Carrinho mais legível e com destaque claro para o total e para a ação de finalizar o pedido.

---

## Código 4 — Modelo e persistência de despesas do dia (DailyFinance)

21. **Requisito:** Permitir que o motoboy registre despesas do dia (principalmente gasolina) e visualize lucro líquido e totais por período.

22. **Modelo:** Foi criado o tipo `DailyFinance` em `src/types/dailyFinance.ts`, com campos: `motoboyUserId`, `date` (YYYY-MM-DD), `grossProfit`, `fuelExpense`, `otherExpense`, `totalExpense`, `netProfit`, `note`, `createdAt`, `updatedAt`.

23. **Regras de negócio:** `totalExpense` é calculado como `fuelExpense + otherExpense` e `netProfit` como `grossProfit - totalExpense`; o lucro bruto do dia é obtido a partir das entregas (fees) no backend.

24. **Persistência:** Foi criado o serviço `dailyFinanceService` utilizando a coleção Firestore `motoboyDailyFinances`, com documento único por motoboy e data (id: `motoboyUserId_date`).

25. **Operações:** O serviço expõe `getDailyFinance`, `saveDailyFinance`, `listDailyFinances`, `getDaySummary` (resumo do dia para a tela principal) e `getTotalsForPeriod` (totais acumulados em um intervalo de datas).

26. **Atualização do lucro bruto:** Em cada salvamento, o `grossProfit` do dia é recalculado via `getMotoboyDayStats`, garantindo que o resumo financeiro use sempre o valor atual das entregas.

27. **Segurança:** Foram adicionadas regras em `firestore.rules` para as coleções `deliveryRequests` e `motoboyDailyFinances`, permitindo leitura e escrita conforme a política do projeto.

---

## Código 5 — Utilitários de moeda e data

28. **currencyUtils:** Criado em `src/utils/currencyUtils.ts` com funções para formatar valor em R$ (`formatCurrency`), converter string de input para número (`fromCurrencyField`, `parseCurrencyInput`), e formatar valor para exibição em campos (`toCurrencyField`), garantindo valores numéricos ≥ 0 e duas casas decimais.

29. **dateUtils:** Criado em `src/utils/dateUtils.ts` com `toDateString` (YYYY-MM-DD), `todayString`, `dayBounds` (início e fim do dia em ms), `periodToRange` para períodos 7d e 30d, e `dateRange` para listar datas entre início e fim, utilizados nos filtros e totais por período.

30. **Motivo:** Centralizar formatação de moeda e datas evita inconsistências e facilita validação e máscaras nos formulários do drawer de despesas.

---

## Código 6 — Estatísticas do motoboy por dia (deliveryRequestService)

31. **getMotoboyDayStats:** Função que recebe `motoboyUserId` e `dateStr` (YYYY-MM-DD) e retorna `deliveriesCount` (entregas concluídas naquele dia) e `grossProfit` (soma das fees das chamadas aceitas atribuídas àquele dia, usando `completedAt` ou `acceptedAt` como data de referência).

32. **getMotoboyDayStatsBatch:** Versão em lote que recebe uma lista de datas e, com uma única leitura de `getDeliveryRequestsByMotoboy` e de `getDeliveryOrdersByMotoboy`, devolve um mapa data → { deliveriesCount, grossProfit }, otimizando o cálculo de totais por período (7d, 30d, 1 ano).

33. **Uso:** Essas funções alimentam o resumo do dia na tela principal do motoboy e os totais exibidos no drawer (semana, mês, ano).

---

## Código 7 — Drawer “Despesas e totais” (MotoboyFinanceDrawer)

34. **Estrutura:** O componente é um painel (drawer) que abre pela direita, com overlay, contendo três blocos: Detalhes do dia, Resumo do dia e Totais (acumulados).

35. **Detalhes do dia:** Campos Gasolina (R$) obrigatório, Outras despesas (R$) e Observação (opcional), com botões Salvar, Limpar e indicação “Já existe lançamento hoje” quando há registro para a data atual; os valores são tratados com as funções de moeda e validação (≥ 0).

36. **Resumo do dia:** Exibição automática de Lucro bruto, Total de despesas e Lucro líquido; quando o lucro líquido é negativo, o valor é exibido em vermelho e é mostrada uma mensagem informativa.

37. **Totais:** Filtro por período (7 dias, 30 dias, 1 ano) e exibição dos totais acumulados (lucro bruto, despesas, lucro líquido) para o período selecionado, utilizando `getTotalsForPeriod` e dados em lote quando possível.

38. **Integração:** O drawer recebe `daySummary` da tela principal e chama `onSaved` após salvar, para que a tela principal atualize o resumo do dia sem recarregar.

39. **Paleta:** Cores do drawer (header, botões, focos, loaders) foram alinhadas à paleta violeta/índigo para consistência com a tela do motoboy.

---

## Código 8 — Tela principal do motoboy (MotoboyDashboard)

40. **Foco no dia:** A tela principal passou a exibir apenas o “Resumo do dia”: Entregas do dia, Lucro bruto do dia, Despesas do dia e Lucro líquido do dia; os totais acumulados (semana/mês/geral) foram removidos da tela principal e ficam apenas no drawer.

41. **Botão “Despesas e totais”:** Foi adicionado o botão que abre o drawer, com estilo em gradiente (roxo, índigo, ciano), borda em gradiente via span interno, hover com revelação do gradiente e `active:scale-90` para feedback visual.

42. **Dados do dia:** O resumo do dia é carregado via `getDaySummary(motoboyUserId)`, que combina estatísticas do dia (`getMotoboyDayStats`) e registro de despesas (`getDailyFinance`), exibindo entregas, lucro bruto, despesas e lucro líquido; o lucro líquido negativo é exibido em vermelho.

43. **Cores e identidade:** O header da página foi alterado para o mesmo gradiente do botão (roxo → índigo → ciano); o fundo da página para `slate-50`; cards, abas, botões e ícones passaram a usar bordas e acentos em violeta (violet-100, violet-500, violet-600, etc.) para harmonizar com o botão “Despesas e totais”.

44. **Drawer e modal:** O MotoboyFinanceDrawer é renderizado condicionalmente conforme o estado `drawerOpen`; o modal “Editar perfil” manteve a funcionalidade, com o botão Salvar em violeta para manter a coerência visual.

---

## Código 9 — Documentação e regras

45. **Documentação:** Foi criado o arquivo `docs/MOTOBOY_DESPESAS_E_TOTAIS.md` com descrição da funcionalidade de despesas do dia, estrutura de persistência, regras de negócio, instruções para rodar e testar e lista dos arquivos criados ou alterados.

46. **Firestore:** Em `firestore.rules` foram definidas regras de leitura e escrita para as coleções `deliveryRequests` e `motoboyDailyFinances`, necessárias para o painel do motoboy e para o registro de despesas.

---

## Resumo para o cliente

- **Meus Pedidos:** O cliente vê a mudança de status do pedido em tempo real, sem recarregar a página.  
- **Motoboy:** A taxa de aceitação e de recusa passa a ser calculada corretamente; o motoboy pode registrar despesas do dia (gasolina e outras), visualizar resumo do dia na tela principal e totais por período (7 dias, 30 dias, 1 ano) no drawer “Despesas e totais”.  
- **UI:** O carrinho do delivery e a tela do motoboy foram ajustados em cores e hierarquia visual, com destaque para o botão “Despesas e totais” em gradiente e toda a página do motoboy alinhada a essa identidade.

Este relatório descreve somente as alterações incluídas no commit desta entrega.
