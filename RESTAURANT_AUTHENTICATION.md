# Sistema de Autenticação de Restaurantes

Este documento descreve o sistema de autenticação implementado para proteger o acesso às configurações dos restaurantes.

## 📋 Resumo

Cada restaurante agora possui uma senha criptografada que é necessária para acessar a página `/settings`. O sistema utiliza bcrypt para criptografar as senhas no banco de dados.

## 🔐 Componentes Principais

### 1. Tipos e Interfaces (`src/types/restaurant.ts`)
- Adicionado campo `password: string` ao tipo `Restaurant`
- Adicionado campo `password: string` aos tipos `CreateRestaurantData` e `UpdateRestaurantData`

### 2. Contexto de Autenticação (`src/contexts/RestaurantAuthContext.tsx`)
- Gerencia o estado de autenticação do restaurante
- Salva sessão no localStorage (expira em 24 horas)
- Verifica senha usando bcrypt
- Métodos: `login()`, `logout()`, `isAuthenticated`, `currentRestaurantId`

### 3. Modal de Login (`src/components/RestaurantLoginModal.tsx`)
- Interface para login com email e senha
- Validação de credenciais
- Feedback de erros

### 4. Proteção da Rota (`src/pages/Settings.tsx`)
- Verifica autenticação ao carregar
- Exibe modal de login se não autenticado
- Redireciona para página anterior se usuário cancelar

## 📝 Fluxo de Cadastro

### Novo Restaurante (via link de cadastro)
1. Usuário acessa `/register/:token`
2. Preenche formulário incluindo campo de senha
3. Senha é criptografada com bcrypt (10 rounds)
4. Restaurante é salvo no Firestore com senha criptografada

### Restaurantes Existentes
Para atualizar restaurantes que já existem no banco com a senha padrão "123456":

#### Via Console do Navegador:
1. Abra a aplicação no navegador
2. Abra o console (F12)
3. Execute:
```javascript
import('./scripts/updateRestaurantsPassword').then(m => m.updateExistingRestaurantsWithPassword());
```

#### Via Script
Ou use o helper:
```javascript
import('./scripts/initializeRestaurantsPassword').then(m => m.runUpdate());
```

## 🔑 Acesso às Configurações

1. Usuário acessa `/settings` ou `/testing/settings` ou `/test/:restaurantSlug/settings`
2. Sistema verifica se há sessão ativa válida
3. Se não autenticado, exibe modal de login
4. Usuário insere email do restaurante e senha
5. Sistema busca restaurante pelo email no Firestore
6. Sistema verifica senha com bcrypt.compare()
7. Se válido, cria sessão (24h) e permite acesso
8. Usuário pode fazer logout a qualquer momento

## 🛡️ Segurança

- **Criptografia**: Senhas são criptografadas com bcrypt (10 rounds)
- **Sessão**: Sessões expiram em 24 horas
- **Validação**: Verificação de senha no cliente usando bcrypt.compare()
- **Proteção de Rotas**: Todas as rotas `/settings` estão protegidas

## ⚙️ Configuração

### Variáveis de Ambiente
Não há variáveis de ambiente específicas para este sistema.

### Dependências
- `bcryptjs`: Criptografia de senhas
- `@types/bcryptjs`: Tipos TypeScript

Instalação:
```bash
npm install bcryptjs
npm install --save-dev @types/bcryptjs
```

## 📦 Arquivos Modificados

- `src/types/restaurant.ts` - Adicionado campo password
- `src/services/restaurantService.ts` - Suporte ao campo password
- `src/contexts/RestaurantAuthContext.tsx` - Novo contexto
- `src/components/RestaurantLoginModal.tsx` - Novo componente
- `src/pages/Settings.tsx` - Proteção de rota
- `src/pages/Register.tsx` - Campo de senha no cadastro
- `src/App.tsx` - Provider de autenticação
- `src/scripts/updateRestaurantsPassword.ts` - Script de migração
- `src/scripts/initializeRestaurantsPassword.ts` - Helper de migração

## 🔄 Migração de Dados

### Script de Atualização
O script `updateRestaurantsPassword.ts` realiza:
1. Busca todos os restaurantes no Firestore
2. Para cada restaurante sem senha:
   - Criptografa senha padrão "123456"
   - Atualiza documento no Firestore
3. Pula restaurantes que já possuem senha
4. Exibe resumo da operação

### Senha Padrão
- **Senha**: `123456`
- **Uso**: Apenas para restaurantes existentes sem senha
- **Recomendação**: Pedir para restaurantes alterarem senha após primeiro login

## 📚 Uso

### Para Desenvolvedores
```typescript
import { useRestaurantAuth } from '../contexts/RestaurantAuthContext';

function MyComponent() {
  const { isAuthenticated, login, logout, currentRestaurantId } = useRestaurantAuth();
  
  // ... usar contexto
}
```

### Para Usuários (Restaurantes)
1. Acesse as configurações do restaurante
2. Faça login com email e senha
3. Gerencie o restaurante
4. Faça logout quando terminar

## ⚠️ Notas Importantes

1. Execute o script de migração APENAS UMA VEZ após deploy
2. Senhas são criptografadas e não podem ser recuperadas
3. Sessões expiram em 24 horas por segurança
4. O sistema protege todas as rotas `/settings`
5. Email é case-insensitive na autenticação

## 🐛 Troubleshooting

### "Email ou senha incorretos"
- Verifique se o email está correto
- Verifique se a senha foi definida (restaurantes antigos precisam do script)
- Verifique no Firestore se o campo `password` existe

### Sessão expira muito rápido
- Sessões duram 24 horas
- Limpar cache do navegador pode remover sessão

### Script de migração não funciona
- Verifique conexão com Firestore
- Verifique permissões no Firestore Rules
- Verifique console para erros

## 🔮 Futuras Melhorias

- Recuperação de senha via email
- Alteração de senha dentro do sistema
- Autenticação de dois fatores (2FA)
- Histórico de acessos
- Diferentes níveis de permissão (admin, editor, etc.)

