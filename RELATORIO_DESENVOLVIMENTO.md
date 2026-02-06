## 1. Login do cliente sem senha — um único campo

O login do cliente no delivery foi simplificado. Em vez de dois campos (Email e Telefone), há agora **um único campo** chamado "Email ou telefone". O usuário informa apenas um dos dois; o sistema identifica automaticamente se é email (formato com @) ou telefone e busca a conta no banco. Isso deixa claro que **não existe senha** no fluxo do cliente e reduz erros de preenchimento.
---

## 2. Página dedicada de login do cliente

Foi criada a página **/delivery/auth** com layout em duas colunas: lado esquerdo com marca "221 Delivery" e texto explicativo; lado direito com o formulário. No modo "Entrar" aparece só o campo "Email ou telefone" e o botão "Entrar". No modo "Criar conta" continuam nome, email, telefone, endereço e forma de pagamento. O cliente sempre sabe em que fluxo está.

---

## 3. Mesmo fluxo no modal de login

O modal de login usado em outros pontos do delivery (por exemplo, ao pedir sem estar logado) foi alinhado à mesma lógica: um único campo "Email ou telefone" no modo login e campos separados no cadastro. Assim, a experiência é a mesma na página dedicada e no modal.

---
## 4. Página de login para restaurantes

Foi criada uma **página exclusiva de login para restaurantes** em **/restaurant/auth**. O restaurante informa **email e senha**; após o login é redirecionado automaticamente para a página de configurações do seu estabelecimento (/:restaurantId/settings). O layout segue o padrão visual do projeto (laranja/âmbar) e inclui um aviso com as credenciais de demonstração para facilitar testes.

---

## 5. Rota /restaurant/auth no aplicativo

A rota **/restaurant/auth** foi registrada no roteador da aplicação e envolvida pelo **RestaurantAuthProvider**, garantindo que o contexto de autenticação do restaurante esteja disponível nessa tela. Assim, o dono do restaurante pode acessar diretamente essa URL para entrar, sem precisar passar antes por outra página.

---

## 6. Nome da loja no topo das configurações

Na página de configurações do restaurante (/:restaurantId/settings), o **nome da loja** passou a aparecer no topo da tela. O nome é carregado a partir do Firestore (coleção de restaurantes) usando o ID do restaurante da URL. Abaixo do nome é exibido o texto "Painel de gerenciamento". Assim, o usuário sempre sabe em qual estabelecimento está.

---

## 7. Título da aba do navegador com nome da loja

O título da aba do navegador na página de configurações foi alterado para usar o nome da loja quando disponível, no formato **"Nome da loja - Gerenciamento"**. Isso melhora a identificação quando há várias abas abertas e ajuda em favoritos e histórico.

---

## 8. Botão "Sair" na página de configurações

Foi adicionado um botão **"Sair"** no header da página de configurações do restaurante. Ao clicar, a sessão do restaurante é encerrada (logout no contexto de autenticação) e o usuário é redirecionado para **/restaurant/auth**. Assim, é possível trocar de conta ou encerrar o uso sem fechar o navegador.

---

## 9. Uso do ID do restaurante vindo da URL

O hook **useRestaurantId** foi ajustado para priorizar o parâmetro **restaurantId** da URL (por exemplo, em /:restaurantId/settings). Antes, em modo normal era usado um ID fixo, o que impedia que o login em /restaurant/auth redirecionasse corretamente para as configurações do restaurante logado. Agora, ao acessar /abc123/settings, todos os dados (produtos, categorias, permissões, nome) são carregados para o restaurante "abc123".

---

## 10. Verificação de acesso por ID da URL

A verificação de acesso na página de configurações compara o **currentRestaurantId** (usuário logado) com o **restaurantId** da URL. Só quem está logado como aquele restaurante vê o conteúdo; caso contrário, o modal de login é exibido. Com o useRestaurantId lendo da URL, essa verificação passou a funcionar corretamente após o login em /restaurant/auth.

---

## 11. Script de criação de usuários de demonstração

Foi criado o script **createDemoUsers** (executado com **npm run create:demo-users**). Ele garante a existência de: (1) um **restaurante demo** (email restaurante@demo.com, senha Demo@123); (2) um **cliente delivery demo** (email cliente@demo.com ou telefone (11) 99999-9999, sem senha). O admin continua apenas no código. O script pode ser rodado sempre que for necessário resetar ou recriar os usuários de teste.

---

## 12. Atualização do restaurante demo já existente

Quando o restaurante demo já existe no Firestore, o script não apenas atualiza a senha, mas também **ativa o delivery** (deliverySettings.enabled = true) e garante a **permissão de delivery** (delivery: true nas permissões do restaurante). Assim, o restaurante demo passa a aparecer na lista da página principal do delivery para o cliente, mesmo que tenha sido criado em uma versão anterior.

---

## 13. Documentação das credenciais de demonstração

Foi criado o arquivo **CREDENCIAIS_DEMO.md** com todas as credenciais e instruções: admin (email/senha e rota /owner), restaurante (email/senha, uso de /restaurant/auth e de /:restaurantId/settings), cliente (email ou telefone, sem senha, uso de /delivery/auth). Inclui também o comando para rodar o script e o que cada tipo de usuário pode fazer. Isso facilita onboarding e testes para o cliente e para a equipe.

---

## 14. Serviço de imagens de comida (Unsplash)

Foi criado o serviço **foodImageService**, que centraliza o uso de imagens de comida. Sem configuração adicional, ele retorna uma lista fixa de **quatro imagens** de comida (Pizza, Prato, Lanches, Massas) usando URLs do CDN do Unsplash. Quando a variável de ambiente **VITE_UNSPLASH_ACCESS_KEY** está definida, o serviço passa a buscar fotos dinamicamente na **API do Unsplash** por termos como "pizza", "prato comida", "hamburguer lanches" e "massas comida", retornando até quatro imagens para uso no carrossel.

---

## 15. Carrossel dinâmico na página principal do delivery

A página principal do delivery (/) passou a usar o **foodImageService** para o carrossel de destaques. Na abertura da página são exibidas imediatamente as imagens de fallback; em paralelo, se houver chave da API Unsplash, é feita a busca e o carrossel é atualizado com as fotos retornadas. O usuário vê sempre imagens de comida de qualidade, com ou sem chave configurada.

---

## 16. Fallback e tratamento de erro na API de imagens

O serviço de imagens trata cenários de erro: chave inválida, limite da API atingido ou falha de rede. Nesses casos, mantém ou volta a usar as **imagens de fallback** (quatro fotos estáticas do Unsplash). Assim, a página principal nunca fica sem imagens no carrossel.

---

## 17. Identidade visual: título e fonte

O **index.html** foi ajustado com o título **"221 Delivery"** e inclusão da fonte **DM Sans** (Google Fonts), com preconnect para melhor desempenho. No **tailwind.config.js** a família de fontes padrão (sans) foi configurada para usar DM Sans. O resultado é uma identidade visual mais consistente e uma tipografia moderna em toda a aplicação.

---

## 18. Script create:demo-users no package.json

Foi adicionado o script **create:demo-users** no **package.json**, executando o createDemoUsers via **tsx**. Assim, qualquer desenvolvedor ou ambiente (incluindo CI/CD) pode rodar **npm run create:demo-users** para garantir os usuários de demonstração sem precisar conhecer o caminho do arquivo.

---

## 19. Redirecionamento pós-login do restaurante

Após o login bem-sucedido em /restaurant/auth, o sistema busca o **ID do restaurante** pelo email (getRestaurants + find) e redireciona para **/:restaurantId/settings**. Opcionalmente, é possível usar o parâmetro **returnUrl** na URL para redirecionar para outro destino. Isso completa o fluxo: login → painel da loja correta.

---

## 20. Separação clara entre cliente e restaurante

As mudanças reforçam a separação entre os dois tipos de usuário: **cliente** (acesso por email ou telefone, sem senha, em /delivery e /delivery/auth) e **restaurante** (acesso por email e senha, em /restaurant/auth e /:restaurantId/settings). A documentação em CREDENCIAIS_DEMO.md e os textos na tela deixam explícito qual credencial usar em cada contexto, evitando confusão (por exemplo, usar restaurante@demo.com na tela de login do cliente).

---

## 21. Impacto geral e próximos passos sugeridos

Em conjunto, as alterações melhoram a **experiência do cliente** (login simples, carrossel com imagens de comida, restaurante demo visível), a **experiência do restaurante** (login dedicado, nome da loja visível, botão Sair) e a **operação e testes** (script de usuários demo, documentação de credenciais, API de imagens opcional). Como próximos passos sugeridos: (1) configurar **VITE_UNSPLASH_ACCESS_KEY** em produção se desejar imagens dinâmicas; (2) rodar **npm run create:demo-users** em cada ambiente que precisar dos usuários de demonstração; (3) comunicar aos usuários finais a URL **/restaurant/auth** para acesso dos restaurantes.

---

*Relatório gerado com base no commit de desenvolvimento (feat: login delivery sem senha, login restaurante, nome da loja, sair, API imagens e usuários demo).*
