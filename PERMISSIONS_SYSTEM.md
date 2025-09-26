# Sistema de Permissões

Este documento descreve o sistema de permissões implementado no 221gourmet.

## Visão Geral

O sistema de permissões permite controlar funcionalidades específicas por restaurante e por plano. Atualmente, está implementada a permissão de **Tradução Automática de Cardápio**.

## Estrutura do Sistema

### 1. Tipos de Permissão

As permissões são definidas em `src/types/permission.ts`:

```typescript
export type PermissionKey = 'automaticTranslation';

export const PERMISSION_DEFINITIONS: Record<PermissionKey, { name: string; description: string }> = {
  automaticTranslation: {
    name: 'Tradução Automática de Cardápio',
    description: 'Permite tradução automática de produtos e categorias usando IA'
  }
};
```

### 2. Coleções do Firestore

O sistema utiliza duas coleções principais:

- **`restaurantPermissions`**: Armazena as permissões específicas de cada restaurante
- **`planPermissions`**: Armazena as permissões padrão de cada plano

### 3. Estrutura dos Documentos

#### restaurantPermissions
```typescript
{
  restaurantId: string;
  permissions: Record<PermissionKey, boolean>;
  updatedAt: Timestamp;
}
```

#### planPermissions
```typescript
{
  planId: string;
  permissions: Record<PermissionKey, boolean>;
  updatedAt: Timestamp;
}
```

## Funcionalidades

### 1. Gerenciamento de Permissões por Restaurante

- **Localização**: `src/pages/admin/Permissions.tsx`
- **Funcionalidade**: Permite ativar/desativar permissões específicas para cada restaurante
- **Integração**: Conectado ao banco de dados Firestore

### 2. Gerenciamento de Permissões por Plano

- **Localização**: `src/pages/admin/Plans.tsx`
- **Funcionalidade**: Permite definir quais permissões cada plano inclui
- **Aplicação Automática**: Quando um restaurante é associado a um plano, as permissões do plano são aplicadas automaticamente

### 3. Aplicação Automática de Permissões

- **Criação de Restaurante**: Permissões do plano são aplicadas automaticamente
- **Mudança de Plano**: Permissões do novo plano são aplicadas automaticamente
- **Atualização de Plano**: Permissões são aplicadas a todos os restaurantes do plano

## Serviços

### permissionService.ts

Principais funções:

- `getRestaurantPermissions(restaurantId)`: Busca permissões de um restaurante
- `updateRestaurantPermissions(restaurantId, permissions)`: Atualiza permissões de um restaurante
- `getPlanPermissions(planId)`: Busca permissões de um plano
- `updatePlanPermissions(planId, permissions)`: Atualiza permissões de um plano
- `applyPlanPermissionsToRestaurants(planId)`: Aplica permissões do plano a todos os restaurantes
- `hasRestaurantPermission(restaurantId, permission)`: Verifica se um restaurante tem uma permissão específica

## Migração de Dados

### Scripts de Migração

Para restaurantes e planos existentes, execute:

```bash
# Executar migração de permissões
npm run migrate-permissions
```

Ou importe e execute manualmente:

```typescript
import { runAllPermissionMigrations } from './src/utils/migratePermissions';

await runAllPermissionMigrations();
```

### O que a migração faz:

1. **Planos**: Cria permissões padrão (todas desabilitadas) para planos existentes
2. **Restaurantes**: Cria permissões padrão (todas desabilitadas) para restaurantes existentes

## Como Usar

### 1. Verificar Permissão de um Restaurante

```typescript
import { hasRestaurantPermission } from './src/services/permissionService';

const canTranslate = await hasRestaurantPermission('restaurant-id', 'automaticTranslation');
if (canTranslate) {
  // Executar tradução automática
}
```

### 2. Atualizar Permissões de um Restaurante

```typescript
import { updateRestaurantPermissions } from './src/services/permissionService';

await updateRestaurantPermissions('restaurant-id', {
  automaticTranslation: true
});
```

### 3. Criar um Plano com Permissões

```typescript
import { addPlan } from './src/services/planService';
import { updatePlanPermissions } from './src/services/permissionService';

const plan = await addPlan({
  name: 'Premium',
  description: 'Plano premium com tradução automática',
  price: 99.90,
  period: 'monthly',
  features: ['Tradução automática', 'Suporte prioritário'],
  maxTables: 50,
  maxProducts: 200,
  supportLevel: 'priority',
  active: true
});

await updatePlanPermissions(plan.id, {
  automaticTranslation: true
});
```

## Adicionando Novas Permissões

Para adicionar uma nova permissão:

1. **Atualizar tipos** em `src/types/permission.ts`:
```typescript
export type PermissionKey = 'automaticTranslation' | 'novaPermissao';

export const PERMISSION_DEFINITIONS: Record<PermissionKey, { name: string; description: string }> = {
  automaticTranslation: {
    name: 'Tradução Automática de Cardápio',
    description: 'Permite tradução automática de produtos e categorias usando IA'
  },
  novaPermissao: {
    name: 'Nova Permissão',
    description: 'Descrição da nova permissão'
  }
};

export const DEFAULT_PERMISSIONS: Record<PermissionKey, boolean> = {
  automaticTranslation: false,
  novaPermissao: false
};
```

2. **Atualizar interfaces** em `src/types/restaurant.ts` e `src/types/plan.ts` se necessário

3. **Executar migração** para atualizar dados existentes

## Considerações de Segurança

- As permissões são verificadas no backend antes de executar funcionalidades sensíveis
- Mudanças de permissões requerem confirmação do administrador
- Logs de alterações são mantidos no Firestore

## Monitoramento

- Todas as alterações de permissões são registradas com timestamp
- Logs de erro são capturados e podem ser monitorados
- O sistema é resiliente a falhas (não bloqueia operações principais se houver erro nas permissões)
