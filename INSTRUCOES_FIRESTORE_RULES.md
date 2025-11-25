# ⚠️ AÇÃO NECESSÁRIA: Atualizar Regras do Firestore

## Problema
A coleção `registrationTokens` não tem permissões configuradas no Firestore, causando erro ao gerar links de cadastro.

## Solução

### Opção 1: Via Console Firebase (Recomendado)

1. Acesse: https://console.firebase.google.com/
2. Selecione o projeto: **gourmet-dc6d1**
3. No menu lateral, vá em **Firestore Database**
4. Clique na aba **Regras** (Rules)
5. Adicione as seguintes linhas **ANTES** da linha `match /{document=**}`:

```javascript
match /registrationTokens/{document} {
  allow read, write: if true;
}
```

6. Clique em **Publicar** (Publish)

### Regras Completas Atualizadas

Se preferir copiar todas as regras de uma vez:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /products/{document} {
      allow read, write: if true;
    }
    
    match /categories/{document} {
      allow read, write: if true;
    }
    
    match /tables/{document} {
      allow read, write: if true;
    }
    
    match /orders/{document} {
      allow read, write: if true;
    }
    
    match /restaurants/{document} {
      allow read, write: if true;
    }
    
    match /plans/{document} {
      allow read, write: if true;
    }
    
    match /deliveries/{document} {
      allow read, write: if true;
    }
    
    match /restaurantPermissions/{document} {
      allow read, write: if true;
    }
    
    match /planPermissions/{document} {
      allow read, write: if true;
    }
    
    match /settings/{document} {
      allow read, write: if true;
    }
    
    match /registrationTokens/{document} {
      allow read, write: if true;
    }
    
    // Regra padrão - negar acesso a outras coleções
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Opção 2: Configurar Firebase CLI (Para Deploy Automático Futuro)

Se quiser poder fazer deploy via terminal no futuro:

1. Instale o Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Faça login:
```bash
firebase login
```

3. Inicialize o projeto:
```bash
firebase init firestore
```

4. Selecione o projeto existente: **gourmet-dc6d1**

5. Confirme o arquivo de regras: `firestore.rules`

6. Depois disso, você poderá fazer deploy com:
```bash
firebase deploy --only firestore:rules
```

## ⚠️ Nota Importante

Estas regras permitem acesso total às coleções (apenas para desenvolvimento).

**Para produção**, você deve implementar regras mais seguras como:

```javascript
match /registrationTokens/{document} {
  // Apenas admins podem criar tokens
  allow create: if request.auth != null && request.auth.token.admin == true;
  
  // Qualquer um pode ler (necessário para validar na página pública)
  allow read: if true;
  
  // Apenas admins podem atualizar (marcar como usado será feito no backend)
  allow update: if request.auth != null && request.auth.token.admin == true;
  
  // Apenas admins podem deletar
  allow delete: if request.auth != null && request.auth.token.admin == true;
}
```

## Após Atualizar as Regras

1. Aguarde alguns segundos para as regras propagarem
2. Recarregue a página do sistema
3. Tente gerar o link novamente
4. Deve funcionar! ✅

