# Relatório para o Cliente — Mesas, Cozinha e Pedidos Delivery

**Projeto:** 221Gourmet  
**Entrega:** Melhorias em mesas (QR codes e detalhes), painel da cozinha com notificações e painel de pedidos delivery em tempo real  
**Data:** Fevereiro de 2026  

Este documento descreve, em linguagem acessível, todas as alterações feitas nesta entrega, para que você saiba exatamente o que foi implementado e como isso impacta o dia a dia do restaurante.

---

## 1. Objetivo geral da entrega

Esta entrega concentra-se em três frentes: **(a)** garantir que os QR codes das mesas abram sempre o cardápio do seu restaurante, mesmo com vários restaurantes no mesmo sistema; **(b)** dar à cozinha visibilidade imediata de pedidos pendentes (mesa e delivery) e notificação de novos pedidos delivery; e **(c)** permitir que o cliente na mesa acompanhe o status do próprio pedido no cardápio. Tudo foi implementado e está registrado em um único commit no repositório.

---

## 2. Nova forma do link do cardápio da mesa (URL com identificador do restaurante)

Antes, o link do cardápio da mesa era algo como `/mesa/5` (só o número da mesa). Agora ele passou a incluir o identificador do seu restaurante, no formato `/:restaurantId/mesa/5`. Assim, quando o cliente escaneia o QR code da mesa, o sistema sabe de qual restaurante é aquele cardápio e exibe o menu correto, mesmo que o mesmo domínio atenda vários restaurantes.

---

## 3. Redirecionamento para quem ainda usa o link antigo

Quem tiver guardado ou impresso o link antigo (por exemplo `/mesa/5`) não verá mais o cardápio por essa URL; em vez disso, será redirecionado para a página de delivery. Isso evita que um link genérico abra o cardápio de um restaurante errado. Os novos QR codes já saem com o link novo (com o ID do restaurante).

---

## 4. Configuração da URL de produção para os QR codes (README e variável de ambiente)

Foi documentado no README do projeto como configurar a variável `VITE_APP_URL` (por exemplo na Netlify). Ela define qual é a “base” da URL usada nos QR codes. Se não for definida, o sistema usa a URL de onde o app está aberto no momento da geração do QR. Definir `VITE_APP_URL` em produção garante que os QR codes impressos apontem sempre para o seu site (ex.: `https://seu-site.netlify.app`), e não para um endereço de desenvolvimento ou outro ambiente.

---

## 5. Geração da URL da mesa no sistema (restaurantId + número da mesa)

A função que monta o link do cardápio da mesa passou a receber dois dados: o **ID do restaurante** e o **número da mesa**. Ela usa a base configurada (`VITE_APP_URL` ou a origem atual do navegador) e monta o path no formato `/:restaurantId/mesa/:numero`. Todas as telas que geram ou exibem esse link (por exemplo, na Configurações, ao visualizar ou baixar o QR code) foram ajustadas para usar o restaurante logado e o número da mesa.

---

## 6. Manutenção do restaurante na URL ao trocar de mesa

Quando o cliente está no cardápio de uma mesa e, por algum motivo, a sessão indica outra mesa (e o sistema redireciona para manter a mesa correta), o redirecionamento agora preserva o identificador do restaurante na URL. Assim, o usuário continua no contexto do mesmo restaurante e não “pula” para outro.

---

## 7. Detalhes da mesa: carregamento dos pedidos daquela mesa

No painel de configurações, ao clicar para ver os detalhes de uma mesa (antes apenas “ver QR code”), abre-se um modal com as informações da mesa. Esse modal agora carrega **apenas os pedidos daquela mesa** (pedidos de mesa, não delivery), usando primeiro uma busca otimizada por mesa e, se necessário, um fallback que busca os pedidos do restaurante e filtra por mesa. Assim, o dono ou a equipe vê só o que importa para aquela mesa.

---

## 8. Detalhes da mesa: exibição do status de cada pedido (Na fila, Em preparo, Pronto)

Dentro do modal de detalhes da mesa, cada pedido aparece com um **status legível**: “Na fila”, “Em preparo” ou “Pronto”. Esses rótulos correspondem aos status técnicos “novo”, “preparando” e “pronto” e deixam claro em que etapa está cada pedido da mesa.

---

## 9. Detalhes da mesa: ações para a cozinha (colocar em preparo, marcar pronto, voltar)

No mesmo modal, a cozinha pode **alterar o status** do pedido sem sair da tela:  
- **Na fila** → botão “Colocar em preparo”.  
- **Em preparo** → “Marcar pronto” ou “Voltar para na fila”.  
- **Pronto** → orientação “Entregar à mesa” e opção “Voltar para em preparo” se precisar corrigir.  
As alterações são salvas no sistema e refletidas em tempo real para quem estiver vendo a lista de pedidos da cozinha ou o cardápio da mesa.

---

## 10. Botão “Atualizar” no modal de detalhes da mesa

Foi adicionado um botão “Atualizar” no topo do modal de detalhes da mesa. Ao clicar, os pedidos e as informações da sessão da mesa são recarregados. Isso é útil quando outra pessoa confirmou um pedido ou mudou o status e você quer ver a lista atualizada sem fechar e reabrir o modal.

---

## 11. Separação entre “Ver detalhes da mesa” e “Ver QR Code” no editor de salão

Na tela onde você gerencia as mesas (áreas e lista de mesas), havia um botão que misturava “ver detalhes” com “ver QR code”. Agora existem **dois botões distintos**: um para **ver detalhes da mesa** (pedidos, sessão, ações de status) e outro para **ver o QR code** (visualização e download). Assim fica claro qual ação cada ícone executa e evita confusão na operação do dia a dia.

---

## 12. Menu (cardápio da mesa): sincronização com o restaurante ao abrir pelo QR

Quando o cliente abre o cardápio pelo QR code da mesa, a URL já traz o identificador do restaurante. O sistema passa esse identificador para o contexto de pedidos (OrderContext), garantindo que o pedido enviado seja associado ao restaurante correto e que a lista de pedidos da cozinha mostre os dados certos. Isso é a base para multi-restaurante e para os “Seus pedidos” no cardápio.

---

## 13. Seção “Seus pedidos” no cardápio da mesa

No cardápio que o cliente vê ao escanear o QR da mesa, foi adicionada uma seção **“Seus pedidos”**. Nela aparecem os pedidos feitos **naquela mesa** (não de outras mesas nem de delivery), com o status de cada um: “Na fila”, “Em preparo” ou “Pronto”. O cliente consegue acompanhar sem precisar perguntar ao garçom.

---

## 14. Atualização automática de “Seus pedidos” (a cada 5 minutos e ao enviar pedido)

A lista “Seus pedidos” é atualizada **automaticamente** em dois momentos: logo após o cliente enviar um novo pedido (para aparecer na hora) e a cada **5 minutos** enquanto a página estiver aberta. Assim o status tende a refletir o que a cozinha já marcou (em preparo / pronto) sem exigir que o cliente atualize a página manualmente.

---

## 15. Pedidos de delivery em tempo real na cozinha (listener Firestore)

A tela da cozinha (Configurações > Cozinha) passou a usar uma **inscrição em tempo real** nos pedidos de delivery do seu restaurante (Firestore `onSnapshot`). Quando um novo pedido é criado ou o status é alterado, a lista na aba “Pedidos Delivery” é atualizada na hora, sem precisar clicar em “Atualizar”. Isso reduz atrasos e o risco de perder pedidos de vista.

---

## 16. Notificação visual (toast) ao chegar novo pedido de delivery

Sempre que chegar um **novo** pedido de delivery (status “pendente”), aparece um **toast** (aviso no canto da tela) com uma mensagem do tipo “Novo pedido de delivery #…”. O toast some sozinho após alguns segundos e pode ser fechado manualmente. Assim a equipe é alertada mesmo que esteja em outra aba ou seção da tela.

---

## 17. Som opcional ao receber novo pedido de delivery

Foi implementado um **som curto** (beep) quando chega um novo pedido de delivery. O som usa a Web Audio API (sem arquivo de áudio externo) e pode ser **ligado ou desligado** por restaurante nas configurações da Cozinha (checkbox “Som ao receber novo pedido”). A preferência é salva no navegador (localStorage) para aquele restaurante.

---

## 18. Badge no menu lateral “Cozinha” com quantidade de pedidos delivery pendentes

No menu lateral da tela de Configurações, ao lado do item **“Cozinha”**, aparece um **badge** (número) com a quantidade de pedidos de delivery com status **“pendente”** (aguardando confirmação). Só é exibido quando há pelo menos um. Assim o dono ou a equipe vê de relance quantos pedidos delivery ainda precisam de atenção, mesmo antes de abrir a seção Cozinha.

---

## 19. Badge nas abas “Pedidos Mesa” e “Pedidos Delivery” dentro da Cozinha

Dentro da seção Cozinha existem duas abas: **“Pedidos Mesa”** e **“Pedidos Delivery”**. Em cada uma foi adicionado um **badge** com a quantidade de itens que exigem ação:  
- **Pedidos Mesa:** quantidade de pedidos de mesa com status **“novo”** (ainda não colocados em preparo).  
- **Pedidos Delivery:** quantidade de pedidos com status **“pending”** (não confirmados) ou **“confirmed”** (confirmados mas preparo não iniciado).  
Os badges usam o mesmo estilo visual (cor âmbar) e só aparecem quando o número é maior que zero. Valores acima de 99 são exibidos como “99+”.

---

## 20. Polling de segurança (fallback) na aba Pedidos Delivery

Além do listener em tempo real, foi configurado um **polling a cada 30 segundos** quando a aba “Pedidos Delivery” está aberta. Se por algum motivo a conexão em tempo real falhar ou atrasar, essa atualização periódica ajuda a trazer pedidos novos e a manter o contador e o som de notificação consistentes.

---

## 21. Filtro por status e busca na lista de Pedidos Delivery

Na aba “Pedidos Delivery” da Cozinha, a lista pode ser **filtrada por status** (todos, pendente, confirmado, em preparo, etc.) e há um campo de **busca** por nome do cliente, telefone ou endereço. Isso facilita encontrar um pedido específico quando há muitos itens na lista.

---

## 22. Modal “Ver detalhes” do pedido de delivery

Cada card de pedido de delivery na lista ganhou um botão **“Ver detalhes”**. Ao clicar, abre um **modal** com: dados do cliente (nome, telefone, endereço), forma de pagamento, itens do pedido, subtotal, taxa de entrega e total, observações e, se houver, motivo de cancelamento. No mesmo modal é possível **alterar o status** (confirmar, colocar em preparo, etc.) ou **cancelar/recusar** o pedido, sem precisar sair da tela.

---

## 23. Ajustes de layout nos cards de pedidos delivery (responsividade)

Os cards da lista de Pedidos Delivery foram ajustados para **quebrar texto** onde necessário (nomes longos, endereços, observações) e evitar que o layout quebre em telas menores. O grid da lista usa tamanhos mínimos e flexíveis para que os cards se reorganizem bem em diferentes larguras de tela (desktop, tablet e celular).

---

## 24. Servidor de desenvolvimento acessível na rede (Vite)

A configuração do Vite (ferramenta de build do projeto) foi alterada para que o **servidor de desenvolvimento** e o **preview** do build escutem em todas as interfaces da máquina (`host: true`) nas portas 5173 e 4173. Assim você pode acessar o app a partir de outro dispositivo na mesma rede (por exemplo, celular) para testar QR codes e fluxos de mesa sem precisar publicar em produção.

---

## Resumo para o cliente

- **QR codes e mesas:** Os links das mesas passam a incluir o ID do restaurante; os QR codes gerados usam essa URL e a variável `VITE_APP_URL` em produção. Quem usar link antigo é redirecionado.  
- **Cozinha:** Pedidos de mesa e delivery com indicadores claros (badges) de quantos pedidos estão pendentes; notificação em tempo real de novos pedidos delivery (toast + som opcional); filtros e busca na lista de delivery; modal de detalhes com ações.  
- **Cliente na mesa:** Seção “Seus pedidos” no cardápio com status (Na fila, Em preparo, Pronto), atualizada automaticamente.  
- **Detalhes da mesa:** Modal com pedidos da mesa, status e ações (colocar em preparo, marcar pronto, voltar), além do botão “Atualizar” e da separação entre “Ver detalhes” e “Ver QR Code” no editor de salão.  

Todas as mudanças descritas acima estão registradas em um único commit no repositório, com título e descrição detalhada. **Nenhum push foi realizado**; o commit permanece apenas local, conforme solicitado.
