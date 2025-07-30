# Troubleshooting - Problemas de Carregamento de Dados

## Problema
Os produtos e categorias não estão sendo carregados do banco de dados, mesmo estando salvos no Firestore.

## Possíveis Causas e Soluções

### 1. Regras de Segurança do Firestore
**Problema**: As regras de segurança podem estar bloqueando o acesso às coleções.

**Solução**: 
1. Acesse o [Console do Firebase](https://console.firebase.google.com)
2. Vá para Firestore Database > Rules
3. Substitua as regras atuais pelas regras do arquivo `firestore.rules`
4. Publique as regras

### 2. Índices Compostos
**Problema**: A query `orderBy('category'), orderBy('name')` requer um índice composto.

**Solução**: 
- Já corrigido no código - agora ordenamos no JavaScript

### 3. Problemas de Conectividade
**Problema**: O Firebase pode não estar inicializando corretamente.

**Solução**:
1. Verifique se o arquivo `firebase.ts` está configurado corretamente
2. Use o botão "Testar Conexão" na página de configurações
3. Verifique o console do navegador para erros

### 4. Problemas de Cache
**Problema**: O navegador pode estar usando dados em cache.

**Solução**:
1. Limpe o cache do navegador (Ctrl+F5)
2. Abra o DevTools e vá em Network > Disable cache
3. Recarregue a página

## Como Diagnosticar

1. **Abra o Console do Navegador** (F12)
2. **Vá para a página de Configurações**
3. **Clique no botão "Testar Conexão"**
4. **Verifique os logs no console**

### Logs Esperados:
```
Firebase db inicializado: true
=== TESTE DE CONECTIVIDADE FIRESTORE ===
--- Testando products ---
Testando leitura da coleção: products
✅ Leitura bem-sucedida. X documentos encontrados em products
Testando escrita na coleção: products
✅ Escrita bem-sucedida. Documento criado: [ID]
✅ Documento de teste removido
...
✅ Todos os testes passaram!
```

### Se Houver Erros:
- **Erro de permissão**: Configure as regras de segurança
- **Erro de rede**: Verifique a conexão com a internet
- **Erro de configuração**: Verifique o arquivo `firebase.ts`

## Comandos Úteis

Para verificar se o Firebase está funcionando:
```javascript
// No console do navegador
import { db } from './firebase';
import { collection, getDocs } from 'firebase/firestore';
const test = await getDocs(collection(db, 'products'));
console.log('Produtos:', test.size);
```

## Contato
Se o problema persistir, verifique:
1. Console do navegador para erros específicos
2. Console do Firebase para logs de erro
3. Regras de segurança do Firestore 