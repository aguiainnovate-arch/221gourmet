# Credenciais de demonstração (221 Gourmet / 221 Delivery)

Usuários de exemplo para cada tipo de acesso no sistema.  
**Criados via Firebase (Firestore)** com o script `npm run create:demo-accounts`.

---

## 1. Admin (painel owner)

| Campo   | Valor              |
|--------|--------------------|
| **Email**  | `admin@gmail.com`   |
| **Senha**  | `123456`            |

**Onde usar:** rota `/owner` (painel administrativo: restaurantes, planos, permissões).

**Observação:** o admin é validado no código (`AuthContext`); não está no Firestore.

---

## 2. Restaurante (configurações do restaurante)

| Campo   | Valor              |
|--------|--------------------|
| **Email**  | `restaurante@demo.com` |
| **Senha**  | `Demo@123`            |

**Onde usar:**

**Opção 1 – Página de login dedicada (recomendado):**
- Acesse: `http://localhost:5173/restaurant/auth`
- Faça login com email e senha
- Será redirecionado para o painel de gerenciamento

**Opção 2 – Diretamente nas configurações:**
- Acesse: `http://localhost:5173/<ID_DO_RESTAURANTE>/settings`
- Um modal de login aparecerá
- Exemplo (ID gerado pelo script): `http://localhost:5173/E81Qf47vgdve6RxcQWRX/settings`

**Observação:** o restaurante demo é criado no Firestore ao rodar `npm run create:demo-accounts`. O **ID do restaurante** aparece no log ao final do script; use-o na URL de settings (Opção 2).

---

## 3. Cliente (delivery – entrar / criar conta)

| Campo     | Valor              |
|----------|--------------------|
| **Email**   | `cliente@demo.com`   |
| **Telefone**| `(11) 99999-9999`   |

**Senha:** não existe. O cliente do delivery **não usa senha**; o acesso é por email ou telefone.

**Onde usar:** rota `/delivery/auth` (Entrar / Criar conta). Informe o **email** ou o **telefone** acima para entrar na conta demo.

---

## 4. Motoboy (usuário delivery – painel motoboy)

| Campo     | Valor              |
|----------|--------------------|
| **Email**   | `motoboy@demo.com`   |
| **Telefone**| `(11) 98888-8888`   |

**Senha:** não existe. O acesso é por email ou telefone (mesmo fluxo de cliente delivery).

**Onde usar:** rota `/delivery/auth`. Informe **email** ou **telefone** acima. O painel do motoboy (chamadas, entregas, finanças) depende de rota/autenticação específica para motoboy no app.

---

## Como criar as contas no Firestore (Firebase CLI / script)

Na raiz do projeto, com o `.env` configurado (variáveis `VITE_FIREBASE_*`):

```bash
npm run create:demo-accounts
```

O script irá:

1. **Plano:** criar um plano padrão (“Plano Básico”) se não existir nenhum.
2. **Restaurante:** criar ou atualizar restaurante `restaurante@demo.com` com senha `Demo@123` e delivery habilitado.
3. **Cliente:** criar ou atualizar usuário delivery `cliente@demo.com` / `(11) 99999-9999`.
4. **Motoboy:** criar ou atualizar usuário delivery `motoboy@demo.com` / `(11) 98888-8888`.

Os IDs (restaurante, cliente, motoboy) são exibidos no log ao final. Em caso de erro, confira o stack trace no console e as variáveis de ambiente no `.env`.

---

## Script alternativo (legado)

O comando `npm run create:demo-users` ainda cria apenas **restaurante** e **cliente** (sem plano automático nem motoboy). Prefira `npm run create:demo-accounts` para as três contas e plano.
