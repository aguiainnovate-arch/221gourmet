# Principais cores da página Delivery (`/delivery`)

Referência das cores e das tags/classes CSS usadas na rota **Delivery** (lista de restaurantes próximos).

---

## 1. Fundo principal (background)

| Cor       | Hex       | Onde aparece              | Tag CSS / Classe |
|-----------|-----------|---------------------------|-------------------|
| Azul escuro | `#050A1A` | Fundo da página, gradiente | `bg-noctis-background`, `--noctis-background`, `from-[#050A1A]` |
| Azul médio escuro | `#0B1630` | Meio do gradiente, superfícies (cards) | `bg-noctis-surface`, `--noctis-surface`, `via-[#0B1630]`, `bg-[#0B1630]` |
| Azul noite | `#0A2A5E` | Final do gradiente, hover de botões | `to-[#0A2A5E]`, `hover:bg-[#0A2A5E]` |

**Exemplo no código:**  
`style={{ background: 'linear-gradient(180deg, #050A1A 0%, #0B1630 50%, #0A2A5E 100%)' }}`  
`className="bg-noctis-background"`  
`className="bg-noctis-surface rounded-2xl ..."`

---

## 2. Texto

| Cor        | Hex       | Uso                         | Tag CSS / Classe |
|------------|-----------|-----------------------------|-------------------|
| Branco / texto principal | `#EAF2FF` | Títulos, nomes, texto forte | `text-noctis-textPrimary`, `--noctis-text-primary`, `text-[#EAF2FF]` |
| Cinza azulado | `#A9B8D6` | Texto secundário (endereço, telefone, tempo) | `text-noctis-textSecondary`, `--noctis-text-secondary` |

**Exemplo:**  
`className="text-noctis-textPrimary"`  
`className="text-noctis-textSecondary text-sm"`

---

## 3. Azul primário (destaque / interativo)

| Cor     | Hex       | Uso                                      | Tag CSS / Classe |
|---------|-----------|------------------------------------------|-------------------|
| Azul primário | `#2F7BFF` | Botão "Todos", borda do logo no carrossel, tags "Entrega rápida" | `bg-noctis-primary`, `ring-[#2F7BFF]`, `--noctis-primary` |
| Azul brilho   | `#7CCBFF` | Texto de destaque, glow                   | `text-noctis-primaryGlow`, `bg-noctis-primaryGlow`, `--noctis-primary-glow` |

**Exemplo:**  
`className="bg-noctis-primary text-white"` (categoria ativa)  
`className="ring-4 ring-[#2F7BFF]"` (logo no carrossel)  
`className="bg-noctis-primary/20 text-noctis-primaryGlow"` (tag "Entrega rápida")

---

## 4. Accent (ciano)

| Cor  | Hex       | Uso              | Tag CSS / Classe |
|------|-----------|------------------|-------------------|
| Ciano | `#00D4FF` | Estrelas, tag "10% OFF" | `text-noctis-accent`, `fill-noctis-accent`, `bg-noctis-accent/20 text-noctis-accent`, `--noctis-accent` |

**Exemplo:**  
`className="text-noctis-accent fill-noctis-accent"` (estrela)  
`className="bg-noctis-accent/20 text-noctis-accent"` (tag "10% OFF")

---

## 5. Bordas e separadores

| Cor        | Hex       | Uso              | Tag CSS / Classe |
|------------|-----------|------------------|-------------------|
| Borda escura | `#1B2A4A` | Bordas de cards e header | `border-noctis-border`, `border-[#1B2A4A]`, `--noctis-border` |

**Exemplo:**  
`className="border border-noctis-border"`  
`className="border-b border-[#1B2A4A]"`

---

## 6. Status “Aberto” (verde)

| Cor   | Hex (approx.) | Uso        | Tag CSS / Classe |
|-------|----------------|------------|-------------------|
| Verde | Tailwind emerald | Tag "Aberto" | `bg-emerald-500/20`, `text-emerald-400` |

**Exemplo:**  
`className="inline-flex ... bg-emerald-500/20 text-emerald-400"` (tag "Aberto")

---

## 7. Barra de busca (searchbar)

| Cor / contexto | Hex / valor     | Onde                    | Tag CSS / Classe / arquivo |
|----------------|-----------------|-------------------------|-----------------------------|
| Fundo do input | `#010201`       | Campo de busca          | `.delivery-searchbar .input { background-color: #010201; }` em `index.css` |
| Placeholder    | `#c0b9c0`       | Texto "Search..."       | `.delivery-searchbar .input::placeholder { color: #c0b9c0; }` |
| Glow roxo/azul | `#402fb5`       | Borda/glow animado      | `.delivery-searchbar .glow::before`, `.border::before` – `conic-gradient(..., #402fb5, ...)` |
| Glow rosa/magenta | `#cf30aa`    | Borda/glow animado      | `.delivery-searchbar .glow::before`, `.border::before` – `#cf30aa` |
| Máscara rosa   | `#cf30aa`       | Efeito hover            | `.delivery-searchbar .pink-mask { background: #cf30aa; }` |
| Ícone lupa (gradiente) | `#f8e7f8`, `#b6a9b7`, `#837484` | SVG da lupa | `stopColor` nos `<linearGradient>` no JSX |
| Ícone filtro   | `#d6d6e6`       | Stroke do SVG           | `stroke="#d6d6e6"` no path do filtro |

**Classe do bloco:** `delivery-searchbar` (em `index.css`).

---

## 8. Botões inativos (categorias) e superfície escura

| Cor        | Hex (approx.) | Uso                    | Tag CSS / Classe |
|------------|----------------|------------------------|-------------------|
| Superfície escura | `#0B1630` | Fundo dos botões inativos (Pizza, Lanches, etc.) | `bg-noctis-surface` |
| Borda      | `#1B2A4A`     | Borda dos botões inativos | `border-noctis-border` |
| Texto      | `#A9B8D6`     | Texto dos botões inativos | `text-noctis-textSecondary` |

**Exemplo:**  
`className="bg-noctis-surface text-noctis-textSecondary border border-noctis-border"`

---

## 9. Botão flutuante de chat (FAB)

O FAB laranja é do componente **AIRestaurantChat**, não do layout principal da Delivery. Cores típicas:

| Cor    | Uso     | Tag CSS / Classe |
|--------|---------|-------------------|
| Laranja/âmbar | Gradiente do botão | `from-amber-600 to-orange-600`, `hover:shadow-orange-500/50` |
| Verde  | Bolinha “novas mensagens” | `bg-green-400` |

---

## 10. Variáveis CSS globais (`:root` em `index.css`)

```css
:root {
  --noctis-background: #050A1A;
  --noctis-surface: #0B1630;
  --noctis-primary: #2F7BFF;
  --noctis-primary-glow: #7CCBFF;
  --noctis-accent: #00D4FF;
  --noctis-text-primary: #EAF2FF;
  --noctis-text-secondary: #A9B8D6;
  --noctis-border: #1B2A4A;
  --noctis-danger: #FF4D6D;
}
```

As mesmas cores estão em **Tailwind** em `tailwind.config.js` na chave `theme.extend.colors.noctis`.

---

## Resumo rápido

| Nome       | Hex       | Classe Tailwind (exemplo)     |
|------------|-----------|--------------------------------|
| Background | `#050A1A` | `bg-noctis-background`         |
| Surface    | `#0B1630` | `bg-noctis-surface`            |
| Primary    | `#2F7BFF` | `bg-noctis-primary`            |
| Primary glow | `#7CCBFF` | `text-noctis-primaryGlow`   |
| Accent     | `#00D4FF` | `text-noctis-accent`           |
| Texto principal | `#EAF2FF` | `text-noctis-textPrimary` |
| Texto secundário | `#A9B8D6` | `text-noctis-textSecondary` |
| Borda      | `#1B2A4A` | `border-noctis-border`        |
| Danger     | `#FF4D6D` | `bg-noctis-danger` (não usado na Delivery) |
| Search input | `#010201` | `.delivery-searchbar .input` |
| Glow roxo  | `#402fb5` | `.delivery-searchbar .glow::before` |
| Glow rosa  | `#cf30aa` | `.delivery-searchbar` (gradientes/bordas) |
