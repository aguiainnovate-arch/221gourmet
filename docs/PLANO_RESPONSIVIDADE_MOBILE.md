# Plano de responsividade mobile – Delivery Menu (221gourmet)

**Stack:** React + Vite + TypeScript + Tailwind CSS + Capacitor (iOS/Android)  
**Breakpoints alvo:** 320px, 360px, 375px, 390px, 412px, 430px + tablets  
**Objetivo:** Layout limpo, botões acessíveis com uma mão, sem overflow nem quebras indesejadas em textos longos.

---

## 1. Problemas encontrados (com base no print e no código)

### Header / topbar (nome “Casa do chef”, rating, endereço)
- **Overflow/truncamento:** Nome e endereço longos podem estourar ou quebrar mal em telas estreitas (ex.: 320px).
- **Alinhamento:** Bloco de texto ao lado do logo pode ficar comprimido; rating e endereço em linha podem quebrar de forma estranha.
- **Safe-area:** Top bar não considera `safe-area-inset-top` (notch/Dynamic Island no iOS).

### Chips / filtros (“Todas as Categorias”, “Pizza”)
- **Largura:** Várias categorias não cabem em uma linha; sem rolagem horizontal explícita e visível o usuário pode achar que não há mais opções.
- **Touch target:** Chips podem ficar pequenas em 320px; mínimo recomendado 44px de altura.

### Cards de produto (imagem, título, descrição, preço, botão “Adicionar”)
- **Botão:** “+ Adicionar” pode ser espremido ou quebrar linha em larguras muito pequenas; área de toque pode ficar &lt; 44px.
- **Preço:** “R$” e “50.00” em linhas separadas podem desalinhar ou ocupar espaço demais.
- **Grid:** Em telas maiores o layout continua lista única; não há transição para grid (2 colunas) quando fizer sentido.
- **Estado sem imagem:** Placeholder “Sem imagem” está ok, mas pode quebrar layout se a célula da imagem tiver altura fixa em todos os casos.

### Seção “Seu Pedido” (rodapé fixo no print)
- **Sobreposição:** Rodapé fixo pode cobrir o último conteúdo rolado se não houver `padding-bottom` suficiente no conteúdo.
- **iOS:** Sem `padding-bottom: env(safe-area-inset-bottom)` o rodapé fica colado no home indicator ou na barra do Safari.
- **Desktop vs mobile:** No código atual o carrinho é sidebar em `lg` e no fluxo em mobile; se o desejado for rodapé fixo em mobile, é preciso componente específico + espaço reservado.

### Espaçamentos verticais e scroll
- **Telas pequenas:** Muito padding/margin pode deixar a primeira dobra “apertada” e exigir scroll excessivo para ver produtos.
- **Telas grandes/tablets:** Conteúdo em coluna única pode parecer vazio nas laterais; falta estratégia para uso da largura (grid, max-width, etc.).

### Outros
- **Teclado:** Campo de busca e inputs no modal de checkout podem ser cobertos quando o teclado virtual abre (sem scroll/ajuste de viewport).
- **Barra do navegador (Safari):** Barra inferior do browser aparece abaixo do rodapé do app; sem safe-area o rodapé pode conflitar com ela.

---

## 2. Quick wins (lista curta)

1. **Viewport e safe-area:** Adicionar `viewport-fit=cover` no `<meta name="viewport">` e usar `env(safe-area-inset-*)` no topo e no rodapé.
2. **Header – textos longos:** Aplicar `truncate` (ou `line-clamp-1` / `line-clamp-2`) no nome do restaurante e no endereço com `min-w-0` no flex container.
3. **Chips:** Garantir `overflow-x-auto` + `-webkit-overflow-scrolling: touch` + `scrollbar-hide` (ou scrollbar fina); altura mínima 44px nos botões.
4. **Card – botão Adicionar:** `min-h-[44px]` e `min-w-[44px]` (ou equivalente), e `flex-shrink-0` para não espremer; preço em uma linha com `whitespace-nowrap` ou formato único “R$ 50,00”.
5. **Padding inferior da página:** `pb-[calc(5rem+env(safe-area-inset-bottom))]` (ou classe equivalente) no container principal quando houver rodapé fixo.
6. **Rodapé “Seu Pedido”:** Se for fixo em mobile, usar `padding-bottom: env(safe-area-inset-bottom)` e `bottom: 0` com safe-area.
7. **Contêiner fluido:** Trocar larguras fixas por `max-w-*` + `w-full` + `px-4` (ou variável de spacing) para evitar overflow horizontal.

---

## 3. Melhorias estruturais (com detalhes)

### 3.1 Layout geral
- **Mobile-first:** Base em 320px; depois 360, 375, 390, 412, 430 e tablet (768px+).
- **Conteúdo principal:** Sempre `min-w-0` em flex children que podem encolher (evita overflow por flex item não encolher).
- **Rodapé fixo em mobile:** Implementar barra “Seu Pedido” fixa apenas em viewports &lt; lg; em lg+ manter sidebar sticky. Reservar espaço no conteúdo com `padding-bottom` igual à altura da barra + safe-area.

### 3.2 Header
- Logo fixo (ex.: 64–80px); bloco de texto com `flex-1 min-w-0`.
- Nome: `truncate` ou `line-clamp-1`; opcional `line-clamp-2` se o design permitir duas linhas.
- Rating e endereço: em linha com `flex-wrap` ou em coluna em telas muito estreitas; endereço com `truncate` ou `line-clamp-1`.
- Top bar (Voltar, idioma): respeitar `padding-top: env(safe-area-inset-top)`.

### 3.3 Chips
- Container: `flex overflow-x-auto gap-2 pb-2` (sem `flex-wrap`); `scroll-snap-type: x mandatory` opcional para snap.
- Cada chip: `flex-shrink-0`, `min-h-[44px]`, `px-4`, `rounded-full`; texto com `whitespace-nowrap` e truncate se necessário (fallback para nomes longos).

### 3.4 Cards de produto
- Container do card: `flex` com `gap-3` ou `gap-4`; imagem com largura fixa (ex.: 80–96px) e `flex-shrink-0`.
- Bloco central: `flex-1 min-w-0` (título e descrição com `line-clamp`).
- Preço: uma única linha, ex. “R$ 50,00” com `whitespace-nowrap` ou quebra controlada.
- Botão “Adicionar” (e grupo +/-): `flex-shrink-0`, `min-h-[44px]`, toque mínimo 44px; em 320px pode ser só ícone “+” com aria-label.
- Em viewports maiores (ex.: sm ou md): considerar grid 2 colunas para cards; manter imagem + texto + botão dentro de cada card sem estourar.

### 3.5 Rodapé “Seu Pedido”
- Fixo: `fixed bottom-0 left-0 right-0`; `padding-bottom: env(safe-area-inset-bottom)`; `z-index` adequado.
- Conteúdo da página: `padding-bottom` = altura do rodapé + `env(safe-area-inset-bottom)`.
- Em lg: esconder rodapé fixo e mostrar sidebar “Seu Pedido” no grid.

### 3.6 Teclado aberto
- Em inputs (busca, checkout): usar `scroll-margin-bottom` no campo focado ou scroll into view no foco; evitar `position: fixed` que ignore teclado.
- Modal de checkout: `max-h-[90vh]` ou `dvh` e `overflow-y-auto` para o conteúdo poder rolar quando o teclado abrir.

---

## 4. Regras por componente (bullet points)

### Header (logo + nome + rating + endereço)
- Logo: tamanho fixo (ex.: `w-16 h-16` ou `w-20 h-20`), `flex-shrink-0`.
- Container do texto: `flex-1 min-w-0`.
- Nome: `font-bold`, `truncate` ou `line-clamp-1`; tamanho com `clamp(1.125rem, 4vw, 1.5rem)` se quiser fluido.
- Rating e endereço: `text-sm`, endereço com `truncate` ou `line-clamp-1`; ícones com tamanho fixo.
- Top bar: `pt-[env(safe-area-inset-top)]` (ou `pt-safe` se configurado no Tailwind).

### Barra de status (“Aberto”, “Pedido mínimo”, “Ver mais”)
- Container: `flex flex-wrap items-center justify-between gap-2`; em 320px pode quebrar em 2 linhas.
- “Pedido mínimo”: `truncate` ou quebra em telas muito estreitas.
- “Ver mais”: `flex-shrink-0` para não sumir.

### Seletor “Entrega / Hoje”
- Dois blocos lado a lado com `flex-1 min-w-0`; texto interno com `truncate` se necessário.
- Altura mínima de toque 44px na área clicável.

### Campo de busca
- Largura `100%`; `min-height: 44px`; padding horizontal consistente; ícone posicionado com espaço para não sobrepor texto.
- Foco: garantir que o campo não fique atrás do teclado (scroll into view ou layout que suba).

### Chips de categoria (rolagem horizontal)
- Container: `flex overflow-x-auto gap-2 pb-2 -mx-4 px-4` (ou margem negativa para “sangrar” até a borda); `scrollbar-hide` ou scrollbar fina.
- Chip: `flex-shrink-0 whitespace-nowrap min-h-[44px] px-4 py-2 rounded-full`.
- Texto longo: `max-w-[180px] truncate` por chip se precisar limite.

### Card de produto (imagem, título, descrição, preço, botão)
- **Texto longo:** Título `line-clamp-1` ou `line-clamp-2`; descrição `line-clamp-2`; `min-w-0` no bloco de texto.
- **Grid vs lista:** Lista em mobile (&lt; 640px); a partir de `sm` ou `md` pode ser `grid grid-cols-2 gap-4` (avaliar quantidade de informação por card).
- **Sem imagem:** Placeholder com mesma altura/largura da imagem (ex.: `aspect-square`) para não colapsar.
- **Carregando:** Skeleton com mesmo layout (imagem + linhas + botão).
- **Lista vazia:** Mensagem centralizada com padding; manter altura mínima para não “pular” o layout.

### “Seu Pedido” (rodapé fixo ou no fluxo)
- **Mobile:** Rodapé fixo com `env(safe-area-inset-bottom)`; conteúdo com `pb-[altura_rodape+env(safe-area-inset-bottom)]`.
- **Desktop (lg+):** Sidebar sticky no grid; não mostrar rodapé fixo.
- Botão “Finalizar” e toques: mínimo 44px de altura.

---

## 5. Layout rules (design system leve)

### Espaçamentos (exemplo)
- Base: **4px** (1), **8px** (2), **12px** (3), **16px** (4), **24px** (6), **32px** (8).
- Entre seções: 16–24px em mobile; 24–32px em tablet.
- Padding horizontal da tela: 16px (px-4) em mobile; 24px em tablet.

### Tipografia
- Escala sugerida: 12px (xs), 14px (sm), 16px (base), 18px (lg), 20px (xl), 24px (2xl).
- Line-height: títulos 1.2–1.25; corpo 1.4–1.5.
- Fluido: `clamp(0.875rem, 2vw + 0.5rem, 1rem)` para corpo; títulos com clamp similar.

### Tamanhos mínimos
- Botões e chips: **44px** de altura (ou área de toque 44×44px).
- Ícones clicáveis: área de toque mínima 44px mesmo que o ícone seja 24px.

### Densidade
- **Compacto (320–360px):** padding e gap um pouco menores; título 1 linha; botão pode ser só “+” com label em tooltip/aria.
- **Confortável (375px+):** padding padrão; até 2 linhas no título se couber.

---

## 6. Breakpoints recomendados e porquê

| Breakpoint      | Largura   | Uso |
|-----------------|-----------|-----|
| (default)       | &lt; 360px | Base mobile estreito (ex.: iPhone SE). |
| `xs`            | 360px     | Mobile comum (adicionado em `tailwind.config.js`). |
| `mobile-sm`     | 375px     | iPhone padrão. |
| `mobile-md`     | 390px     | iPhone Pro. |
| `mobile-lg`     | 412px     | Android médio / iPhone Plus. |
| `mobile-xl`     | 430px     | iPhone Pro Max. |
| `md` (padrão TW)| 768px     | Tablet portrait; sidebar do carrinho. |

**Porquê:** Cobrem os dispositivos alvo; 768px (Tailwind `md`) separa “uma coluna + rodapé fixo” de “duas colunas + sidebar”.  
Os breakpoints `xs` e `mobile-*` foram adicionados em `theme.extend.screens` para não sobrescrever os padrões do Tailwind (`sm`, `md`, `lg`, etc.).

---

## 7. Snippets de código (Tailwind + CSS)

### 7.1 Viewport e safe-area (index.html + CSS global)

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

```css
/* Safe area utilities - adicionar em index.css ou no Tailwind */
@supports (padding: env(safe-area-inset-top)) {
  .pt-safe { padding-top: env(safe-area-inset-top); }
  .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
  .pl-safe { padding-left: env(safe-area-inset-left); }
  .pr-safe { padding-right: env(safe-area-inset-right); }
  .safe-bottom { padding-bottom: env(safe-area-inset-bottom); }
}
```

### 7.2 Contêiner fluido e padding

```jsx
<div className="w-full max-w-7xl mx-auto px-4 min-[430px]:px-5 md:px-6 min-w-0">
  {/* conteúdo */}
</div>
```

### 7.3 Tipografia e spacing com clamp (CSS)

```css
:root {
  --text-title: clamp(1.125rem, 4vw + 0.5rem, 1.5rem);
  --text-body: clamp(0.875rem, 2vw + 0.5rem, 1rem);
  --space-section: clamp(0.75rem, 3vw, 1.5rem);
}
```

### 7.4 Chips com overflow-x e scroll suave

```jsx
<div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide overflow-y-hidden"
     style={{ WebkitOverflowScrolling: 'touch' }}>
  {categories.map(cat => (
    <button
      key={cat.id}
      className="flex-shrink-0 min-h-[44px] px-4 py-2 rounded-full font-medium whitespace-nowrap ..."
    >
      {cat.name}
    </button>
  ))}
</div>
```

### 7.5 Card que não estoura (flex + min-w-0)

```jsx
<div className="flex gap-3 p-4 min-w-0">
  <div className="w-20 h-20 flex-shrink-0 rounded-lg bg-gray-200 overflow-hidden">...</div>
  <div className="flex-1 min-w-0">
    <h3 className="font-bold truncate line-clamp-1">...</h3>
    <p className="text-sm text-gray-600 line-clamp-2">...</p>
    <p className="text-lg font-bold text-amber-600 whitespace-nowrap">R$ {price}</p>
  </div>
  <div className="flex-shrink-0 flex items-center">
    <button className="min-h-[44px] min-w-[44px] px-4 py-2 rounded-lg ...">+ Adicionar</button>
  </div>
</div>
```

### 7.6 Rodapé fixo com safe-area

```jsx
<footer className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-30 pb-[env(safe-area-inset-bottom)]">
  <div className="flex items-center justify-between px-4 py-3">
    ...
  </div>
</footer>

/* Container da página */
<main className="pb-24 pb-[calc(6rem+env(safe-area-inset-bottom))]">
```

---

## 8. Checklist de testes (QA responsivo)

1. [ ] **320px:** Sem scroll horizontal; header (nome e endereço) truncados sem quebrar layout; chips rolam horizontalmente; botões com pelo menos 44px de altura.
2. [ ] **360px e 375px:** Mesmos critérios; primeira dobra mostra header + barra de status + busca + pelo menos 1 chip e início dos cards.
3. [ ] **390px, 412px, 430px:** Layout continua estável; preço e botão “Adicionar” não quebram; rodapé fixo (se existir) não cobre conteúdo.
4. [ ] **Safe-area iOS:** Em dispositivo ou simulador com notch/Dynamic Island, top bar e rodapé respeitam as insets (conteúdo não fica atrás do notch nem do home indicator).
5. [ ] **Safe-area Android:** Barra de navegação não cobre o rodapé; conteúdo não fica atrás da barra de gestos.
6. [ ] **Teclado:** Ao focar busca ou inputs do checkout, campo permanece visível (scroll automático ou layout que sobe); modal de checkout rola quando necessário.
7. [ ] **Rolagem:** Lista de produtos rola suavemente; chips rolam na horizontal; rodapé fixo não “pula” durante o scroll.
8. [ ] **Textos longos:** Nome do restaurante, endereço, nome de categoria e nome/descrição de produto longos truncam ou quebram em 2 linhas sem estourar.
9. [ ] **Touch targets:** Todos os botões e chips têm área de toque ≥ 44×44px (medir no DevTools ou em dispositivo).
10. [ ] **Tablet (768px+):** Sidebar “Seu Pedido” visível; grid de 2 colunas (se implementado) para cards; sem rodapé fixo duplicado.
11. [ ] **Orientação paisagem:** Conteúdo utilizável; rodapé ou sidebar adequados à altura reduzida.
12. [ ] **Modo acessibilidade:** Aumentar tamanho da fonte do sistema (ex.: 200%) e verificar que não há overflow e que botões continuam acessíveis.
13. [ ] **Lista vazia / sem imagem:** Estado “Carrinho vazio” e produto “Sem imagem” não quebram layout.
14. [ ] **Contraste:** Texto e botões atendem contraste mínimo (WCAG AA) em todos os breakpoints.
15. [ ] **Navegador in-app (Safari/Chrome):** Barra de endereço e barra inferior do browser não sobrepõem conteúdo crítico; safe-area ajuda onde aplicável.

---

## Resumo

- **Problemas:** Header/endereço longos, chips sem rolagem clara, botões/preço em cards, rodapé fixo sem safe-area e risco de sobreposição, pouco uso de largura em tablets.
- **Quick wins:** Viewport + safe-area, truncate no header, chips com scroll e 44px, botão e preço estáveis no card, padding-bottom com safe-area no rodapé.
- **Estrutura:** Mobile-first, min-w-0 em flex, rodapé fixo só em mobile, sidebar em lg+.
- **Código:** Usar os snippets acima (viewport, utilities safe-area, container, chips, card, rodapé) e estender o Tailwind com breakpoints customizados se quiser `xs`, `md`, etc. nos tamanhos alvo.
- **QA:** Os 15 itens do checklist cobrem larguras, safe-area, teclado, toque, textos longos, tablet e acessibilidade.

Se quiser, o próximo passo é aplicar esses trechos diretamente em `DeliveryMenu.tsx` e em `index.css`/`tailwind.config.js` do seu repositório.
