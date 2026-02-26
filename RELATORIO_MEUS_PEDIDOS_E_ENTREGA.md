# 21 trechos explicativos — Meus pedidos e melhorias (não commitadas)

**Projeto:** 221Gourmet  
**Foco:** Tela “Meus pedidos” para o cliente acompanhar status do delivery + integração no fluxo  
**Estilo:** Explicação do desenvolvedor para o cliente  

---

## 1. Nova tela “Meus pedidos” acessível por rota

Foi criada e ligada uma **rota dedicada** para o cliente ver os pedidos de delivery: `/delivery/orders`. Antes a tela existia no código mas não tinha rota no app, então o cliente não conseguia acessá-la. Agora, ao acessar esse endereço (ou clicar no link que colocamos no header), o cliente cai direto na tela “Meus pedidos”.

---

## 2. Link “Meus pedidos” no header da página de delivery

Na página inicial do delivery (lista de restaurantes), colocamos um **link “Meus pedidos”** no header, ao lado do login/usuário. Ele aparece para todo mundo (logado ou não) e leva para a tela onde o cliente informa o telefone e vê os pedidos. Assim o cliente pode acompanhar o status a qualquer momento, sem precisar decorar URL.

---

## 3. Redirecionamento após finalizar o pedido

Depois que o cliente **finaliza um pedido** no checkout, em vez de voltar só para a lista de restaurantes, ele é **redirecionado para “Meus pedidos”**. O sistema envia junto o telefone que ele usou no pedido, para já abrir a lista daquele número. A mensagem “Pedido realizado com sucesso!” continua aparecendo; em seguida a tela já mostra os pedidos daquele telefone.

---

## 4. Busca por telefone na tela Meus pedidos

Na tela “Meus pedidos”, o cliente **informa o número de telefone** (o mesmo usado no pedido). O sistema busca no Firestore todos os pedidos de delivery associados a esse telefone e exibe em ordem do mais recente para o mais antigo. Quem não tiver pedido ainda vê primeiro o formulário de busca; depois de buscar uma vez, o telefone fica guardado até ele trocar ou limpar.

---

## 5. Guardar telefone no navegador (localStorage)

O telefone usado na busca é **salvo no navegador** (localStorage). Na próxima vez que o cliente abrir “Meus pedidos” (pelo link do header ou pela URL), a tela pode já carregar os pedidos desse número, sem precisar digitar de novo. Ele pode trocar de telefone a qualquer momento pelo botão “Trocar telefone” e fazer uma nova busca.

---

## 6. Uso do telefone vindo do checkout

Quando o cliente vem para “Meus pedidos” **depois de finalizar um pedido**, o sistema recebe o telefone pela navegação (state). Esse número é usado para pré-preencher a busca e carregar os pedidos na hora; se for a primeira vez, o número também é salvo no localStorage para as próximas visitas.

---

## 7. Status do pedido com rótulos claros

Cada pedido aparece com um **status em português** e uma descrição curta: “Aguardando confirmação”, “Confirmado”, “Preparando”, “Saindo para entrega”, “Entregue” ou “Cancelado”. Cada um tem uma cor e um ícone (relógio, check, pacote, caminhão etc.) para o cliente entender de relance em que etapa está o pedido.

---

## 8. Timeline visual de progresso (etapas)

Em cada card de pedido há uma **linha de progresso** com as etapas: Pedido → Confirmado → Preparando → Saindo → Entregue. A etapa atual fica destacada (vermelho) e as já concluídas em verde. Uma barra preenche até a etapa atual, dando uma noção visual de “quanto falta” até a entrega.

---

## 9. Filtros por status na lista

O cliente pode **filtrar a lista** por status: todos, aguardando, confirmados, preparando, saindo, entregues ou cancelados. Cada opção mostra a quantidade de pedidos naquele status. Assim fica fácil ver só os pedidos “em andamento” ou só os já entregues.

---

## 10. Cards expansíveis com “Ver mais” / “Ver menos”

Cada pedido é exibido em um **card**. No modo recolhido já aparecem: número do pedido, restaurante, data, status, valor total, nome, endereço e forma de pagamento. Ao clicar em “Ver mais”, o card expande e mostra a **lista de itens** (nome, quantidade, observações, preço) e o **resumo** (subtotal, taxa de entrega, total). “Ver menos” recolhe de novo.

---

## 11. Resumo financeiro nos detalhes do pedido

Na parte expandida do card, o cliente vê o **resumo financeiro**: subtotal dos itens, taxa de entrega e total. Os valores seguem o que foi enviado no pedido e ajudam a conferir o que foi cobrado.

---

## 12. Atualização automática da lista (auto-refresh)

Enquanto o cliente está na tela “Meus pedidos” com um telefone já carregado, a lista pode ser **atualizada automaticamente a cada 30 segundos** para refletir mudanças de status feitas pelo restaurante. Há um botão “Auto” no header para ligar ou desligar esse refresh, e um botão “Atualizar” para atualizar na hora quando quiser.

---

## 13. Botão “Atualizar” e “Trocar telefone”

No topo da tela, quando já há pedidos carregados, o cliente vê o **telefone em uso** e dois controles: **“Atualizar”** (recarrega os pedidos daquele telefone) e **“Trocar telefone”** (limpa o telefone e volta ao formulário de busca para digitar outro número).

---

## 14. Voltar para a lista de restaurantes

Há um **botão de voltar** (seta) no header da “Meus pedidos” que leva o cliente de volta para a página inicial do delivery (lista de restaurantes). Em telas vazias (nenhum pedido encontrado) também existe um botão “Fazer novo pedido” que faz o mesmo caminho.

---

## 15. Serviço de busca de pedidos por telefone

No backend (Firestore), os pedidos de delivery são buscados pela coleção `deliveries` usando o campo **customerPhone**. O serviço `getDeliveryOrdersByPhone` faz essa consulta, ordena por data de criação (mais recente primeiro) e devolve a lista para a tela “Meus pedidos” exibir e filtrar.

---

## 16. Consistência de dados entre checkout e Meus pedidos

O telefone informado no **checkout** é o mesmo usado para buscar em “Meus pedidos”. O pedido é gravado em `deliveries` com `customerPhone`; ao redirecionar para “Meus pedidos” com esse telefone no state, a lista já mostra o pedido recém-criado assim que os dados forem carregados.

---

## 17. Layout responsivo e acessível

A tela “Meus pedidos” foi pensada para **celular e desktop**: header fixo, filtros que podem ser expandidos/recolhidos, cards em coluna no mobile e em grid em telas maiores. Ícones e cores ajudam a identificar rapidamente o status sem depender só de texto.

---

## 18. Estados vazios e mensagens claras

Quando não há telefone informado, a tela mostra o **formulário de busca**. Quando o cliente busca e **não há pedidos** para aquele telefone, aparece uma mensagem explicando e o botão “Fazer novo pedido”. Se houver pedidos mas **nenhum no filtro** escolhido (ex.: só “Entregues”), a mensagem indica “Nenhum pedido neste status”.

---

## 19. Integração com o fluxo de delivery existente

A tela “Meus pedidos” usa o mesmo **DeliveryAuthProvider** e as mesmas rotas de delivery (`/delivery`, `/delivery/orders`, `/delivery/:restaurantId`). Não exige login para ver pedidos: basta o telefone. Quem está logado no delivery continua vendo “Meus pedidos” no header e pode ser redirecionado para lá após o checkout.

---

## 20. Rota registrada no App

A rota **`/delivery/orders`** foi registrada no `App.tsx` e o componente **Orders** foi importado e renderizado nessa rota, dentro do `DeliveryAuthProvider`. Assim, qualquer link ou redirecionamento para `/delivery/orders` abre corretamente a tela “Meus pedidos”.

---

## 21. Resumo do que o cliente passa a ter

Em resumo, o cliente agora: **(1)** acessa “Meus pedidos” pelo link no header do delivery ou pela URL; **(2)** informa o telefone (ou já chega com o telefone pré-preenchido após o checkout); **(3)** vê a lista de pedidos com status, timeline de progresso e filtros; **(4)** expande os cards para ver itens e resumo; **(5)** pode atualizar a lista manualmente ou deixar o auto-refresh ligado. Tudo isso foi implementado com base nas alterações ainda não commitadas, com foco na tela de Meus pedidos e na integração com o fluxo de pedido de delivery.

---

*Documento gerado para comunicação com o cliente sobre as alterações não commitadas, com ênfase na tela “Meus pedidos”.*
