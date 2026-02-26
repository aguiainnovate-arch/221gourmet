# Checklist QA – Responsividade Mobile (Delivery Menu)

Use este checklist ao testar em dispositivos reais, emuladores ou DevTools (larguras alvo: 320, 360, 375, 390, 412, 430px e tablet).

---

## Larguras e layout

- [ ] **320px** – Sem scroll horizontal; header (nome e endereço) truncado; chips rolam na horizontal; botões com ≥ 44px de altura.
- [ ] **360px e 375px** – Mesmos critérios; primeira dobra mostra header + barra de status + busca + pelo menos 1 chip e início dos cards.
- [ ] **390px, 412px, 430px** – Layout estável; preço e botão “Adicionar” não quebram; rodapé/sidebar não cobre conteúdo.

## Safe-area (iOS / Android)

- [ ] **iOS (notch/Dynamic Island)** – Top bar e conteúdo respeitam a área segura; nada fica atrás do notch.
- [ ] **iOS (home indicator)** – Rodapé/carrinho não fica colado no home indicator; há `padding-bottom` com safe-area.
- [ ] **Android** – Barra de navegação/gestos não cobrem o rodapé; conteúdo visível até o fim da área útil.

## Teclado e inputs

- [ ] **Campo de busca** – Ao focar, o campo permanece visível (não fica atrás do teclado).
- [ ] **Modal de checkout** – Ao abrir teclado em nome/telefone/endereço, o conteúdo do modal rola e o campo focado continua visível.

## Rolagem e conteúdo

- [ ] **Lista de produtos** – Rolagem suave; último item não fica escondido atrás de barra fixa.
- [ ] **Chips** – Rolagem horizontal suave (touch); usuário percebe que há mais categorias.
- [ ] **Textos longos** – Nome do restaurante, endereço, categorias e produtos truncam ou quebram em 2 linhas sem estourar.

## Acessibilidade e toque

- [ ] **Área de toque** – Botões e chips com área mínima de 44×44px (medir no DevTools ou no dispositivo).
- [ ] **Fonte grande** – Aumentar tamanho da fonte do sistema (ex.: 200%); sem overflow e botões ainda utilizáveis.
- [ ] **Contraste** – Texto e botões com contraste adequado (WCAG AA) em todos os breakpoints.

## Estados e edge cases

- [ ] **Lista vazia** – Mensagem “Carrinho vazio” exibida corretamente.
- [ ] **Produto sem imagem** – Placeholder “Sem imagem” não quebra o layout do card.
- [ ] **Tablet (768px+)** – Sidebar “Seu Pedido” visível; layout se adapta à largura (sem rodapé fixo duplicado, se aplicável).
- [ ] **Paisagem** – Conteúdo utilizável; rodapé/sidebar adequados à altura reduzida.

---

**Referência:** plano completo em [PLANO_RESPONSIVIDADE_MOBILE.md](./PLANO_RESPONSIVIDADE_MOBILE.md).
