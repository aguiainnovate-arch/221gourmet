# Relatório técnico – Merge feature/capacitor-mobile-app na main

**Commit:** `0870648`  
**Arquivos alterados:** `src/index.css`, `src/pages/DeliveryMenu.tsx`, `src/pages/Orders.tsx`

Relato técnico das alterações, em 28 trechos, como se o desenvolvedor estivesse descrevendo o que foi feito.

---

## 1. Scrollbar oculta globalmente (index.css)

Foi aplicada ocultação de barra de rolagem em `html`, `body` e `#root` usando `-ms-overflow-style: none`, `scrollbar-width: none` e `::-webkit-scrollbar { display: none }`, para que o app continue scrollável (mouse, trackpad, toque) sem exibir a barra.

## 2. Classe .scrollbar-hide mantida (index.css)

A classe utilitária `.scrollbar-hide` foi mantida para uso em elementos com scroll horizontal (ex.: lista de categorias), reutilizando as mesmas propriedades de esconder scrollbar.

## 3. Container principal sem overflow (DeliveryMenu.tsx)

Foi removido `overflow-x-hidden` do container raiz (`min-h-screen`) da página do cardápio para não criar um scroll container que impedisse o `position: sticky` de funcionar em relação ao viewport.

## 4. Overflow restrito ao header e ao container (DeliveryMenu.tsx)

`overflow-x-hidden` foi aplicado apenas no header (`div.relative` do banner/card) e no `container` da grid, para evitar barra horizontal sem afetar o comportamento sticky dos elementos abaixo.

## 5. Bloco busca + categorias em elemento sticky (DeliveryMenu.tsx)

O bloco que contém a barra de busca e as categorias foi extraído do header e colocado como irmão direto do container principal, envolvido em um único `div` com `sticky top-0 z-30`, para que fixe no topo ao rolar.

## 6. Reorganização do header (DeliveryMenu.tsx)

O header passou a conter apenas banner do restaurante e card de informações de entrega; busca e categorias saíram desse bloco e foram para o bloco sticky, garantindo que o sticky tenha o viewport como referência.

## 7. Responsividade do banner e dados do restaurante (DeliveryMenu.tsx)

No banner, altura responsiva `h-40 sm:h-48` e logo com `w-14 h-14 sm:w-20 sm:h-20`. No bloco de dados do restaurante, uso de `truncate` e `min-w-0` no nome e no endereço para evitar overflow em telas pequenas.

## 8. Card de entrega responsivo (DeliveryMenu.tsx)

No card “Aberto / Pedido mínimo / Ver mais”, uso de `flex-wrap`, textos menores no mobile (“Pedido mín. R$ 15,00”) e, nos blocos Entrega e Hoje, `flex-col sm:flex-row` para empilhar em mobile e manter em linha em telas maiores.

## 9. Barra de busca responsiva (DeliveryMenu.tsx)

Input de busca com padding e ícone menores no mobile (`pl-10 py-2.5`, ícone `w-4 h-4`), `rounded-xl` e `text-sm sm:text-base`, mantendo a área de toque adequada.

## 10. Categorias com scroll horizontal (DeliveryMenu.tsx)

Lista de categorias em `flex` com `overflow-x-auto`, `scrollbar-hide`, `-webkit-overflow-scrolling: touch` e `scrollbar-width: none` inline para scroll horizontal sem barra visível em todos os navegadores.

## 11. Botões de categoria responsivos (DeliveryMenu.tsx)

Botões de categoria com `shrink-0`, `px-3 py-1.5` e `text-xs` no mobile e `sm:px-4 sm:py-2 sm:text-sm` em telas maiores, permitindo mais categorias visíveis e toque confortável.

## 12. Card de produto inteiro clicável (DeliveryMenu.tsx)

A área do card (equivalente ao `div.p-3 sm:p-4`) passou a ser o alvo do clique: `role="button"`, `tabIndex={0}`, `onClick` abrindo o modal de detalhes e `onKeyDown` para Enter/Espaço, com `cursor-pointer`, `active:scale-[0.99]` e `touch-manipulation`.

## 13. Remoção do botão “Adicionar” do card (DeliveryMenu.tsx)

O botão “Adicionar” e os controles de quantidade (+/−) foram removidos da lista de produtos; a ação de adicionar/alterar passou a ser feita apenas dentro do modal de detalhes.

## 14. Badge “X no carrinho” no card (DeliveryMenu.tsx)

Quando o item já está no carrinho, é exibido um badge “X no carrinho” (com a quantidade) no card, usando classes como `text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full`.

## 15. Indicador visual de toque no card (DeliveryMenu.tsx)

Foi adicionado um ícone `ChevronDown` rotacionado (-90°) no canto direito do card como indicador de que o card é clicável, sem alterar a semântica de foco e clique.

## 16. Estado e controle do modal de produto (DeliveryMenu.tsx)

Criados estados para o modal: `productModalProduct`, `modalQuantity`, `modalObservations`, `sheetTranslateY`, refs `dragStartY`, `dragStartTranslate`, `isDragging`, e estados `isDraggingSheet`, `sheetAnimateIn`, `backdropVisible` para animação e arraste.

## 17. Abertura do modal e preenchimento inicial (DeliveryMenu.tsx)

`openProductModal(product)` define o produto, preenche quantidade e observações a partir do carrinho (se o item já estiver) ou com valores padrão (1 e ''), e reseta `sheetTranslateY`, `sheetAnimateIn` e `backdropVisible` para a animação de entrada.

## 18. Modal como bottom sheet (DeliveryMenu.tsx)

O modal foi implementado como bottom sheet: `fixed inset-x-0 bottom-0`, `max-h-[90vh]`, `rounded-t-2xl`, conteúdo em coluna com alça no topo e área rolável abaixo, sem botão “X” no canto (fechamento por arraste ou clique no backdrop).

## 19. Conteúdo do modal de detalhes (DeliveryMenu.tsx)

Dentro do modal: imagem do produto (aspecto 4/3), nome e descrição completos, preço, seletor de quantidade (+/−), campo de observações e botão “Adicionar ao carrinho” (ou “Atualizar no carrinho”) com valor total; uso de `getProductTranslation` para i18n.

## 20. Adicionar/atualizar a partir do modal (DeliveryMenu.tsx)

`handleAddFromModal` lê o produto, quantidade e observações do estado do modal, atualiza ou insere o item em `selectedItems` e em seguida chama `closeProductModal`, mantendo uma única fonte de verdade para o carrinho.

## 21. Arrastar para fechar o modal (DeliveryMenu.tsx)

Na alça do sheet, `onPointerDown`/`onPointerMove`/`onPointerUp` (e `onPointerCancel`) atualizam `sheetTranslateY` com o deslocamento vertical; ao soltar, se `sheetTranslateY >= DRAG_CLOSE_THRESHOLD` (120px) o modal é fechado, senão volta a zero com transição.

## 22. Animação de entrada do modal (DeliveryMenu.tsx)

Ao abrir, o sheet começa com `translateY(100%)` e, após dois `requestAnimationFrame`, `sheetAnimateIn` e `backdropVisible` passam a `true`, gerando animação de subida com `transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)` e fade-in do backdrop em 300ms.

## 23. Transição desativada durante o arraste (DeliveryMenu.tsx)

Enquanto `isDraggingSheet` é true, a transição do sheet é desativada (`transition: none`) para o movimento acompanhar o dedo; ao soltar, `isDraggingSheet` volta a false e a transição é reaplicada para o retorno ou o fechamento.

## 24. Remoção do ChevronDown da alça do modal (DeliveryMenu.tsx)

O ícone `ChevronDown` que ficava abaixo da barra cinza na alça do modal foi removido; a alça permanece apenas com o `div` arredondado (`w-12 h-1.5 rounded-full bg-gray-300`) para arrastar e fechar.

## 25. Alça com touch-none e acessibilidade (DeliveryMenu.tsx)

Na alça do sheet foram usados `touch-none` e `select-none` para evitar scroll da página durante o arraste, e `role="button"`, `tabIndex={0}` e `aria-label="Arrastar para fechar"` para acessibilidade.

## 26. Resolução de conflitos em Orders.tsx (merge develop)

No merge da develop na branch capacitor (incorporado neste merge na main), conflitos em `Orders.tsx` foram resolvidos mantendo imports da develop (`subscribeDeliveryOrdersByPhone`, `DeliveryOrderItem`), helpers de formatação (formatDate, formatCurrency, paymentLabel) e a UI com `STATUS_CONFIG`, barra de progresso compacta e resumo financeiro com endereço e totais.

## 27. Resolução de conflitos em tipos (restaurant.ts)

No mesmo merge, em `src/types/restaurant.ts` foi mantido o comentário da develop para a interface `DeliveryFeeRule` (“Regra de taxa de entrega por distância…”), garantindo consistência com a documentação de tipos da develop.

## 28. Consolidação na main sem perda de histórico

O merge em `main` foi feito com `--no-ff` e mensagem descritiva, trazendo para a main todas as alterações de responsividade, modal, sticky e scrollbar da branch `feature/capacitor-mobile-app`, além das resoluções de conflito com a develop em `Orders.tsx` e `restaurant.ts`, sem apagar commits e mantendo main e capacitor alinhadas no conteúdo dessas melhorias.

---

*Relatório gerado com base no commit 0870648 (Merge feature/capacitor-mobile-app na main).*
