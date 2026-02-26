# Relatório para o Cliente — Diversos Assuntos do Projeto

**Projeto:** Noctis (221 Gourmet)  
**Entrega:** Visão geral de funcionalidades — Meus pedidos, mesas e QR, cozinha, checkout e ambiente de desenvolvimento  
**Data:** Fevereiro de 2026  

Este documento descreve, em linguagem acessível, um conjunto de temas implementados no sistema: acompanhamento de pedidos pelo cliente, mesas com QR code, painel da cozinha, endereço no checkout e dicas de uso. O objetivo é que você tenha uma visão clara do que existe hoje e de como cada parte funciona.

---

## 1. Tela “Meus pedidos” e rota dedicada

Foi criada e ligada uma **rota** para o cliente acompanhar os pedidos de delivery: **/delivery/orders**. Ao acessar esse endereço (ou clicar no link no header da página de delivery), o cliente abre a tela “Meus pedidos”, onde informa o telefone e vê a lista de pedidos daquele número. Antes a tela existia no código mas não tinha rota; agora o acesso está disponível para todos.

---

## 2. Link “Meus pedidos” no header do delivery

Na página inicial do delivery (lista de restaurantes), há um **link “Meus pedidos”** no header, ao lado do login/usuário. Ele aparece para todos (logados ou não) e leva direto para a tela em que o cliente informa o telefone e visualiza os pedidos. Assim ninguém precisa decorar a URL para acompanhar o status.

---

## 3. Redirecionamento após finalizar o pedido no checkout

Depois que o cliente **finaliza um pedido** no checkout, ele é **redirecionado para “Meus pedidos”** em vez de voltar só para a lista de restaurantes. O sistema envia o telefone usado no pedido para já abrir a lista daquele número. A mensagem de sucesso continua aparecendo e, em seguida, a tela exibe os pedidos daquele telefone.

---

## 4. Busca de pedidos por telefone e ordem de exibição

Na tela “Meus pedidos”, o cliente **informa o número de telefone** (o mesmo usado no pedido). O sistema busca no Firestore todos os pedidos de delivery associados a esse telefone e exibe em ordem **do mais recente para o mais antigo**. Quem ainda não tiver pedido vê primeiro o formulário de busca; após buscar uma vez, o telefone fica em uso até trocar ou limpar.

---

## 5. Guardar telefone no navegador (localStorage)

O telefone usado na busca é **salvo no navegador** (localStorage). Na próxima vez que o cliente abrir “Meus pedidos” (pelo link do header ou pela URL), a tela pode **já carregar os pedidos** desse número, sem precisar digitar de novo. O cliente pode trocar de telefone a qualquer momento pelo botão “Trocar telefone” e fazer uma nova busca.

---

## 6. Status do pedido em português e timeline de progresso

Cada pedido aparece com um **status em português** e descrição curta: “Aguardando confirmação”, “Confirmado”, “Preparando”, “Saindo para entrega”, “Entregue” ou “Cancelado”. Em cada card há uma **linha de progresso** com as etapas (Pedido → Confirmado → Preparando → Saindo → Entregue), com a etapa atual destacada e as concluídas em verde, para o cliente ver de relance “quanto falta” até a entrega.

---

## 7. Filtros por status e cards expansíveis (“Ver mais” / “Ver menos”)

O cliente pode **filtrar a lista** por status (todos, aguardando, confirmados, preparando, saindo, entregues ou cancelados); cada opção mostra a quantidade de pedidos naquele status. Cada pedido é exibido em um **card** que, no modo recolhido, mostra número do pedido, restaurante, data, status, valor total, nome, endereço e forma de pagamento. Ao clicar em “Ver mais”, o card expande e mostra a lista de itens e o resumo (subtotal, taxa de entrega, total); “Ver menos” recolhe de novo.

---

## 8. Atualização automática da lista e botões “Atualizar” e “Trocar telefone”

Enquanto o cliente está em “Meus pedidos” com um telefone já carregado, a lista pode ser **atualizada automaticamente a cada 30 segundos** para refletir mudanças de status feitas pelo restaurante. Há um botão “Auto” para ligar ou desligar esse refresh e um botão “Atualizar” para atualizar na hora. No topo, quando já há pedidos carregados, aparecem o **telefone em uso** e o botão **“Trocar telefone”** para voltar ao formulário de busca com outro número.

---

## 9. Link do cardápio da mesa com identificador do restaurante (QR code)

O link do cardápio da mesa passou a incluir o **identificador do restaurante**, no formato **/:restaurantId/mesa/:numero**. Assim, quando o cliente escaneia o QR code da mesa, o sistema sabe de qual restaurante é aquele cardápio e exibe o menu correto, mesmo que o mesmo domínio atenda vários restaurantes. A função que monta o link usa o **restaurantId** e o número da mesa e a base configurada (**VITE_APP_URL** em produção ou a origem do navegador).

---

## 10. Redirecionamento do link antigo da mesa e variável VITE_APP_URL

Quem tiver o link antigo da mesa (por exemplo **/mesa/5**, sem o ID do restaurante) não verá mais o cardápio por essa URL; será **redirecionado para a página de delivery**, evitando abrir o cardápio de um restaurante errado. No README está documentado como configurar a variável **VITE_APP_URL** (por exemplo na Netlify): ela define a base da URL usada nos QR codes. Em produção, definir **VITE_APP_URL** garante que os QR codes impressos apontem sempre para o seu site.

---

## 11. Detalhes da mesa: pedidos e status (Na fila, Em preparo, Pronto)

No painel de configurações, ao clicar para **ver os detalhes de uma mesa**, abre-se um modal que carrega **apenas os pedidos daquela mesa** (pedidos de mesa, não delivery). Cada pedido aparece com **status legível**: “Na fila”, “Em preparo” ou “Pronto”, correspondentes aos status técnicos “novo”, “preparando” e “pronto”. Assim o dono ou a equipe vê só o que importa para aquela mesa.

---

## 12. Ações no modal da mesa (colocar em preparo, marcar pronto, voltar) e botão Atualizar

No modal de detalhes da mesa, a cozinha pode **alterar o status** do pedido: **Na fila** → “Colocar em preparo”; **Em preparo** → “Marcar pronto” ou “Voltar para na fila”; **Pronto** → orientação “Entregar à mesa” e opção “Voltar para em preparo”. Foi adicionado um **botão “Atualizar”** no topo do modal para recarregar os pedidos e as informações da sessão sem fechar e reabrir. As alterações são salvas e refletidas em tempo real para quem estiver na lista da cozinha ou no cardápio da mesa.

---

## 13. Separação entre “Ver detalhes da mesa” e “Ver QR Code” no editor de salão

Na tela onde você gerencia as mesas (áreas e lista de mesas), existem **dois botões distintos**: um para **ver detalhes da mesa** (pedidos, sessão, ações de status) e outro para **ver o QR code** (visualização e download). Assim fica claro qual ação cada ícone executa e evita confusão no dia a dia.

---

## 14. Seção “Seus pedidos” no cardápio da mesa e atualização automática

No cardápio que o cliente vê ao escanear o QR da mesa, foi adicionada a seção **“Seus pedidos”**, com os pedidos feitos **naquela mesa** e o status de cada um: “Na fila”, “Em preparo” ou “Pronto”. A lista é atualizada **automaticamente** em dois momentos: logo após o cliente enviar um novo pedido e **a cada 5 minutos** enquanto a página estiver aberta, para refletir o que a cozinha já marcou sem exigir atualização manual.

---

## 15. Pedidos de delivery em tempo real na cozinha (listener Firestore)

A tela da cozinha (Configurações > Cozinha) passou a usar **inscrição em tempo real** nos pedidos de delivery do restaurante (Firestore **onSnapshot**). Quando um novo pedido é criado ou o status é alterado, a lista na aba “Pedidos Delivery” é **atualizada na hora**, sem precisar clicar em “Atualizar”. Isso reduz atrasos e o risco de perder pedidos de vista.

---

## 16. Notificação visual (toast) e som ao receber novo pedido de delivery

Sempre que chegar um **novo** pedido de delivery (status “pendente”), aparece um **toast** (aviso no canto da tela) com mensagem do tipo “Novo pedido de delivery #…”. O toast some sozinho após alguns segundos e pode ser fechado manualmente. Foi implementado também um **som curto** (beep) quando chega um novo pedido; o som pode ser **ligado ou desligado** por restaurante nas configurações da Cozinha (checkbox “Som ao receber novo pedido”), e a preferência é salva no navegador (localStorage).

---

## 17. Badge no menu “Cozinha” e nas abas Pedidos Mesa e Pedidos Delivery

No menu lateral da tela de Configurações, ao lado do item **“Cozinha”**, aparece um **badge** com a quantidade de pedidos de delivery com status **“pendente”** (só quando há pelo menos um). Dentro da seção Cozinha, nas abas **“Pedidos Mesa”** e **“Pedidos Delivery”**, também há **badges** com a quantidade de itens que exigem ação (por exemplo pedidos de mesa “novos” e pedidos delivery “pendentes” ou “confirmados” ainda não em preparo). Valores acima de 99 são exibidos como “99+”.

---

## 18. Modal “Ver detalhes” do pedido de delivery e filtros na lista

Cada card de pedido de delivery na lista da Cozinha tem um botão **“Ver detalhes”**. Ao clicar, abre um **modal** com dados do cliente (nome, telefone, endereço), forma de pagamento, itens, subtotal, taxa de entrega e total, observações e motivo de cancelamento (se houver). No mesmo modal é possível **alterar o status** ou **cancelar/recusar** o pedido. Na aba “Pedidos Delivery”, a lista pode ser **filtrada por status** e há **busca** por nome do cliente, telefone ou endereço para encontrar um pedido específico.

---

## 19. Checkout com endereço estruturado (CEP, ViaCEP e “Usar endereço cadastrado”)

No checkout do delivery, o endereço de entrega deixou de ser um único campo de texto livre. Agora o cliente pode **usar o endereço cadastrado** em “Minha conta” (quando logado) ou **informar outro endereço** em formulário estruturado: CEP (com busca automática via **ViaCEP** ao sair do campo), rua, número, complemento, bairro, cidade e UF. Mensagens como “CEP não encontrado” ou “Buscando…” dão feedback. O botão “Confirmar pedido” só é habilitado com nome, telefone e endereço válido (perfil ou formulário completo). O pedido continua gravando o endereço em um único campo para compatibilidade.

---

## 20. Serviço de busca de pedidos por telefone e consistência com o checkout

Os pedidos de delivery são buscados no Firestore pela coleção **deliveries** usando o campo **customerPhone**. O serviço **getDeliveryOrdersByPhone** faz essa consulta, ordena por data de criação (mais recente primeiro) e devolve a lista para a tela “Meus pedidos”. O telefone informado no **checkout** é o mesmo usado para buscar; ao redirecionar para “Meus pedidos” com esse telefone no state, a lista já pode mostrar o pedido recém-criado assim que os dados forem carregados.

---

## 21. Servidor de desenvolvimento acessível na rede (testar QR no celular)

A configuração do Vite foi alterada para que o **servidor de desenvolvimento** e o **preview** do build escutem em **todas as interfaces** da máquina (**host: true**) nas portas 5173 e 4173. Assim você pode acessar o app a partir de **outro dispositivo na mesma rede** (por exemplo, celular) para testar QR codes e fluxos de mesa sem precisar publicar em produção.

---

*Documento gerado para comunicação com o cliente sobre diversos assuntos do projeto: Meus pedidos, mesas e QR, cozinha, checkout e ambiente de desenvolvimento.*
