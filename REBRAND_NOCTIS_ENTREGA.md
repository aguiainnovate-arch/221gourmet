# Rebrand Noctis — Entrega e build Android

## Resumo

- **Nome do app:** 221 Gourmet / 221 Delivery → **Noctis**
- **Logo:** Integrada como ícone do app (Android/iOS), splash screen, favicon e manifest (web).
- **Cores:** Paleta Noctis aplicada (background `#050A1A`, surface `#0B1630`, primary `#2F7BFF`, accent `#00D4FF`, textos `#EAF2FF` / `#A9B8D6`, etc.).
- **Build:** Web build com `base: './'` para Capacitor; Android debug APK gerado com sucesso.

---

## Arquivos alterados

### Configuração e nome
- `capacitor.config.ts` — `appName: "Noctis"`, SplashScreen `backgroundColor: "#050A1A"`
- `package.json` — `name: "noctis"`
- `index.html` — título "Noctis", favicon/manifest, `theme-color` e links para logo
- `README.md` — título "Noctis - Sistema de Gerenciamento de Restaurantes"
- `vite.config.ts` — `base: './'` para evitar tela branca no Capacitor

### Web: tema e cores
- `src/theme/colors.ts` — **novo** — paleta Noctis
- `src/config/colors.ts` — comentário atualizado para Noctis
- `tailwind.config.js` — cores `noctis.*` e primárias/secundárias/accent alinhadas à paleta
- `src/index.css` — variáveis CSS `:root` e `body` com background/cor de texto Noctis

### Páginas e textos (rebrand)
- `src/pages/Delivery.tsx` — "Noctis", layout e cores Noctis (header, cards, inputs, badges)
- `src/pages/DeliveryAuth.tsx` — "Noctis"
- `src/pages/RestaurantAuth.tsx` — "Noctis"
- `src/pages/Settings.tsx` — título e placeholder "Noctis"
- `src/pages/Menu.tsx` — título e fallback "Noctis"
- `src/pages/Home.tsx` — título e fallback "Noctis"
- `src/pages/Staff.tsx` — título "Noctis - Cozinha"
- `src/pages/Register.tsx` — textos "Noctis" (mantidos domínios .221menu.com)
- `src/services/settingsService.ts` — `restaurantName` default "Noctis"
- `src/components/MenuPreview.tsx` — fallback "Noctis"
- `src/services/geocodingService.ts` — USER_AGENT "noctis-delivery/1.0"

### Android
- `android/app/src/main/res/values/strings.xml` — `app_name` e `title_activity_main` "Noctis"
- `android/app/src/main/res/values/ic_launcher_background.xml` — cor `#050A1A`
- `android/app/src/main/res/drawable/ic_launcher_background.xml` — fill `#050A1A`
- Ícones e splash — regenerados com `@capacitor/assets` a partir de `resources/logo.jpeg` (fundo `#050A1A`): mipmap-* (ic_launcher, ic_launcher_round, ic_launcher_foreground, ic_launcher_background), drawable/drawable-*-*/splash.png

### iOS
- `ios/App/App/Info.plist` — `CFBundleDisplayName` "Noctis"

### Assets e branding
- `src/assets/branding/noctis-logo.jpeg` — **novo** — cópia da logo para referência
- `resources/logo.jpeg` — **novo** — logo para `@capacitor/assets`
- `public/manifest.webmanifest` — **novo** — name "Noctis", theme/background `#050A1A`, ícones apontando para logo

### Correção de tipo (build)
- `src/types/restaurant.ts` — **novo** tipo `DeliveryFeeRule` exportado (usado por `deliveryFeeService`)

---

## Como reproduzir o build Android

```bash
# 1. Instalar dependências (se ainda não fez)
npm install

# 2. Build do web app (produção)
npm run build

# 3. Sincronizar com Android (copia dist + gera capacitor.config em assets)
npx cap sync android

# 4. Gerar APK debug
cd android && ./gradlew assembleDebug

# APK gerado em:
# android/app/build/outputs/apk/debug/app-debug.apk
```

**Build release (AAB para Play Store):**
```bash
cd android && ./gradlew bundleRelease
# Saída: android/app/build/outputs/bundle/release/app-release.aab
```

**Abrir no Android Studio:**
```bash
npx cap open android
```

---

## Confirmações

- **Nome:** "Noctis" aparece no título da web, no header do delivery, nas telas de auth e no label do app Android/iOS.
- **Ícone:** Ícone do app Android gerado a partir da logo (fundo `#050A1A`, logo centralizada com padding).
- **Splash:** Splash com fundo `#050A1A` e logo central; configurado em `capacitor.config.ts` e assets gerados em `drawable*/splash.png`.
- **Tela branca:** `base: './'` no Vite garante que scripts e assets usem caminhos relativos no `file://` do WebView; build de produção foi testado e `dist` está sendo servido corretamente pelo Capacitor.
- **Cores:** Página principal do delivery (lista de restaurantes) e variáveis globais usam a paleta Noctis; tema escuro aplicado (background, surface, textos, bordas).

---

## Observações

- **appId** foi mantido como `com.gourmet.app` para não quebrar instalações/publicação existentes.
- **Domínios** em Register (ex.: `.221menu.com`) foram mantidos; apenas textos visíveis da marca foram alterados para "Noctis".
- Para **iOS**, ícones/splash podem ser gerados com:  
  `npx @capacitor/assets generate --assetPath resources --iconBackgroundColor '#050A1A' --splashBackgroundColor '#050A1A' --ios`

---

## Commit

As alterações do rebrand estão **staged** (prontas para commit). Se no seu ambiente o comando abaixo falhar por causa de hook/alias (ex.: `unknown option 'trailer'`), faça o commit manualmente na sua IDE ou com:

```bash
git commit -m "chore: rebrand to Noctis, capacitor assets, theme palette"
```

Ou, se preferir a mensagem sugerida no enunciado:

```bash
git commit -m "chore: rebrand to Noctis + capacitor assets + theme palette"
```
