# Credenciais de demonstração (221 Gourmet / 221 Delivery)

Usuários de exemplo para cada tipo de acesso no sistema.

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

**Opção 1 - Página de login dedicada (RECOMENDADO):**
- Acesse: `http://localhost:5173/restaurant/auth`
- Faça login com email e senha
- Será redirecionado automaticamente para o painel de gerenciamento

**Opção 2 - Diretamente nas configurações:**
- Acesse: `http://localhost:5173/<ID_DO_RESTAURANTE>/settings`
- Um modal de login aparecerá

**Observação:** o restaurante demo é criado no Firestore ao rodar o script `npm run create:demo-users`. O **ID do restaurante** aparece no console ao executar o script; use-o na URL de settings (Opção 2).

---

## 3. Cliente (delivery – entrar / criar conta)

| Campo     | Valor              |
|----------|--------------------|
| **Email**   | `cliente@demo.com`   |
| **Telefone**| `(11) 99999-9999`   |

**Senha:** não existe. O cliente do delivery **não usa senha**; o acesso é apenas por email ou telefone.

**Onde usar:** rota `/delivery/auth` (Entrar / Criar conta). Informe o **email** ou o **telefone** acima para “entrar” na conta demo.

**Observação:** o cliente demo é criado/atualizado no Firestore ao rodar `npm run create:demo-users`.

---

## 4. Motoboy (painel delivery)

| Campo   | Valor              |
|--------|--------------------|
| **Email**  | `motoboy@teste.com`   |
| **Senha**  | `XBs7WPmEaA`          |

**Onde usar:** rota `/delivery/auth` (mesma página de login do delivery). Após o login, o motoboy é redirecionado para o **Painel do Motoboy** (`/motoboy`), onde pode ver chamadas pendentes e aceitar ou recusar.

**Observação:** o motoboy demo é criado no Firestore ao rodar o script de criação de motoboys (ver documentação em `docs/motoboys/`).

---

## Como criar os usuários demo no Firestore

Execute no terminal, na raiz do projeto:

```bash
npm run create:demo-users
```

Isso irá:

1. **Admin:** nada (já está no código).
2. **Restaurante:** criar um restaurante com email `restaurante@demo.com` e senha `Demo@123` (ou atualizar a senha se o restaurante já existir). É necessário ter pelo menos um **plano** cadastrado (ex.: rodar a inicialização de planos antes).
3. **Cliente delivery:** criar ou atualizar um usuário com email `cliente@demo.com` e telefone `(11) 99999-9999`.
4. **Motoboy:** ver documentação em `docs/motoboys/` para criar o usuário com email `motoboy@teste.com` e senha `XBs7WPmEaA`.

Após rodar os scripts, use as credenciais acima para testar cada tipo de usuário.
