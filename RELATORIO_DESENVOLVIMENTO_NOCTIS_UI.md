# 21 trechos de desenvolvimento — Rebrand Noctis e ajustes de UI

**Projeto:** Noctis (ex 221 Gourmet)  
**Objetivo:** Explicar ao cliente, em linguagem de desenvolvimento, o que foi implementado nesta entrega.  

---

## 1. Rebrand do nome em todo o projeto

O nome do aplicativo foi alterado de **"221 Gourmet"** / **"221 Delivery"** para **"Noctis"** em todos os pontos visíveis e de configuração: título do site (`index.html`), páginas (Delivery, DeliveryAuth, RestaurantAuth, Settings, Menu, Home, Staff, Register), `document.title` das telas, nome padrão do restaurante nas configurações, fallbacks de nome nas interfaces e no README. O **appId** (`com.gourmet.app`) foi mantido para não quebrar instalações ou publicações já existentes.

---

## 2. Configuração do Capacitor para Noctis

No `capacitor.config.ts` foram definidos **appName: "Noctis"** e a cor de fundo da splash screen como **#050A1A** (no lugar do branco), alinhada à identidade noturna. A pasta de build continua como **webDir: "dist"**. Essas alterações são refletidas no app Android e iOS ao rodar `npx cap sync`.

---

## 3. Nome do app no Android

No Android, o nome exibido no launcher e na barra de título foi atualizado em **`android/app/src/main/res/values/strings.xml`**: os recursos **app_name** e **title_activity_main** passaram a ser **"Noctis"**. A cor de fundo do ícone adaptativo (`ic_launcher_background`) foi alterada para **#050A1A** para combinar com a nova identidade.

---

## 4. Nome do app no iOS

No projeto iOS, o **CFBundleDisplayName** no **Info.plist** foi alterado para **"Noctis"**, para que o nome exibido no dispositivo e na App Store seja o novo nome da marca.

---

## 5. Paleta de cores Noctis e tema centralizado

Foi criado o arquivo **`src/theme/colors.ts`** exportando a paleta Noctis (background **#050A1A**, surface **#0B1630**, primary **#2F7BFF**, primaryGlow **#7CCBFF**, accent **#00D4FF**, textPrimary **#EAF2FF**, textSecondary **#A9B8D6**, border **#1B2A4A**, danger **#FF4D6D**). As variáveis CSS **:root** em **`index.css`** e as cores estendidas no **Tailwind** (`tailwind.config.js`) foram atualizadas para usar essa paleta, garantindo uso consistente em todo o app.

---

## 6. Aplicação do tema na página Delivery

A página principal do delivery (lista de restaurantes) passou a usar o tema Noctis: fundo em gradiente escuro (**#050A1A** → **#0B1630** → **#0A2A5E**), header com borda **#1B2A4A**, cards e superfícies com **noctis-surface**, textos com **noctis-textPrimary** e **noctis-textSecondary**, botões e destaques com **noctis-primary** e **noctis-accent**. Os badges (Aberto, Entrega rápida, 10% OFF) e ícones foram ajustados para as novas cores.

---

## 7. Logo no header da página Delivery

O header da página Delivery deixou de exibir apenas o texto "Noctis" e passou a exibir a **logo** (**`/logoDelivery.jpeg`**) como elemento principal. A imagem foi configurada com altura responsiva (h-14 no mobile, h-20 no desktop) e largura máxima (480px no mobile, 640px no desktop), com **object-contain** e **object-left** para manter proporção e alinhamento, sem fundo ou container extra.

---

## 8. Badge circular do carrossel com logo

O elemento circular que ficava no centro do carrossel de destaques, antes com o texto "Noctis", passou a exibir a **logo** (**`/logoDelivery.jpeg`**) preenchendo o círculo. O container manteve 80x80px, borda azul (**ring-[#2F7BFF]**) e sombra; a imagem usa **object-cover** para preencher o círculo sem distorcer.

---

## 9. Nova searchbar com bordas animadas

A área de busca e filtros da página Delivery foi substituída por uma **searchbar** com o layout e o CSS fornecidos: camadas decorativas (**.glow**, **.darkBorderBg**, **.white**, **.border**) com **conic-gradient** que animam no **hover** e no **focus** do input; input com fundo **#010201**, placeholder **#c0b9c0** e padding lateral para os ícones; máscaras (input-mask, pink-mask) para efeitos visuais. As cores e os valores do CSS foram aplicados conforme o layout original (roxo/rosa/azul).

---

## 10. Ícones SVG na searchbar

Os ícones da searchbar passaram a ser os **SVGs** do layout original: à esquerda, o ícone de **busca** (lupa) com gradientes **#f8e7f8** / **#b6a9b7** e **#837484**; à direita, o ícone de **filtro** (funil) com stroke **#d6d6e6**. O botão de filtro continua acionando o estado **showFilters** para exibir ou ocultar os filtros de categorias na página.

---

## 11. Largura do input da searchbar

O input da searchbar teve a largura aumentada para **460px** (e as camadas decorativas ao redor foram ajustadas proporcionalmente: max-width 478px, 470px, 466px, 475px, 518px) para dar mais espaço à digitação e manter o desenho das bordas animadas alinhado.

---

## 12. Remoção do fundo quadriculado

O fundo **quadriculado** (grid) que existia atrás da searchbar foi removido: o elemento **&lt;div class="grid"&gt;** foi retirado do JSX em **Delivery.tsx** e as regras CSS **.delivery-searchbar .grid** foram removidas do **index.css**. A área da searchbar passou a ter apenas o fundo da página, sem o padrão de linhas.

---

## 13. Espaçamento entre header e searchbar

O espaçamento entre o **header** e a **searchbar** foi aumentado: a margem superior do container da searchbar foi alterada de **-mt-5** (que aproximava a barra do header) para **mt-8**, criando um vão visual claro entre o cabeçalho e a área de busca.

---

## 14. Ícones e splash do Android com @capacitor/assets

Foi utilizada a ferramenta **@capacitor/assets** para gerar os ícones e as telas de splash do Android a partir da logo em **resources/logo.jpeg**, com cor de fundo **#050A1A**. Foram gerados os mipmaps (ic_launcher, ic_launcher_round, ic_launcher_foreground, ic_launcher_background) em várias densidades e as imagens de splash (port e land, incluindo variantes night) para exibição na abertura do app.

---

## 15. Favicon, manifest e theme-color na web

No **index.html** foram configurados o **favicon** e o **apple-touch-icon** apontando para a logo (**/logoDelivery.jpeg**), o **manifest** (**/manifest.webmanifest**) com nome "Noctis", **theme_color** e **background_color** **#050A1A**, para que a aba do navegador e o PWA reflitam a identidade Noctis.

---

## 16. Base path do Vite para Capacitor

No **vite.config.ts** foi definido **base: './'** para que os assets e as rotas sejam resolvidos com caminhos relativos no build. Isso evita a **tela branca** no WebView do Capacitor (que carrega o app via `file://`), onde um base absoluto quebraria o carregamento de scripts e imagens.

---

## 17. Package.json e README

O **name** do projeto no **package.json** foi alterado para **"noctis"**. O **README.md** passou a ter o título **"Noctis - Sistema de Gerenciamento de Restaurantes"**, mantendo o restante das instruções de configuração e uso.

---

## 18. Tipo DeliveryFeeRule e build

Foi adicionado o tipo **DeliveryFeeRule** em **src/types/restaurant.ts** (baseFee, perKmFee, maxRadiusKm, minFee, maxFee, freeDeliveryAboveSubtotal) e exportado para uso em **deliveryFeeService.ts**, corrigindo o erro de TypeScript no build de produção e permitindo que o projeto compile com **npm run build**.

---

## 19. Documento REBRAND_NOCTIS_ENTREGA.md

Foi criado o documento **REBRAND_NOCTIS_ENTREGA.md** na raiz do projeto com a lista de arquivos alterados (configuração, tema, páginas, Android, iOS, assets), os comandos para reproduzir o build do Android (**npm run build**, **npx cap sync android**, **./gradlew assembleDebug**) e as confirmações de que o nome, ícone, splash e cores estão aplicados e que o app abre sem tela branca quando o base path está correto.

---

## 20. Escopo do CSS da searchbar

Todo o CSS da nova searchbar foi colocado dentro do escopo **.delivery-searchbar** no **index.css**, usando os mesmos nomes de classe e id do layout original (**#poda**, **#main**, **.input**, **.glow**, **.white**, **.border**, **.darkBorderBg**, **#filter-icon**, **.filterBorder**, **#search-icon**, etc.). Assim, os estilos não interferem em outras partes do app e o comportamento de hover/focus-within nas bordas animadas permanece correto.

---

## 21. Commit e push (instrução para o cliente)

As alterações descritas acima estão **preparadas para commit** (staged). No ambiente atual, o comando **git commit** pode falhar por causa de um hook ou alias que adiciona a opção **--trailer**. Para concluir o envio ao repositório, execute manualmente no terminal, na raiz do projeto:

```bash
git commit -m "Rebrand Noctis: identidade, logo, searchbar e ajustes de UI" -m "Rebrand nome e cores, logo no header e carrossel, nova searchbar com bordas animadas, input 460px, remocao do grid, espacamento header/searchbar, iconessplash Android, favicon e manifest, base ./ Vite, REBRAND_NOCTIS_ENTREGA.md."
git push
```

Se o seu **git commit** aceitar apenas uma linha de mensagem, use:

```bash
git commit -m "Rebrand Noctis: identidade, logo, searchbar e ajustes de UI"
git push
```

Após o push, o repositório remoto ficará atualizado com todas as mudanças desta entrega.

---

*Documento gerado para comunicação com o cliente sobre as alterações de desenvolvimento (rebrand Noctis e UI).*
