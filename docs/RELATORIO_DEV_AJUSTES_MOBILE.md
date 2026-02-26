# Relatório de Desenvolvimento – Ajustes Mobile

**Projeto:** 221gourmet (Noctis Delivery)  
**Escopo:** Melhorias de responsividade e experiência em dispositivos móveis  
**Data:** Fevereiro 2025  

---

## Resumo executivo

Foi realizada uma rodada de ajustes focada na parte mobile do projeto, com o objetivo de garantir layout estável em diferentes larguras de tela, uso correto de safe-area (notch, home indicator), evitar cortes de interface e manter botões e áreas de toque acessíveis. Este relatório descreve **21 tópicos** implementados ou documentados.

---

## 1. Viewport e suporte a safe-area (iOS/Android)

- Inclusão de `viewport-fit=cover` no `<meta name="viewport">` do `index.html`.
- Permite que o app use a tela inteira e que o CSS utilize `env(safe-area-inset-*)` para respeitar notch, Dynamic Island e barras do sistema.

## 2. Utilitários CSS de safe-area

- Criação das classes `.pt-safe`, `.pb-safe`, `.pl-safe`, `.pr-safe` e `.safe-bottom` em `src/index.css`.
- Uso de `@supports` para aplicar padding apenas quando `env(safe-area-inset-*)` é suportado, evitando quebra em navegadores antigos.

## 3. Breakpoints mobile no Tailwind

- Inclusão em `theme.extend.screens` dos breakpoints: `xs` (360px), `mobile-sm` (375px), `mobile-md` (390px), `mobile-lg` (412px), `mobile-xl` (430px).
- Mantidos os breakpoints padrão do Tailwind (`sm`, `md`, `lg`, etc.) para compatibilidade com o restante do projeto.

## 4. Plano de responsividade documentado

- Criação do documento `docs/PLANO_RESPONSIVIDADE_MOBILE.md` com diagnóstico visual, quick wins, melhorias estruturais, regras por componente, design system leve e exemplos de código.

## 5. Checklist de QA responsivo

- Criação de `docs/CHECKLIST_QA_RESPONSIVO.md` com 15 itens para validação em diferentes larguras, safe-area, teclado, rolagem, toque e acessibilidade.

## 6. Header da página Delivery Menu (cardápio)

- Nome do restaurante e endereço com `truncate` e `min-w-0` no container de texto para evitar overflow em nomes/endereços longos.
- Logo com tamanho responsivo (`w-16 h-16` em mobile, `w-20 h-20` em telas maiores) e atributo `title` para leitura do texto completo quando truncado.

## 7. Top bar e safe-area no Delivery Menu

- Barra superior (Voltar, idioma) passou a usar `padding-top: env(safe-area-inset-top)` para não ficar atrás do notch/Dynamic Island em iOS.

## 8. Barra de status do restaurante (Aberto, Pedido mínimo, Ver mais)

- Uso de `flex-wrap`, `truncate` e `flex-shrink-0` onde necessário para evitar quebra indesejada ou corte do botão “Ver mais” em telas estreitas.
- Botão “Ver mais” com altura mínima de toque de 44px.

## 9. Searchbar na página Delivery Menu

- Container da busca com `w-full`, padding horizontal via `max(1rem, env(safe-area-inset-left/right))` e `min-w-0` no wrapper.
- Input com `max-w-full`, `min-w-0` e `box-border` para não estourar horizontalmente.

## 10. Searchbar na página Delivery (lista de restaurantes)

- Remoção de `overflow-hidden` e de restrição de largura fixa no container; seção passou a usar `w-full` com padding em safe-area.
- Ajustes em `index.css` para a classe `.delivery-searchbar`: input com `width: 100%` (em vez de 380px fixos), camadas decorativas com `max-width: 100%`, e `#poda`/`#main` com `width: 100%` e `min-width: 0` para layout fluido no mobile.

## 11. Chips de categoria (Delivery Menu)

- Container com rolagem horizontal (`overflow-x-auto`), `-webkit-overflow-scrolling: touch`, `scrollbar-hide` e margem negativa + padding para “sangrar” até as bordas da tela.
- Cada chip com `flex-shrink-0`, `min-h-[44px]`, `max-w-[180px] truncate` e `title` para nomes longos.

## 12. Cards de produto (Delivery Menu)

- Bloco de texto com `flex-1 min-w-0`; título com `line-clamp-2`; preço com `whitespace-nowrap` para manter em uma linha.
- Imagem com tamanho responsivo e `aspect-square` no placeholder “Sem imagem” para não colapsar o layout.

## 13. Botões de quantidade e “Adicionar” (Delivery Menu)

- Botões de +/- e “Adicionar” com `min-h-[44px]` e `min-w-[44px]` (ou equivalente) para atender à área de toque mínima recomendada (44px).
- Inclusão de `aria-label` nos botões de quantidade e no “Adicionar” para acessibilidade.

## 14. Padding inferior e safe-area no conteúdo (Delivery Menu)

- Container principal com `pb-[calc(6rem+env(safe-area-inset-bottom))]` para reservar espaço para um eventual rodapé fixo e para o home indicator do iOS, evitando conteúdo coberto na parte inferior.

## 15. Design tokens responsivos (opcional)

- Variáveis CSS em `:root`: `--text-title`, `--text-body` e `--space-section` com `clamp()` para tipografia e espaçamento fluidos, disponíveis para uso no projeto.

## 16. Regras por componente documentadas

- No plano de responsividade: regras para Header, barra de status, seletor Entrega/Hoje, campo de busca, chips, card de produto e seção “Seu Pedido”, incluindo truncamento, grid vs. lista e estados (sem imagem, carregando, vazio).

## 17. Regras de layout (design system leve)

- Documentação de espaçamentos sugeridos (8/12/16/24px), escala de tipografia, tamanho mínimo de toque (44px) e densidade (compacto vs. confortável) para manter consistência nas telas mobile.

## 18. Tratamento de ícone de filtro na searchbar Delivery

- Com a searchbar em largura total no mobile, o ícone de filtro à direita deixa de ser cortado; posicionamento absoluto dentro de `#main` (agora com largura fluida) mantido para alinhamento correto.

## 19. Fonte e altura do input da searchbar Delivery

- Input da `.delivery-searchbar` com `font-size: clamp(...)` para escalar entre mobile e desktop e `min-height: 44px` para área de toque adequada.

## 20. Header do Delivery Menu sem overflow

- Wrapper do header com `w-full min-w-0 overflow-visible` para que a searchbar e demais elementos não sejam cortados por um container pai com overflow oculto.

## 21. Entrega de documentação e checklist

- Entrega do plano de responsividade, do checklist de QA e deste relatório em `docs/`, permitindo que a empresa valide os ajustes em dispositivos reais e emuladores (320px a 430px e tablet) e siga as regras em futuras implementações mobile.

---

## Arquivos alterados ou criados

| Arquivo | Tipo de alteração |
|---------|-------------------|
| `index.html` | Meta viewport com `viewport-fit=cover` |
| `tailwind.config.js` | Breakpoints mobile em `theme.extend.screens` |
| `src/index.css` | Safe-area utilities, tokens responsivos, `.delivery-searchbar` responsiva |
| `src/pages/DeliveryMenu.tsx` | Header, chips, cards, searchbar, safe-area, padding inferior |
| `src/pages/Delivery.tsx` | Container e wrapper da searchbar (largura total + safe-area) |
| `docs/PLANO_RESPONSIVIDADE_MOBILE.md` | Novo – plano completo de responsividade |
| `docs/CHECKLIST_QA_RESPONSIVO.md` | Novo – checklist de testes |
| `docs/RELATORIO_DEV_AJUSTES_MOBILE.md` | Novo – este relatório |

---

## Recomendações para próximos passos

1. Rodar o checklist de QA em dispositivos reais (iOS e Android) e em larguras 320px, 375px, 390px e 430px.
2. Considerar implementar o rodapé fixo “Seu Pedido” na página do cardápio em viewports &lt; lg, já que o padding inferior foi preparado para isso.
3. Reutilizar as regras do plano de responsividade e do design system leve em novas telas ou refatorações mobile.

---

*Relatório gerado para documentação interna dos ajustes mobile do projeto 221gourmet.*
