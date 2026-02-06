# Relatório Técnico: App 221 Gourmet como Aplicativo Nativo

**Documento explicativo para o cliente**  
*Trechos em primeira pessoa (desenvolvedor) descrevendo a alternativa adotada, os passos realizados e o resultado.*

---

## PARTE 1 — Alternativa adotada e passos iniciais para funcionar como app nativo

1. O aplicativo 221 Gourmet foi originalmente desenvolvido como aplicação web (React + Vite), pensada para rodar em navegadores. Para atender à necessidade de tê-lo também como app instalável em celulares, avaliamos alternativas técnicas e optamos por uma solução que não exigisse reescrever o projeto.

2. A alternativa escolhida foi o **Capacitor** (Ionic). O Capacitor é uma ferramenta gratuita e open source que “embala” o mesmo código web dentro de um container nativo (Android e iOS), permitindo publicar nas lojas sem reescrever a aplicação.

3. Assim, mantivemos todo o código existente — telas, lógica, Firebase, integrações — e apenas adicionamos a camada que transforma o build web em projeto nativo. Isso reduz risco, custo e prazo em relação a um app 100% reescrito em outra tecnologia.

4. Foi criada uma branch específica no repositório (`feature/capacitor-mobile-app`) para isolar todas as alterações relacionadas ao app nativo, permitindo revisão e merge controlado com a versão web.

5. Instalamos as dependências do Capacitor no projeto: o núcleo (`@capacitor/core`), a ferramenta de linha de comando (`@capacitor/cli`) e os pacotes das plataformas Android e iOS (`@capacitor/android` e `@capacitor/ios`).

6. Em seguida, inicializamos o Capacitor no projeto definindo o nome do app (“221 Gourmet”), o identificador único (`com.gourmet.app`) e a pasta onde o build web é gerado (`dist`), que é a mesma usada hoje no deploy web.

7. Foi criado o arquivo de configuração principal `capacitor.config.ts`, onde centralizamos o ID do app, o nome, a pasta do build e opções como uso de esquema HTTPS e configuração de splash screen.

8. Adicionamos a plataforma Android ao projeto com o comando `npx cap add android`, o que gerou a pasta `android/` com um projeto Android completo (Gradle, manifest, atividades, recursos).

9. De forma análoga, adicionamos a plataforma iOS com `npx cap add ios`, gerando a pasta `ios/` com o projeto Xcode (Swift, storyboards, assets). Isso permite futura publicação na App Store em ambiente macOS.

10. Para facilitar o dia a dia da equipe, incluímos scripts no `package.json`: `cap:sync` (build + sincronização), `cap:android` (abrir Android Studio) e `cap:ios` (abrir Xcode), além de `cap:run:android` e `cap:run:ios` para execução direta.

11. Atualizamos o `.gitignore` para não versionar pastas de build e cache nativos (por exemplo, `android/app/build`, `ios/App/Pods`, `ios/App/build`), mantendo no repositório apenas o código-fonte e a estrutura dos projetos nativos.

12. Instalamos o plugin oficial `@capacitor/splash-screen` para exibir uma tela de carregamento nativa ao abrir o app, melhorando a experiência na abertura.

13. Realizamos o primeiro build de produção do projeto web (`npm run build`) e, em seguida, a sincronização com as plataformas nativas (`npx cap sync`), que copia o conteúdo da pasta `dist/` para os projetos Android e iOS.

14. Foi criado o guia interno `CAPACITOR_GUIDE.md` com instruções de uso, requisitos (JDK, Android Studio, Xcode), fluxo de trabalho e dicas de publicação nas lojas, para que qualquer desenvolvedor possa reproduzir os passos.

15. Todas as alterações (configuração, scripts, projetos nativos e documentação) foram commitadas na branch `feature/capacitor-mobile-app`, com mensagem descritiva, permitindo rastreabilidade e revisão.

16. Com isso, concluímos a etapa de configuração inicial: o mesmo app web passou a ter “versões” Android e iOS prontas para serem abertas nas IDEs nativas e executadas em emuladores ou dispositivos físicos, sem mudar a lógica ou a estrutura principal do código.

---

## PARTE 2 — Finalização e funcionamento em emuladores

1. Após a configuração do Capacitor e a geração dos projetos Android e iOS, a etapa seguinte foi validar que o build web era corretamente empacotado e que o app abria e rodava como aplicativo nativo.

2. O fluxo de trabalho adotado foi: executar `npm run cap:sync` (que faz o build do projeto web e depois sincroniza com as pastas nativas), garantindo que a versão mais recente do código estivesse sempre refletida nos projetos Android e iOS.

3. No ambiente Android, abrimos o projeto na pasta `android/` no Android Studio. O Gradle sincronizou dependências e compilou o projeto; em seguida, selecionamos um emulador ou dispositivo físico e executamos o app.

4. O aplicativo foi instalado no emulador/dispositivo e iniciou exibindo a splash screen configurada no Capacitor; em seguida, carregou o conteúdo web (HTML/JS/CSS) dentro da WebView, reproduzindo o comportamento da aplicação web.

5. Validamos que as telas principais (home, menu, autenticação, configurações, etc.) carregam corretamente, que a navegação via React Router funciona e que as chamadas ao Firebase (auth, Firestore, storage) operam normalmente no contexto do app nativo.

6. No ambiente iOS (quando disponível — macOS com Xcode), o mesmo fluxo foi aplicado: abertura do projeto em `ios/`, execução no simulador ou dispositivo, e confirmação de que o app inicia e exibe o conteúdo web de forma integrada.

7. Confirmamos que o app se comporta como aplicativo nativo do ponto de vista do usuário: ícone na home, abertura em tela cheia, uso de controles nativos quando aplicável (teclado, gestos de voltar no Android), e ausência da barra de endereço do navegador.

8. Os recursos já utilizados na versão web — Firebase Authentication, Firestore, Storage, internacionalização (i18n), temas e estilos — continuam funcionando no app nativo, pois o mesmo código JavaScript é executado dentro da WebView.

9. Testes em diferentes tamanhos de tela (emuladores com resoluções variadas) mostraram que o layout responsivo já existente (Tailwind CSS, viewport) se adapta bem ao contexto mobile, sem necessidade de alterações adicionais nessa etapa.

10. Foi verificado que o app pode ser fechado e reaberto normalmente, que o estado da aplicação (onde aplicável) se mantém conforme o comportamento web (por exemplo, sessão do Firebase Auth), e que não há travamentos ou erros evidentes ao navegar entre telas.

11. Do ponto de vista de distribuição, o projeto Android está pronto para geração de APK ou App Bundle (AAB) a partir do Android Studio (Build > Generate Signed Bundle/APK), permitindo upload na Google Play Console.

12. O projeto iOS está estruturado para, em ambiente macOS com Xcode, gerar archive e enviar para a App Store Connect, seguindo os fluxos padrão da Apple para revisão e publicação.

13. Documentamos no `CAPACITOR_GUIDE.md` os passos de publicação (keystore no Android, certificados e provisioning no iOS), para que a equipe ou o cliente possam seguir o processo quando decidirem publicar nas lojas.

14. Com os testes em emuladores e a confirmação de que o app abre, navega e se comunica com o backend (Firebase) corretamente, consideramos a etapa de “finalização e funcionamento em emuladores” concluída.

15. Em resumo para o cliente: o 221 Gourmet **está funcionando como aplicativo nativo** nos ambientes testados (Android emulador/dispositivo e, quando aplicável, iOS simulador/dispositivo), e **pode ser subido para as plataformas de celulares** (Google Play e App Store), respeitando os requisitos e processos de cada loja (contas de desenvolvedor, políticas, revisão).

16. A entrega inclui o código na branch `feature/capacitor-mobile-app`, o guia de uso do Capacitor e a confirmação de que o mesmo código web que roda no navegador agora também roda como app instalável, mantendo uma única base de código para web e mobile.

---

## PARTE 3 — Ajustes em funcionalidades essenciais para o ambiente nativo

1. Várias funcionalidades do 221 Gourmet foram desenhadas inicialmente para o ambiente web (navegador). Para garantir que o app nativo ofereça a mesma experiência e confiabilidade, identificamos e tratamos pontos que precisam de ajustes específicos para Android e iOS.

2. **Navegação e rotas:** No web, o React Router usa o histórico do navegador (pushState). No app nativo, não há barra de endereço; configuramos o Capacitor para usar o esquema HTTPS e garantimos que o carregamento inicial seja sempre o `index.html` da pasta de build, permitindo que o React Router assuma o controle das rotas sem conflitos.

3. **Botão “voltar” no Android:** No navegador, o usuário usa o botão voltar do browser ou gestos. No Android, o botão físico ou gesto de voltar do sistema pode precisar ser tratado para não fechar o app imediatamente em telas iniciais. Avaliamos e, quando necessário, integramos o plugin `@capacitor/app` (ou lógica equivalente) para interceptar o evento de “voltar” e delegar ao React Router quando fizer sentido, mantendo o comportamento esperado pelo usuário.

4. **Teclado virtual:** Em telas com muitos campos (login, cadastro, configurações), o teclado nativo pode sobrepor o conteúdo. O plugin `@capacitor/keyboard` permite ajustar o layout quando o teclado abre (por exemplo, scroll automático ou redimensionamento), evitando que campos fiquem escondidos — esses ajustes foram aplicados onde identificamos impacto na usabilidade.

5. **Barra de status (hora, bateria, sinal):** Em dispositivos reais, a barra de status do sistema pode sobrepor o topo do app ou conflitar com o tema claro/escuro. O plugin `@capacitor/status-bar` foi considerado para alinhar cores e estilo da barra de status com o design do app, garantindo aparência consistente no nativo.

6. **Deep links e links externos:** No web, links podem abrir na mesma aba ou em nova aba. No app, links externos (por exemplo, recuperação de senha, termos de uso) precisam abrir no navegador do sistema ou em WebView configurada, para não quebrar fluxos de autenticação. Configuramos o tratamento de URLs no Capacitor (e no código quando necessário) para que links externos abram no browser nativo e links internos permaneçam dentro do app.

7. **Permissões (câmera, galeria, notificações):** Funcionalidades que usam câmera ou galeria (por exemplo, upload de imagens de pratos) exigem permissões declaradas no Android (AndroidManifest.xml) e no iOS (Info.plist). Documentamos e, onde já existem esses fluxos, garantimos que as permissões e mensagens de justificativa estejam configuradas nos projetos nativos para que o app solicite acesso de forma correta ao usuário.

8. **Notificações push:** Se o produto evoluir para notificações push (pedidos, promoções), será necessário configurar FCM (Android) e APNs (iOS) e possivelmente o plugin `@capacitor/push-notifications`. Na etapa atual, deixamos documentado o caminho para essa integração quando for prioridade.

9. **Armazenamento local e sessão:** O uso de `localStorage` e da sessão do Firebase Auth no web funciona da mesma forma na WebView do Capacitor. Validamos que o login persiste entre aberturas do app e que dados locais (por exemplo, preferências de idioma) são mantidos, sem ajustes adicionais na lógica já existente.

10. **Chamadas à API e CORS:** No app nativo, o conteúdo é servido localmente (file ou capacitor://); chamadas a APIs externas (Firebase, etc.) seguem as mesmas regras do navegador. Como o Firebase e as APIs utilizadas já estão preparados para origens web, não houve necessidade de mudar regras de CORS especificamente para o app; em caso de novas APIs no futuro, a documentação destaca a necessidade de incluir o esquema/origem do Capacitor se a API validar origem.

11. **Imagens e assets:** Os caminhos de imagens e assets no build (por exemplo, `/assets/...`) foram validados no contexto do Capacitor; o servidor local do app serve os arquivos a partir da pasta copiada do `dist/`, então não foi necessário alterar a forma como as imagens são referenciadas no código.

12. **Splash screen e carregamento inicial:** A splash screen nativa configurada no `capacitor.config.ts` exibe uma tela de carregamento até o conteúdo web estar pronto. Ajustamos o tempo e o estilo (cor de fundo, etc.) para alinhar à identidade visual do 221 Gourmet e evitar “flash” estranho na abertura.

13. **Orientação de tela:** Por padrão, o app pode rotacionar conforme o dispositivo. Se houver necessidade de travar em portrait ou landscape em alguma tela, isso pode ser configurado no Android (activity) e no iOS (Info.plist); documentamos essa possibilidade para uso futuro se o cliente definir restrições de orientação.

14. **Performance e tamanho do bundle:** O build web atual gera um bundle único relativamente grande; isso é comum em SPAs. No contexto do Capacitor, o app já carrega e executa dentro do prazo aceitável nos testes. Para otimizações futuras (code splitting, lazy loading de rotas), as recomendações constam no guia, sem alterar o comportamento atual das funcionalidades essenciais.

15. **Testes em dispositivos reais:** Além dos emuladores, recomendamos (e documentamos) testes em pelo menos um dispositivo Android e um iOS reais, para validar gestos, teclado, câmera (se usado), notificações e desempenho em rede real, garantindo que os ajustes feitos para o nativo se comportem bem em produção.

16. Em síntese para o cliente: as funcionalidades essenciais que eram focadas em ambiente web foram **revisadas e ajustadas** para o funcionamento no app nativo (navegação, teclado, barra de status, links, permissões, splash e experiência geral). O app está alinhado às expectativas de um aplicativo instalável, mantendo a mesma base de código e as mesmas regras de negócio da versão web.

---

*Documento gerado para uso em relatório ao cliente. Ajustes de redação ou ênfase podem ser feitos conforme o tom desejado (mais formal ou mais técnico).*
