# 🔥 Configuração de Índices do Firestore

## Problema Identificado
O Firestore precisa de índices compostos para queries que combinam filtros (`where`) com ordenação (`orderBy`).

## Erro Encontrado
```
FirebaseError: The query requires an index. You can create it here: 
https://console.firebase.google.com/v1/r/project/gourmet-dc6d1/firestore/indexes?create_composite=...
```

## Solução Implementada (Temporária)
Modificamos as queries para funcionar sem índices compostos:
- Removemos `orderBy` das queries com `where`
- Fazemos a ordenação no cliente usando JavaScript

## Índices Recomendados para Performance Otimizada

### 1. Índice para Busca por Telefone + Ordenação por Data
**Coleção:** `deliveries`
**Campos:**
- `customerPhone` (Ascending)
- `createdAt` (Descending)

### 2. Índice para Busca por Restaurante + Ordenação por Data
**Coleção:** `deliveries`
**Campos:**
- `restaurantId` (Ascending)
- `createdAt` (Descending)

### 3. Índice para Ordenação Geral por Data
**Coleção:** `deliveries`
**Campos:**
- `createdAt` (Descending)

## Como Criar os Índices

### Opção 1: Via Console Firebase
1. Acesse o [Console do Firebase](https://console.firebase.google.com/)
2. Selecione o projeto `gourmet-dc6d1`
3. Vá para **Firestore Database** > **Índices**
4. Clique em **Criar Índice**
5. Configure os campos conforme especificado acima

### Opção 2: Via Firebase CLI
```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Login no Firebase
firebase login

# Inicializar projeto (se não estiver inicializado)
firebase init firestore

# Criar arquivo firestore.indexes.json
```

### Opção 3: Arquivo firestore.indexes.json
Crie o arquivo `firestore.indexes.json` na raiz do projeto:

```json
{
  "indexes": [
    {
      "collectionGroup": "deliveries",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "customerPhone",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "deliveries",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "restaurantId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "deliveries",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    }
  ]
}
```

## Benefícios dos Índices
- ✅ **Performance melhorada** nas queries
- ✅ **Menos uso de banda** (dados já ordenados no servidor)
- ✅ **Escalabilidade** para grandes volumes de dados
- ✅ **Custo reduzido** (menos leituras do Firestore)

## Status Atual
- ✅ **Funcionalidade funcionando** sem índices (ordenação no cliente)
- ⏳ **Performance otimizada** pendente (criação dos índices)
- 🔄 **Compatível** com ambas as abordagens

## Próximos Passos
1. Criar os índices recomendados no Firebase
2. Restaurar as queries com `orderBy` para melhor performance
3. Monitorar o uso e custos do Firestore
