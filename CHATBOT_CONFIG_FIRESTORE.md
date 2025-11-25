# 🔥 Configuração do Chatbot - Migração para Firestore

## 📋 O Que Mudou

As configurações do chatbot agora são salvas no **Firestore** (banco de dados) em vez do localStorage do navegador.

### ✅ Vantagens

- **Persistente** - Configurações salvas permanentemente no banco
- **Global** - Mesmas configurações em todos os dispositivos/navegadores
- **Centralizado** - Uma única fonte de verdade
- **Sem dependência do navegador** - Funciona independente de cookies/cache
- **Compartilhado** - Todos os admins veem as mesmas configurações

### ❌ Antes (localStorage)

```
Salvava no navegador
❌ Perdia ao limpar cache
❌ Diferente em cada dispositivo
❌ Apenas local
```

### ✅ Agora (Firestore)

```
Salva no banco de dados
✅ Persiste permanentemente
✅ Mesmo em todos os dispositivos
✅ Acessível globalmente
```

## 🗄️ Estrutura no Firestore

### Coleção: `settings`
### Documento: `global-chatbot-config`

```json
{
  "greeting": "Olá! 👋 Sou seu assistente virtual...",
  "tone": "friendly",
  "showCardsThreshold": "conservative",
  "customRules": "Sempre mencionar opções vegetarianas\nPriorizar entrega grátis",
  "updatedAt": "2025-01-15T10:30:00.000Z"
}
```

### Campos

| Campo | Tipo | Valores Possíveis | Padrão |
|-------|------|-------------------|--------|
| `greeting` | string | Qualquer texto | "Olá! 👋 Sou seu..." |
| `tone` | string | `friendly`, `professional`, `enthusiastic` | `friendly` |
| `showCardsThreshold` | string | `conservative`, `balanced`, `eager` | `conservative` |
| `customRules` | string | Texto livre (regras separadas por \n) | "" |
| `updatedAt` | timestamp | Data/hora da última atualização | Auto |

## 📁 Arquivos Criados/Modificados

### 1. **`src/services/chatbotConfigService.ts`** ⭐ NOVO

Serviço dedicado para gerenciar configurações do chatbot:

```typescript
// Funções disponíveis:
saveChatbotConfig(config)  // Salvar no Firestore
getChatbotConfig()         // Carregar do Firestore
resetChatbotConfig()       // Resetar para padrão
```

### 2. **`src/pages/owner/AIConfiguration.tsx`** ✏️ MODIFICADO

- Agora usa `saveChatbotConfig()` em vez de localStorage
- Carrega configurações do Firestore ao montar
- Mensagens de sucesso/erro atualizadas

### 3. **`src/components/AIRestaurantChat.tsx`** ✏️ MODIFICADO

- Carrega saudação do Firestore ao iniciar
- Remove dependência do localStorage
- Usa `getChatbotConfig()` assíncrono

### 4. **`src/services/openaiService.ts`** ✏️ MODIFICADO

- Carrega configurações do Firestore antes de chamar a AI
- Aplica tom de voz e regras personalizadas
- Import dinâmico para evitar circular dependency

### 5. **`firestore.rules`** ✏️ ATUALIZADO

- Coleção `settings` já tem permissões de leitura/escrita

## 🚀 Como Usar

### Salvar Configurações

1. Acesse `/owner` → Configuração de IA
2. Role até "Configuração do Chatbot"
3. Configure os campos
4. Clique em "Salvar Configurações do Chatbot"
5. **✅ Salvo no Firestore automaticamente**

### Carregar Configurações

- **Automático** ao acessar a página `/owner`
- **Automático** ao abrir o chatbot
- **Automático** ao fazer recomendações da AI

### Ver no Firestore

1. Acesse o Firebase Console
2. Vá em Firestore Database
3. Navegue para coleção `settings`
4. Abra documento `global-chatbot-config`

## 🔄 Fluxo de Dados

### Salvamento

```
1. Usuário preenche formulário em /owner
2. Clica em "Salvar"
3. chatbotConfigService.saveChatbotConfig()
4. setDoc() no Firestore
5. Documento salvo em settings/global-chatbot-config
6. ✅ Confirmação exibida
```

### Carregamento

```
1. Página/componente carrega
2. chatbotConfigService.getChatbotConfig()
3. getDoc() do Firestore
4. Retorna configuração ou padrão
5. Estado atualizado
6. UI renderiza com configurações
```

### Uso pela AI

```
1. Usuário envia mensagem no chat
2. recommendRestaurants() é chamado
3. getChatbotConfig() busca configurações
4. Configurações injetadas no prompt
5. OpenAI processa com regras personalizadas
6. Resposta retornada
```

## 🔐 Segurança

### Firestore Rules

```javascript
match /settings/{document} {
  allow read: if true;   // Qualquer um pode ler
  allow write: if true;  // Qualquer um pode escrever (ajustar em produção)
}
```

### ⚠️ Produção

Em produção, ajuste as regras para:

```javascript
match /settings/{document} {
  allow read: if true;   // OK - configurações são públicas
  allow write: if request.auth != null && request.auth.token.admin == true;
  // Apenas admins autenticados podem escrever
}
```

## 🧪 Testes

### Teste 1: Salvar Configuração

```
1. Acesse /owner
2. Vá em Configuração de IA
3. Mude "Mensagem de Boas-Vindas"
4. Clique em Salvar
5. Veja "✅ salva com sucesso no banco de dados"
6. Verifique no Firebase Console
```

### Teste 2: Carregar em Outro Dispositivo

```
1. Salve configuração no dispositivo A
2. Abra em dispositivo B ou navegador diferente
3. Acesse /owner → Configuração de IA
4. Configurações devem estar lá ✅
```

### Teste 3: Chatbot Usa Configurações

```
1. Configure saudação: "Oi! 🎉"
2. Configure tom: "Entusiasmado"
3. Salve
4. Abra /delivery
5. Abra chatbot
6. Veja "Oi! 🎉" como primeira mensagem
7. Respostas devem ser entusiasmadas
```

## 🐛 Troubleshooting

### Erro ao Salvar

```
❌ "Erro ao salvar configuração do chatbot"

Possíveis causas:
- Sem conexão com internet
- Firebase não configurado
- Permissões do Firestore incorretas

Solução:
1. Verifique conexão
2. Confirme firebase.ts configurado
3. Verifique firestore.rules
```

### Configuração Não Carrega

```
Sintoma: Sempre usa configuração padrão

Causas:
- Documento não existe no Firestore
- Erro ao buscar documento

Solução:
1. Abra Firebase Console
2. Crie documento manualmente se necessário
3. Verifique console do navegador por erros
```

### Chatbot Não Usa Novas Configurações

```
Sintoma: Mudanças não aparecem no chat

Solução:
1. Feche o chatbot completamente
2. Recarregue a página (F5)
3. Abra o chatbot novamente
4. Configurações devem estar atualizadas
```

## 📊 Migração de Dados

### Se Tinha Configurações no localStorage

As configurações antigas do localStorage **não** são migradas automaticamente.

Para migrar manualmente:

1. Abra DevTools (F12)
2. Vá em Application → Local Storage
3. Procure por `chatbot-config`
4. Copie os valores
5. Acesse `/owner` → Configuração de IA
6. Cole os valores
7. Salve (agora vai para o Firestore)

## 💡 Dicas

### Performance

- Configurações são carregadas **uma vez** ao montar componentes
- Cache automático durante a sessão
- Sem chamadas repetidas ao Firestore

### Desenvolvimento

```javascript
// Para testar com configuração específica:
const testConfig = {
  greeting: "TESTE!",
  tone: "professional",
  showCardsThreshold: "eager",
  customRules: "Sempre dizer TESTE"
};

await saveChatbotConfig(testConfig);
```

### Resetar para Padrão

```javascript
// Via código:
import { resetChatbotConfig } from './services/chatbotConfigService';
await resetChatbotConfig();

// Ou apague o documento manualmente no Firebase Console
```

## 🔄 Rollback (Se Necessário)

Para voltar ao localStorage (não recomendado):

1. Reverta os commits
2. Ou restaure os arquivos originais
3. Configurações antigas do localStorage ainda estarão lá

## 📈 Próximos Passos

Possíveis melhorias futuras:

- [ ] Cache com TTL para reduzir leituras do Firestore
- [ ] Histórico de mudanças (auditoria)
- [ ] Múltiplos perfis de configuração
- [ ] A/B testing de configurações
- [ ] Configurações específicas por restaurante
- [ ] Interface de preview antes de salvar

---

**✅ Configurações agora são globais e persistentes no Firestore!**

