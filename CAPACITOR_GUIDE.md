# Guia do Capacitor - 221 Gourmet

Este projeto agora suporta compilação como **aplicativo nativo** para Android e iOS usando o **Capacitor**.

## O que foi configurado

### Dependências instaladas
- `@capacitor/core` - Core do Capacitor
- `@capacitor/cli` - Interface de linha de comando
- `@capacitor/android` - Plataforma Android
- `@capacitor/ios` - Plataforma iOS
- `@capacitor/splash-screen` - Plugin de splash screen

### Estrutura de pastas
```
/android/          - Projeto Android (Gradle/Kotlin)
/ios/              - Projeto iOS (Xcode/Swift)
/dist/             - Build web que será copiado para os apps nativos
capacitor.config.ts - Configuração do Capacitor
```

### Configuração aplicada

**ID do App:** `com.gourmet.app`  
**Nome do App:** `221 Gourmet`  
**Esquema:** HTTPS (para Android e iOS)

## Como usar

### 1. Desenvolvimento web (normal)
```bash
npm run dev
```
Continua funcionando exatamente como antes - servidor de desenvolvimento Vite na porta 5173.

### 2. Build e sincronização
```bash
npm run cap:sync
```
Faz o build do projeto web e sincroniza com as plataformas nativas (copia o `dist/` para dentro dos projetos Android e iOS).

### 3. Abrir no Android Studio
```bash
npm run cap:android
```
Abre o projeto Android no Android Studio. Você pode então:
- Rodar no emulador
- Rodar em dispositivo conectado via USB
- Gerar APK ou App Bundle para publicação

### 4. Abrir no Xcode (apenas macOS)
```bash
npm run cap:ios
```
Abre o projeto iOS no Xcode. Você pode então:
- Rodar no simulador
- Rodar em dispositivo conectado
- Gerar arquivo IPA para publicação

### 5. Rodar diretamente (com live reload)
```bash
npm run cap:run:android    # Android
npm run cap:run:ios        # iOS (apenas macOS)
```

## Requisitos

### Para Android
- **Java JDK** 17 ou superior
- **Android Studio** com:
  - Android SDK (API 33 ou superior recomendado)
  - Android SDK Build-Tools
  - Android Emulator (opcional, para testar sem dispositivo físico)
- **Gradle** (geralmente vem com o Android Studio)

### Para iOS (apenas macOS)
- **macOS** (necessário para desenvolvimento iOS)
- **Xcode** 14 ou superior
- **CocoaPods** (`sudo gem install cocoapods`)
- **Simulador iOS** ou dispositivo físico

## Fluxo de trabalho típico

1. **Desenvolva normalmente** no navegador com `npm run dev`
2. Quando quiser testar no app:
   ```bash
   npm run build              # Gera dist/
   npx cap sync              # Copia para android/ e ios/
   npx cap open android      # Ou ios
   ```
3. No Android Studio/Xcode, clique em **Run** para rodar no dispositivo/emulador

## Arquivos importantes

### `capacitor.config.ts`
Configuração principal do Capacitor. Define:
- ID do aplicativo (`appId`)
- Nome do aplicativo (`appName`)
- Pasta do build web (`webDir`)
- Configurações de servidor e plugins

### `.gitignore` (atualizado)
As seguintes pastas **não** vão para o Git (são builds/caches nativos):
```
android/app/build
android/.gradle
android/.idea
android/build
android/local.properties
ios/App/Podfile.lock
ios/App/Pods
ios/App/build
```

Os **projetos base** (android/ e ios/) **vão** para o Git, apenas os builds e caches são ignorados.

## Publicação

### Android (Google Play Store)
1. No Android Studio, vá em **Build > Generate Signed Bundle / APK**
2. Siga o assistente para criar/usar uma keystore
3. Gere um **App Bundle (.aab)** para a Play Store
4. Faça upload na [Google Play Console](https://play.google.com/console)

### iOS (App Store)
1. No Xcode, configure o **Provisioning Profile** e **Certificate**
2. Selecione **Product > Archive**
3. Use o **Organizer** para fazer upload para o App Store Connect
4. Submeta para revisão no [App Store Connect](https://appstoreconnect.apple.com)

## Plugins úteis do Capacitor

O Capacitor tem vários plugins oficiais que você pode adicionar conforme necessário:

```bash
npm install @capacitor/camera        # Câmera e galeria
npm install @capacitor/geolocation   # GPS
npm install @capacitor/push-notifications  # Notificações push
npm install @capacitor/app           # Lifecycle do app
npm install @capacitor/keyboard      # Controle do teclado
npm install @capacitor/status-bar    # Barra de status
npm install @capacitor/share         # Compartilhamento nativo
```

Depois de instalar, rode `npx cap sync` para sincronizar.

## Diferenças entre web e app nativo

### O que funciona igual
- Firebase (Auth, Firestore, Storage)
- React Router
- Estado da aplicação
- Lógica de negócio
- Tailwind CSS

### Atenção especial para
- **URLs e navegação:** deep links precisam ser configurados no `capacitor.config.ts`
- **Permissões:** câmera, localização, notificações exigem configuração adicional (Info.plist no iOS, AndroidManifest.xml no Android)
- **CORS:** não é problema em apps nativos (código roda localmente)
- **LocalStorage/Cookies:** funcionam normalmente

## Troubleshooting

### "Could not find or load main class org.gradle.wrapper.GradleWrapperMain"
Execute na pasta `android/`:
```bash
cd android
./gradlew wrapper --gradle-version=8.0
```

### "Pod install" falha no iOS
```bash
cd ios/App
pod repo update
pod install
```

### "Build failed" no Android
1. Abra o Android Studio
2. File > Sync Project with Gradle Files
3. Verifique se o SDK e Build Tools estão instalados

### Mudanças não aparecem no app
Sempre rode `npx cap sync` após fazer mudanças e buildar (`npm run build`).

## Recursos

- [Documentação oficial do Capacitor](https://capacitorjs.com/docs)
- [Plugins do Capacitor](https://capacitorjs.com/docs/plugins)
- [Guia de workflow](https://capacitorjs.com/docs/basics/workflow)
- [Guia de publicação Android](https://capacitorjs.com/docs/android/deploying-to-google-play)
- [Guia de publicação iOS](https://capacitorjs.com/docs/ios/deploying-to-app-store)

---

**Pronto!** Seu app web agora pode ser compilado como aplicativo nativo para Android e iOS. 🚀
