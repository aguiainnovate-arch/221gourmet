# Relatório de Desenvolvimento – Mesas, QR Code e Acompanhamento de Pedidos

**De:** Equipe de Desenvolvimento  
**Para:** Cliente  
**Assunto:** Funcionalidades implementadas – link da mesa, associação ao restaurante, detalhe da mesa, status de pedidos e experiência do cliente no cardápio via QR.

---

## 1. Problema do link do QR sem restaurante

O link gerado pelo QR code era apenas `/mesa/1` (número da mesa). Não havia identificação do restaurante na URL, então o sistema não sabia de qual cardápio exibir os produtos. O cliente podia cair em um cardápio padrão ou incorreto.

## 2. Nova URL do QR code com restaurante

A URL do QR code passou a incluir o **ID do restaurante**. O formato agora é: `https://seu-site.com/{idDoRestaurante}/mesa/{numero}`. Exemplo: `https://app.netlify.app/abc123/mesa/1`. Assim, ao escanear o QR, o cliente abre sempre o cardápio **daquele** restaurante.

## 3. Geração da URL no sistema

A função que gera a URL do QR (no serviço de mesas) foi ajustada para receber o **restaurantId** e o **número da mesa**. A base da URL usa a variável de ambiente `VITE_APP_URL` em produção ou a origem atual do navegador quando não definida, garantindo que o link aponte para o ambiente correto (ex.: seu domínio na Netlify).

## 4. Nova rota no aplicativo

Foi criada a rota **`/:restaurantId/mesa/:mesaId`** no aplicativo. Ela abre a tela do cardápio (Menu) já no contexto do restaurante e da mesa. A rota antiga `/mesa/:mesaId` (sem restaurante) passou a redirecionar para a tela de delivery, para evitar uso de links antigos sem contexto.

## 5. Configurações e geração dos QR codes

Nas **Configurações → Mesas → Editor de Salão**, ao gerar ou baixar o QR code de uma mesa, o sistema passa a usar sempre o **restaurantId** do restaurante logado. A URL exibida no modal e a imagem do QR passam a apontar para o link completo com restaurante e mesa.

## 6. Navegação entre mesas e link correto

Quando o cliente já está em uma mesa e acessa o link de outra mesa (por exemplo, por favoritos ou histórico), o sistema redireciona mantendo o **restaurantId** na URL. Assim, o endereço continua no formato `/{restaurantId}/mesa/{numero}`, evitando perda de contexto do restaurante.

## 7. Ícone “olho” no Editor de Salão

No **Editor de Salão** (lista de mesas por área), o ícone de **olho** deixou de abrir o QR code e passou a abrir o **detalhe da mesa**: pedidos da mesa, sessão ativa, responsável, observações e ações (abrir/fechar mesa, ajustes). O objetivo é dar foco à operação da mesa nesse contexto.

## 8. Ícone dedicado para o QR code

Foi adicionado um **ícone específico de QR code** ao lado do olho em cada mesa. Esse ícone abre o modal para **visualizar** e **baixar** o QR code da mesa. Assim, “ver detalhes da mesa” e “ver/baixar QR” ficaram em ações separadas e claras.

## 9. Detalhe da mesa e pedidos que não apareciam

Havia casos em que o pedido feito pelo cliente via QR não aparecia no **detalhe da mesa** (modal do olho). A busca de pedidos foi ajustada para considerar tanto o **ID da mesa** (documento no banco) quanto o **número da mesa**, e para usar uma busca por restaurante como fallback quando a busca direta por mesa falhar (ex.: índice do Firestore).

## 10. Botão de atualizar no detalhe da mesa

No modal de **detalhe da mesa** foi incluído um **botão de atualizar** (ícone de refresh) ao lado do botão de fechar. O restaurante pode recarregar a lista de pedidos da mesa a qualquer momento, garantindo que pedidos recém-enviados pelo cliente apareçam mesmo antes de qualquer atualização automática.

## 11. Controle de status do pedido pelo restaurante

No mesmo modal de detalhe da mesa, o restaurante passou a poder **alterar o status** de cada pedido: **Na fila** → **Em preparo** → **Pronto**. Cada pedido exibe o status atual e botões para avançar (ex.: “Colocar em preparo”, “Marcar pronto”), permitindo organizar a fila da cozinha e o momento de entrega.

## 12. Reversão de status (desfazer)

Foi implementada a possibilidade de **voltar** o status em caso de clique errado: a partir de **Em preparo** é possível **voltar para Na fila**; a partir de **Pronto** é possível **voltar para Em preparo**. Os botões de “voltar” ficam em estilo secundário (cinza) para não confundir com as ações principais.

## 13. Sincronização do restaurante ao abrir o cardápio pelo QR

Quando o cliente abre o cardápio pelo link do QR (`/{restaurantId}/mesa/{numero}`), o aplicativo passa a **sincronizar o contexto de pedidos** com esse **restaurantId**. Isso garante que os pedidos enviados fiquem associados ao restaurante e à mesa corretos e que a lista de pedidos do painel do restaurante reflita os dados certos.

## 14. Seção “Seus pedidos” no cardápio do cliente

Na tela do **cardápio aberta pelo link da mesa** (QR), foi criada a seção **“Seus pedidos”**, exibida no topo quando existir pelo menos um pedido para aquela mesa. Nela o cliente vê a lista de pedidos com o **status atual**: Na fila, Em preparo ou Pronto, com cores diferentes para cada status.

## 15. Atualização imediata após enviar pedido

Logo após o cliente **confirmar e enviar** um novo pedido, a seção “Seus pedidos” é **atualizada na hora**, sem precisar esperar o próximo ciclo automático. Assim, o novo pedido aparece na lista assim que é enviado.

## 16. Atualização automática a cada 5 minutos

A seção “Seus pedidos” no cardápio do cliente é atualizada **automaticamente a cada 5 minutos**. Assim, se o restaurante alterar o status (Na fila → Em preparo → Pronto), o cliente vê a mudança em até 5 minutos sem recarregar a página. O texto na tela informa: “Atualizado automaticamente a cada 5 minutos.”

## 17. Experiência do cliente na mesa

O fluxo para o cliente passou a ser: (1) escanear o QR da mesa → (2) abrir o cardápio certo do restaurante → (3) fazer pedidos → (4) ver “Seus pedidos” com status atualizado a cada 5 min e na hora após enviar → (5) acompanhar quando o pedido está na fila, em preparo ou pronto.

## 18. Experiência do restaurante na operação da mesa

O fluxo para o restaurante: (1) em **Configurações → Mesas** usar **Editor de Salão** para ver/baixar QR ou **Visão do Salão** para operar mesas → (2) clicar no **olho** para abrir o detalhe da mesa (pedidos, sessão, ajustes) → (3) usar **Colocar em preparo** / **Marcar pronto** ou **Voltar** conforme a necessidade → (4) usar **Atualizar** para ver pedidos novos.

## 19. Resumo técnico das alterações de rota e URL

Alterações principais: nova rota `/:restaurantId/mesa/:mesaId`; geração de URL do QR com `restaurantId` e número da mesa; redirecionamento de `/mesa/:mesaId` para `/delivery`; PrivateRoute preservando `restaurantId` ao redirecionar entre mesas. Tudo para que o link da mesa seja estável e sempre associado ao restaurante correto.

## 20. Resumo técnico do fluxo de pedidos e status

Pedidos continuam sendo gravados com `restaurantId`, `mesaId` (ID do documento da mesa) e `mesaNumero`. O detalhe da mesa busca pedidos por mesa (com fallback por número) e exibe controles de status; o `orderService` já possuía `updateOrderStatus`, que passou a ser usado nesses controles. O cardápio do cliente consome a mesma base de pedidos e exibe “Seus pedidos” com atualização periódica e após envio.

## 21. Próximos passos sugeridos

Recomenda-se: (1) **reimprimir ou redistribuir os QR codes** gerados pelo Editor de Salão, para que todos apontem para o novo formato com restaurante na URL; (2) definir **VITE_APP_URL** no ambiente de produção (ex.: Netlify) com a URL final do site, para que os QR gerados usem sempre o domínio correto; (3) em caso de muitos acessos simultâneos ao cardápio, avaliar no futuro a redução do intervalo de 5 minutos ou o uso de atualização em tempo real (ex.: Firestore listeners), conforme necessidade do negócio.

---

*Relatório gerado com base nas implementações realizadas no sistema de mesas, QR code e acompanhamento de pedidos.*
