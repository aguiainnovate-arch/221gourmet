# Relatório de Desenvolvimento — Stripe Connect, Pagamentos e Checkout

Este relatório consolida as implementações realizadas no projeto relacionadas à integração com Stripe, incluindo criação de subcontas Connect, onboarding de restaurantes, pagamentos online, cartão salvo, PIX, status operacional, ajustes de checkout e melhorias no preenchimento de endereço do cliente.

## Resumo executivo

A aplicação foi preparada para operar como plataforma de delivery com pagamentos online via Stripe Connect. Cada restaurante pode criar uma subconta Stripe vinculada ao seu cadastro, concluir o onboarding hospedado pela Stripe e, quando a conta estiver com cobranças habilitadas, receber pedidos pagos pelo aplicativo.

O checkout do cliente foi ajustado para liberar cartão e PIX online somente quando o restaurante estiver apto a cobrar pela Stripe. Caso contrário, o app mantém formas alternativas como dinheiro, PIX na entrega e cartão na entrega. Também foram implementados fluxos para salvar cartão, listar cartões salvos, remover cartões, confirmar pagamentos, tratar 3DS e registrar o `stripePaymentIntentId` no pedido.

## Tópicos de desenvolvimento implementados

1. **Criação de subconta Stripe Connect por restaurante**  
   Implementada função backend para criar uma conta Connect vinculada ao documento do restaurante no Firestore.

2. **Uso de conta Express para onboarding hospedado**  
   A conta criada usa fluxo Express, permitindo que a Stripe colete dados sensíveis diretamente sem passar pelo frontend do app.

3. **País da conta conectado ao Brasil**  
   A criação da conta define `country: 'BR'`, alinhando o fluxo ao mercado brasileiro.

4. **Solicitação de capabilities de cartão e transferência**  
   A subconta solicita `card_payments` e `transfers`, necessárias para receber pagamentos e repasses.

5. **Persistência do `stripeConnectAccountId` no Firestore**  
   Após criar a subconta, o ID `acct_...` é salvo no documento do restaurante.

6. **Reutilização de conta Stripe já criada**  
   Se o restaurante já possui `stripeConnectAccountId`, a função não cria outra conta; apenas gera novo link de onboarding.

7. **Geração de Account Link de onboarding**  
   O backend cria `accountLinks.create` com `type: 'account_onboarding'` para enviar o restaurante ao fluxo seguro da Stripe.

8. **URLs de retorno e atualização do onboarding**  
   Foram configuradas `return_url` e `refresh_url` para voltar ao painel do restaurante em `/{restaurantId}/settings?tab=delivery&stripe_connect=...`.

9. **Configuração de origem pública via `PUBLIC_APP_URL`**  
   A Cloud Function usa parâmetro configurável para montar as URLs corretas de retorno da Stripe em produção.

10. **Correção de tela branca após retorno da Stripe**  
    O build web passou a usar `base: '/'`, evitando que rotas profundas tentem carregar assets relativos e recebam HTML no lugar de JavaScript.

11. **Separação de build web e build Capacitor**  
    Foi criado `build:capacitor` com `CAPACITOR_BUILD=true`, mantendo `base: './'` apenas para o app nativo.

12. **Sincronização de status da conta Connect**  
    Implementada função para consultar a conta na Stripe e atualizar no Firestore os campos de status.

13. **Persistência de `stripeConnectChargesEnabled`**  
    O app salva se a Stripe habilitou cobranças para a conta conectada.

14. **Persistência de `stripeConnectDetailsSubmitted`**  
    O app salva se o cadastro obrigatório foi enviado à Stripe.

15. **Persistência de `stripeConnectPayoutsEnabled`**  
    O app salva se a conta está habilitada para repasses.

16. **Diagnóstico de pendências da Stripe**  
    A sincronização agora salva `stripeConnectDisabledReason` e `stripeConnectRequirementsSummary`, ajudando a explicar por que cobranças continuam inativas.

17. **Exibição de motivo de bloqueio no painel**  
    O card de Stripe mostra o motivo informado pela Stripe quando cobranças estão inativas.

18. **Card destacado de ativação do recebimento online**  
    A área de Stripe Connect foi redesenhada para explicar que a ativação é obrigatória para clientes pagarem pelo app.

19. **Onboarding visual em três etapas**  
    O painel mostra os passos: conectar Stripe, concluir dados e atualizar status.

20. **Painel intuitivo de status da solicitação**  
    Os chips simples foram substituídos por um painel que informa se a solicitação está pendente, em análise ou ativa.

21. **Status operacional orientado ao restaurante**  
    A UI informa claramente quando o pagamento pelo app está liberado ou bloqueado aguardando Stripe.

22. **Bloqueio de pagamento online no checkout quando Connect não está ativo**  
    O checkout só libera cartão salvo, novo cartão e PIX online quando `stripeConnectChargesEnabled === true`.

23. **Mensagem ao cliente quando restaurante não habilitou pagamento online**  
    O checkout mostra aviso de que o restaurante ainda não habilitou pagamento pelo app.

24. **Integração com Stripe.js no checkout**  
    O frontend usa `@stripe/stripe-js` e `@stripe/react-stripe-js` para confirmar pagamentos e renderizar elementos seguros.

25. **Criação de PaymentIntent para delivery**  
    O backend cria `PaymentIntent` com valor em centavos, moeda validada e metadata do pedido/restaurante.

26. **Validação de valor do pagamento**  
    A função valida `amountCents` como inteiro e limita o intervalo de R$ 1,00 a R$ 100.000,00.

27. **Validação de restaurante via metadata**  
    A criação do pagamento exige `metadata.restaurantId`, usado para localizar a conta conectada destino.

28. **Destination charge para repasse ao restaurante**  
    O `PaymentIntent` usa `transfer_data.destination`, enviando o valor para a conta conectada do restaurante.

29. **Taxa de plataforma configurável**  
    Implementada leitura de `STRIPE_PLATFORM_FEE_BPS`, permitindo reter taxa da plataforma via `application_fee_amount`.

30. **Proteção contra taxa maior que o pedido**  
    A função evita aplicar taxa de plataforma se o valor calculado for maior ou igual ao total do pedido.

31. **Consulta em tempo real da conta antes de cobrar**  
    Antes de criar o pagamento, o backend consulta a conta conectada e confirma se `charges_enabled` está ativo.

32. **Erro explícito quando restaurante não pode cobrar**  
    Se a conta não estiver apta, o backend retorna erro orientando concluir o cadastro Stripe.

33. **Suporte a cartão salvo com cobrança off-session**  
    O checkout permite cobrar um `paymentMethodId` salvo, confirmando o PaymentIntent no backend.

34. **Tratamento de autenticação adicional 3DS**  
    Se a cobrança com cartão salvo exigir ação do cliente, o frontend usa `confirmCardPayment` com o `client_secret`.

35. **Criação e reutilização de Stripe Customer para usuário delivery**  
    A função `ensureDeliveryStripeCustomer` cria ou recupera customer pelo `deliveryUserId`.

36. **Busca de customer existente por metadata**  
    Antes de criar novo customer, o backend pesquisa `metadata.deliveryUserId` para evitar duplicação.

37. **Persistência do `stripeCustomerId` no usuário delivery**  
    O frontend salva o customer no usuário para reaproveitar em compras futuras.

38. **SetupIntent para salvar cartão sem cobrança imediata**  
    Implementado `createDeliverySetupIntent` para cadastrar cartão do cliente com `usage: 'off_session'`.

39. **Restrição do SetupIntent para cartão**  
    O SetupIntent usa `payment_method_types: ['card']` para evitar métodos como Link confundindo o login do app.

40. **Listagem de cartões salvos**  
    Implementada função para listar PaymentMethods do tipo `card` ligados ao customer.

41. **Exibição de bandeira, final e validade do cartão**  
    O frontend recebe dados como brand, last4, mês e ano de expiração para exibir cartões salvos.

42. **Remoção de cartão salvo**  
    Implementado `removeDeliverySavedCard`, que desanexa o PaymentMethod do customer na Stripe.

43. **Atualização da UI após remover cartão**  
    O checkout remove o cartão da lista local e limpa a seleção se o cartão removido estava selecionado.

44. **Pagamento com PIX online via Stripe**  
    O checkout suporta `stripe-pix`, criando PaymentIntent em BRL e confirmando com `confirmPixPayment`.

45. **Restrição do PIX para BRL**  
    O frontend e backend validam que PIX online só funciona em reais.

46. **Tela de espera do PIX**  
    O checkout tem estado `pix-wait`, com QR Code, código copia e cola, link hospedado e mensagem de polling.

47. **Polling do PaymentIntent do PIX**  
    O frontend consulta periodicamente `retrievePaymentIntent` para detectar pagamento PIX concluído.

48. **Criação automática do pedido após confirmação do PIX**  
    Quando o PaymentIntent do PIX fica `succeeded`, o pedido é criado com `paymentMethod: 'stripe'`.

49. **Registro do `stripePaymentIntentId` no pedido**  
    Pedidos pagos via Stripe recebem o ID do PaymentIntent para rastreabilidade financeira.

50. **Fallback para formas de pagamento offline**  
    Mesmo sem Stripe ativo, o cliente pode continuar usando dinheiro, PIX na entrega, crédito na entrega ou débito na entrega.

51. **Fluxo de erro de pagamento centralizado no checkout**  
    O checkout apresenta mensagens traduzidas para Stripe não configurado, pagamento recusado, PIX inválido ou Connect pendente.

52. **Traduções relacionadas a Stripe**  
    Foram adicionadas mensagens em arquivos de locale para estados de Stripe, PIX e pagamento online.

53. **Uso de Cloud Functions como fronteira segura**  
    Secret key da Stripe fica apenas no backend via Firebase Functions Secret, não no bundle do navegador.

54. **Uso de publishable key apenas no frontend**  
    O frontend usa somente `VITE_STRIPE_PUBLISHABLE_KEY`, adequada para Stripe.js.

55. **Tratamento de erros Stripe no backend**  
    As funções usam utilitários de tradução de erro para converter falhas Stripe em erros compreensíveis para o app.

56. **Senha do restaurante antes de ações sensíveis do Connect**  
    As chamadas de onboarding e sync exigem email e senha do restaurante antes de falar com a Stripe.

57. **Validação da senha com bcrypt**  
    O backend compara a senha informada com hash salvo no Firestore, preservando o padrão de autenticação do restaurante.

58. **Compatibilidade com senha demo padrão**  
    Existe fallback para `123456` quando restaurante antigo ainda não tem hash salvo.

59. **Separação entre status de cadastro e status de cobrança**  
    A UI diferencia “cadastro enviado” de “cobranças ativas”, evitando falsa impressão de que já está pronto para cobrar.

60. **Melhoria de UX para explicar bloqueio do checkout**  
    O painel informa que o pagamento pelo app só aparece para clientes quando a Stripe confirmar cobranças ativas.

61. **Correção da ordem de preenchimento de endereço**  
    O formulário de endereço do cliente foi reordenado para: cidade, bairro, rua, número e complemento.

62. **Novo formato textual de endereço salvo**  
    Endereços agora são montados como `Cidade: ..., Bairro: ..., Rua: ..., Número: ..., Complemento: ...`.

63. **Compatibilidade básica com endereços antigos**  
    A função de parsing ainda tenta interpretar endereços antigos sem rótulos.

64. **Histórico de endereços do cliente**  
    O checkout mantém últimos endereços no `localStorage`, com limite e remoção de duplicados.

65. **Validação mínima de endereço antes de pagamento**  
    O checkout exige nome, telefone, rua, número, bairro e cidade antes de avançar para pagamento.

66. **Impacto financeiro protegido por status Connect**  
    A aplicação evita criar cobranças para conta sem `charges_enabled`, reduzindo risco operacional.

67. **Diagnóstico operacional para suporte**  
    Os campos de `disabled_reason` e pendências permitem orientar o restaurante sem depender apenas do Dashboard Stripe.

68. **Preparação para múltiplos restaurantes**  
    O modelo salva status e conta Stripe por documento de restaurante, permitindo que cada loja tenha seu próprio Connect.

69. **Preparação para repasse por restaurante no PaymentIntent**  
    O destino financeiro é resolvido por `restaurantId`, mantendo isolamento entre restaurantes.

70. **Configuração explícita de região das Functions**  
    As funções rodam em `us-central1`, mantendo endpoint consistente para o frontend.

71. **Permissão pública controlada nas callable functions**  
    As funções usam `invoker: 'public'`, mas validam dados e senha quando a ação envolve restaurante.

72. **Atualização de status no Firestore a cada sync ou tentativa de pagamento**  
    O backend atualiza flags Connect quando sincroniza manualmente e quando resolve destino para pagamento.

73. **Mensagens de deploy e configuração operacional**  
    O painel orienta quando functions, secrets ou configuração Stripe precisam ser revisadas.

74. **Melhoria na experiência pós-onboarding**  
    O fluxo retorna o usuário para a aba de delivery nas configurações, reduzindo perda de contexto.

75. **Controle de disponibilidade de pagamento online por restaurante**  
    A prop `onlineCardPaymentsEnabled` controla se o checkout exibirá opções Stripe para aquele restaurante.

76. **Proteção contra estado de pagamento inválido**  
    Se o Connect ficar inativo enquanto uma opção Stripe está selecionada, o checkout limpa a seleção.

77. **Suporte a cliente logado para salvar cartão**  
    O checkout exige usuário autenticado para salvar e reutilizar cartão.

78. **Suporte a PIX para cliente convidado**  
    O fluxo PIX consegue criar billing details com email derivado do telefone quando não há email real.

79. **Cópia de código PIX e QR Code**  
    O checkout exibe dados retornados pela Stripe para facilitar pagamento via banco.

80. **Rastreabilidade entre pedido e pagamento**  
    A metadata do PaymentIntent inclui restaurante e informações resumidas, e o pedido guarda o ID do pagamento.

## Arquivos principais envolvidos

- `functions/src/stripeRestaurantConnect.ts` — criação de conta Connect, Account Link, sync de status, diagnóstico de pendências e resolução de destino/fee.
- `functions/src/index.ts` — criação de PaymentIntent, Customer, SetupIntent, listagem e remoção de cartões.
- `functions/src/stripeClient.ts` — inicialização segura da Stripe com secret do Firebase Functions.
- `src/services/restaurantStripeConnectService.ts` — chamadas frontend para onboarding e sync do Connect.
- `src/services/deliveryStripeService.ts` — chamadas frontend para pagamento, customer, cartões e helpers.
- `src/components/delivery/CheckoutFlow.tsx` — fluxo de checkout, endereço, cartão salvo, novo cartão, PIX e bloqueio por Connect.
- `src/pages/Settings.tsx` — painel de configuração do restaurante, card de Stripe Connect, status e diagnóstico.
- `src/services/restaurantService.ts` — leitura dos campos Stripe Connect no modelo de restaurante.
- `src/types/restaurant.ts` — tipagem dos campos Stripe Connect.
- `vite.config.ts` e `package.json` — separação de build web e build Capacitor.
- `src/locales/*.json` — mensagens de pagamento e Stripe para a interface.

## Estado atual da regra de liberação do checkout

O pagamento pelo app depende do seguinte contrato:

1. Restaurante precisa ter `stripeConnectAccountId`.
2. Restaurante precisa ter enviado o cadastro (`stripeConnectDetailsSubmitted === true`).
3. A Stripe precisa retornar `charges_enabled === true`.
4. O Firestore precisa refletir isso em `stripeConnectChargesEnabled === true`.
5. O checkout só mostra/permite opções Stripe quando `onlineCardPaymentsEnabled` é verdadeiro.

Enquanto `stripeConnectChargesEnabled` estiver `false`, o app mantém o pagamento online bloqueado e orienta o cliente a usar pagamento na entrega.

## Configurações necessárias

- `STRIPE_SECRET_KEY` deve estar configurada como secret das Cloud Functions.
- `VITE_STRIPE_PUBLISHABLE_KEY` deve estar configurada no frontend.
- `PUBLIC_APP_URL` deve apontar para a origem pública do app, sem path.
- `STRIPE_PLATFORM_FEE_BPS` pode ser configurada para taxa de plataforma.
- As Cloud Functions precisam ser implantadas após mudanças de backend.
- A Netlify precisa publicar o build gerado em `dist`.

## Pontos de atenção

- `Cadastro: enviado` não significa que o restaurante já pode cobrar. A liberação real depende de `Cobranças: ativas`.
- O modo teste da Stripe pode exigir ativação/configuração do Connect na conta plataforma.
- A Stripe pode manter `charges_enabled=false` por pendências de verificação, requisitos bancários ou dados do responsável.
- A integração atual usa `payment_method_types: ['pix']` para PIX, o que é intencional para forçar PIX; para cartão interativo usa `automatic_payment_methods`.
- O lint completo do projeto possui débitos anteriores não relacionados à integração Stripe.

## Próximos passos recomendados

1. Testar o fluxo completo com um restaurante que esteja com `Cobranças: ativas`.
2. Validar cartão de teste `4242 4242 4242 4242`.
3. Validar cartão com 3DS em modo teste.
4. Validar PIX em modo teste e confirmar criação automática do pedido.
5. Conferir no Dashboard Stripe se o PaymentIntent mostra o destino da conta conectada.
6. Documentar para o restaurante o que fazer quando aparecer `Cobranças: inativas`.
7. Considerar webhook Stripe para confirmação de PIX e pagamentos assíncronos em produção.
8. Considerar tela administrativa para suporte visualizar `disabled_reason`, `requirementsSummary` e ID da conta conectada.
