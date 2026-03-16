# Credenciais de demonstração (221 Gourmet / 221 Delivery)

Arquivo de referência para **logins e senhas** de usuários de exemplo.  
Contas são criadas no **Firebase (Firestore)** via scripts executáveis no terminal.

---

## Índice

| # | Tipo            | Email / Identificação      | Script que cria              |
|---|-----------------|----------------------------|------------------------------|
| 1 | Admin           | `admin@gmail.com`          | (código)                     |
| 2 | Restaurante demo| `restaurante@demo.com`     | `npm run create:demo-accounts` |
| 3 | Cliente delivery| `cliente@demo.com` / telefone | `npm run create:demo-accounts` |
| 4 | Motoboy         | `motoboy@demo.com` / telefone | `npm run create:demo-accounts` |
| 5 | 5 Restaurantes fictícios | `restaurante1@demo.com` … `restaurante5@demo.com` | `npm run seed:demo-restaurants` |
| 6 | Clientes por idioma (telefone) | 3 usuários: BR, US, FR (telefone E.164) | `npm run create:demo-users-by-phone` |

---

## 1. Admin (painel owner)

| Campo   | Valor              |
|--------|--------------------|
| **Email**  | `admin@gmail.com`   |
| **Senha**  | `123456`            |

**Onde usar:** rota `/owner` (painel administrativo: restaurantes, planos, permissões).

**Observação:** o admin é validado no código (`AuthContext`); não está no Firestore.

---

## 2. Restaurante (conta única demo)

| Campo   | Valor              |
|--------|--------------------|
| **Email**  | `restaurante@demo.com` |
| **Senha**  | `Demo@123`            |

**Onde usar:**

- **Opção 1 (recomendado):** `http://localhost:5173/restaurant/auth` → login com email e senha.
- **Opção 2:** `http://localhost:5173/<ID_DO_RESTAURANTE>/settings` → modal de login (use o ID exibido ao final do script).

**Observação:** criado/atualizado pelo script `npm run create:demo-accounts`. O **ID do restaurante** aparece no log ao final; use-o na URL de settings se precisar.

---

## 3. Cliente (delivery – entrar / criar conta)

| Campo     | Valor              |
|----------|--------------------|
| **Email**   | `cliente@demo.com`   |
| **Telefone**| `(11) 99999-9999`   |

**Senha:** não existe. Acesso por **email** ou **telefone**.

**Onde usar:** rota `/delivery/auth`. Informe o email ou o telefone acima.

---

## 4. Motoboy (usuário delivery)

| Campo     | Valor              |
|----------|--------------------|
| **Email**   | `motoboy@demo.com`   |
| **Telefone**| `(11) 98888-8888`   |

**Senha:** não existe. Acesso por **email** ou **telefone** (mesmo fluxo de cliente delivery).

**Onde usar:** rota `/delivery/auth`. O painel do motoboy depende de rota/autenticação específica no app.

---

## 5. Cinco restaurantes fictícios (seed)

Cinco restaurantes de exemplo, cada um com **conta (email/senha)**, **3 categorias de menu** e **pelo menos 3 itens por categoria** (nome, descrição, preço).

| Restaurante             | Email                  | Senha    |
|-------------------------|------------------------|----------|
| Cantina Bella Italia   
 | `restaurante1@demo.com`| `Demo@101` |
| Sabor do Nordeste   
    | `restaurante2@demo.com`| `Demo@102` |
| Sushi Zen        
       | `restaurante3@demo.com`| `Demo@103` |
| Churrascaria Gaúcha  
   | `restaurante4@demo.com`| `Demo@104` |
| Padaria & Café Manhã  
  | `restaurante5@demo.com`| `Demo@105` |

**Onde usar:** mesmo fluxo do restaurante (seção 2): `/restaurant/auth` ou `/<ID_DO_RESTAURANTE>/settings`. Os **IDs** e dados completos (telefone, endereço, etc.) são gerados ao rodar o script e ficam salvos em **`credentials.json`** na raiz do projeto.

**Como criar:** na raiz do projeto, com `.env` configurado (`VITE_FIREBASE_*`):

```bash
npm run seed:demo-restaurants
```

---

## 6. Clientes demo por idioma (login por telefone)

Três usuários de delivery, um por idioma do app, com telefone no formato internacional do país. Use em `/delivery/auth` com **telefone** ou **email**.

| Idioma | País    | Telefone (E.164)   | Email               | Nome                 |
|--------|---------|--------------------|---------------------|----------------------|
| pt-BR  | Brasil  | `+55 11 97777-7777`| `cliente-br@demo.com`  | Cliente Demo Brasil  |
| en-US  | USA     | `+1 555 777 7777`  | `cliente-us@demo.com` | Demo Client USA      |
| fr-FR  | França  | `+33 6 77 77 77 77`| `cliente-fr@demo.com` | Client Démo France   |

**Senha:** não existe. Acesso por **email** ou **telefone** (igual aos clientes da seção 3 e 4).

**Como criar (Firestore via script):** na raiz do projeto, com `.env` configurado:

```bash
npm run create:demo-users-by-phone
```

Ou com Firebase/Node diretamente:

```bash
npx tsx src/scripts/createDemoUsersByPhone.ts
```

O script irá:

1. Garantir um plano (ex.: Plano Básico) se não existir.
2. Criar os 5 restaurantes no Firestore (email, senha hasheada, delivery habilitado).
3. Para cada restaurante: criar 3 categorias e pelo menos 3 itens por categoria no cardápio.
4. Escrever **`credentials.json`** com `restaurantId`, nome, domínio, email, senha, telefone e endereço de cada um.

Consulte **`credentials.json`** após a execução para IDs e detalhes completos.

---

## Scripts disponíveis (terminal)

Na raiz do projeto, com `.env` configurado:

| Comando | Descrição |
|--------|-----------|
| `npm run seed:all` | **Criar tudo:** executa `create:demo-accounts` e em seguida `seed:demo-restaurants` (plano, 4 contas demo + 5 restaurantes com cardápio). |
| `npm run create:demo-accounts` | Cria/atualiza **plano**, **restaurante demo** (`restaurante@demo.com`), **cliente** e **motoboy** no Firestore. |
| `npm run seed:demo-restaurants` | Cria **5 restaurantes fictícios** com cardápios completos e gera **`credentials.json`**. |
| `npm run create:demo-users` | *(Legado)* Apenas restaurante e cliente. Prefira `create:demo-accounts`. |
| `npm run create:demo-users-by-phone` | Cria **3 usuários delivery** (pt-BR, en-US, fr-FR) com telefone internacional para login. |

Em caso de erro, confira o stack trace no console e as variáveis `VITE_FIREBASE_*` no `.env`.
