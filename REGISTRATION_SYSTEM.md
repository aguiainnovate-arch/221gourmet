# Sistema de Links de Cadastro de Restaurantes

Este documento descreve o sistema de geração de links privados para cadastro de novos restaurantes.

## 📋 Visão Geral

O sistema permite que o administrador do sistema (owner) gere links únicos e temporários para cadastro de novos restaurantes. Cada link está vinculado a um plano específico e suas respectivas permissões.

## 🎯 Fluxo de Funcionamento

### 1. Geração do Link (Owner)

1. O owner acessa o painel administrativo
2. Vai para "Links de Cadastro" no menu lateral ou clica em "Gerar Link de Cadastro" no dashboard
3. Abre o modal de geração de link
4. Seleciona:
   - **Plano**: Define qual plano o restaurante terá
   - **Validade**: Quantos dias o link ficará ativo (padrão: 7 dias)
   - **Notas**: Informações internas sobre para quem o link foi criado
5. Clica em "Gerar Link"
6. Copia o link gerado e envia para o dono do restaurante

### 2. Gerenciamento de Links

Na página "Links de Cadastro", o owner pode:
- Ver todos os links gerados
- Filtrar por status:
  - **Ativos**: Links não usados e ainda válidos
  - **Usados**: Links já utilizados para criar restaurantes
  - **Expirados**: Links não usados que passaram da data de validade
- Ver estatísticas (total, ativos, usados, expirados)
- Copiar links ativos novamente

### 3. Uso do Link (Dono do Restaurante)

> ✅ **Nota**: A página de validação de token está implementada. O formulário de cadastro será implementado na próxima etapa.

O fluxo atual:
1. Dono do restaurante recebe o link
2. Acessa o link no navegador
3. Sistema valida o token:
   - Verifica se existe
   - Verifica se não foi usado
   - Verifica se não expirou
4. Exibe formulário de cadastro do restaurante
5. Ao completar o cadastro:
   - Cria o restaurante no banco de dados
   - Vincula ao plano definido no token
   - Marca o token como usado
   - Registra o ID do restaurante criado

## 🗄️ Estrutura do Banco de Dados

### Coleção: `registrationTokens`

Cada documento na coleção contém:

```typescript
{
  id: string;                    // ID do documento no Firestore
  token: string;                 // Token único (gerado automaticamente)
  planId: string;                // ID do plano selecionado
  planName?: string;             // Nome do plano (para exibição)
  expiresAt: Timestamp;          // Data/hora de expiração
  used: boolean;                 // Se o token já foi usado
  usedAt?: Timestamp;            // Quando foi usado
  restaurantId?: string;         // ID do restaurante criado com este token
  createdAt: Timestamp;          // Data/hora de criação
  createdBy: string;             // Email/ID do admin que criou
  metadata?: {
    notes?: string;              // Notas internas
  }
}
```

## 📁 Arquivos Implementados

### Tipos

- **`src/types/registrationToken.ts`**: Define os tipos TypeScript para tokens de registro

### Serviços

- **`src/services/registrationTokenService.ts`**: Funções para manipular tokens no Firebase
  - `createRegistrationToken()`: Cria um novo token
  - `getRegistrationTokens()`: Busca todos os tokens
  - `getActiveTokens()`: Busca apenas tokens ativos
  - `validateToken()`: Valida um token (para uso na página de cadastro)
  - `markTokenAsUsed()`: Marca token como usado após cadastro
  - `generateRegistrationUrl()`: Gera a URL completa do link

### Componentes

- **`src/components/GenerateRegistrationLinkModal.tsx`**: Modal para gerar novos links
  - Seleção de plano
  - Definição de validade
  - Adição de notas
  - Cópia do link gerado

### Páginas

- **`src/pages/owner/RegistrationLinks.tsx`**: Página de gerenciamento de links
  - Lista todos os tokens
  - Filtros por status
  - Estatísticas
  - Ação para copiar links ativos

- **`src/pages/Owner.tsx`**: Página principal do owner (atualizada)
  - Dashboard com card de ação rápida para gerar links
  - Integração com nova seção de links de cadastro

- **`src/pages/Register.tsx`**: Página pública de registro ✅
  - Validação de token
  - Feedback visual de token válido/inválido/expirado
  - Estrutura pronta para formulário de cadastro

### Menu & Rotas

- **`src/components/AdminSidebar.tsx`**: Sidebar do admin (atualizada)
  - Novo item de menu "Links de Cadastro"

- **`src/App.tsx`**: Rotas atualizadas
  - Nova rota pública: `/register/:token`

## 🔐 Segurança

### Geração de Tokens

Os tokens são gerados usando:
- Timestamp atual (convertido para base36)
- String aleatória
- Formato: `{timestamp}-{random}`

Exemplo: `l7x8y9z-abc123def456`

### Validações

O sistema valida:
1. **Existência**: O token existe no banco de dados?
2. **Uso único**: O token já foi usado?
3. **Expiração**: O token ainda está dentro da validade?

### Permissões

- Apenas usuários autenticados como owner podem:
  - Gerar novos links
  - Visualizar links existentes
  - Acessar a página de gerenciamento

## 🚀 Próximos Passos

### Formulário de Cadastro (A Implementar)

A página `/register/:token` já existe e valida o token. Falta implementar:

1. ~~**Rota pública**: `/register/:token`~~ ✅ Implementada
2. ~~**Página de cadastro**: `src/pages/Register.tsx`~~ ✅ Implementada
3. ~~**Validação do token**: Ao carregar a página~~ ✅ Implementada
4. **Formulário de cadastro**: Com campos:
   - Nome do restaurante
   - Email
   - Telefone
   - Endereço
   - Senha (para acesso futuro)
   - Logo (opcional)
5. **Criação do restaurante**: Ao submeter o formulário
6. **Marcação do token**: Como usado após sucesso

### Melhorias Futuras

- [ ] Notificações por email ao gerar link
- [ ] Renovação de links expirados
- [ ] Invalidação manual de links ativos
- [ ] Histórico de tentativas de uso de tokens inválidos
- [ ] Integração com sistema de notificações
- [ ] Página de boas-vindas após cadastro
- [ ] Sistema de onboarding para novos restaurantes

## 🎨 Interface

### Dashboard do Owner

O dashboard agora inclui um card de "Ação Rápida" destacado para gerar links de cadastro, facilitando o acesso rápido a esta funcionalidade importante.

### Página de Links de Cadastro

Inclui:
- **Estatísticas em cards**: Visão rápida do status dos links
- **Filtros**: Para facilitar navegação
- **Tabela completa**: Com todas as informações dos tokens
- **Ações rápidas**: Copiar link com um clique
- **Status visual**: Badges coloridos indicando o estado de cada token

## 📝 Exemplo de Uso

```typescript
// Gerar um novo token
const token = await createRegistrationToken({
  planId: 'plan-premium-id',
  expiresIn: 7, // 7 dias
  metadata: {
    notes: 'Link para Restaurante XYZ - Contato: João Silva'
  }
}, 'admin@example.com');

// Gerar URL completa
const url = generateRegistrationUrl(token.token);
// Resultado: https://seudominio.com/register/l7x8y9z-abc123def456

// Validar token (na página de cadastro)
const validation = await validateToken('l7x8y9z-abc123def456');
if (validation.valid) {
  // Exibir formulário de cadastro
  // Usar validation.token.planId para vincular ao plano correto
}

// Marcar como usado após criar restaurante
await markTokenAsUsed(token.id, 'novo-restaurante-id');
```

## 🔍 Monitoramento

O owner pode monitorar:
- Quantos links foram gerados
- Quantos foram usados com sucesso
- Quantos expiraram sem uso
- Quando cada link foi criado e usado
- Para qual plano cada link foi configurado

---

**Status**: 
- ✅ Sistema de geração de links
- ✅ Gerenciamento de tokens
- ✅ Página de validação de token
- ⏳ Formulário de cadastro (próximo passo)

**Versão**: 1.1
**Data**: 2025

