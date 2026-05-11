# Noctis - Sistema de Gerenciamento de Restaurantes

Sistema completo de gerenciamento de restaurantes com cardápio digital, controle de pedidos e tradução automática.

## Configuração

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto. Exemplo:

```bash
VITE_OPENAI_API_KEY=sua_chave_openai_aqui

# URL do app em produção (opcional). Usado nos QR codes das mesas.
# Se não definir, os QR codes usam a URL de onde o app está aberto.
# Na Netlify: defina em Site settings > Environment variables e faça um novo deploy.
VITE_APP_URL=https://seu-site.netlify.app
```

### Netlify e Stripe (Content-Security-Policy)

Se no console aparecer CSP bloqueando `https://connect-js.stripe.com` (por exemplo `connect.js.map` e a diretiva `connect-src`), o cabeçalho **Content-Security-Policy** do site está restritivo demais ou foi copiado de uma lista Stripe antiga.

**Correção:** no mesmo lugar em que você define o CSP (Netlify **Site configuration → Headers**, `_headers`, plugin de headers ou equivalente), acrescente **`https://connect-js.stripe.com`** em:

- **`connect-src`** (obrigatório para esse erro)
- **`script-src`** e **`frame-src`** — também devem permitir `https://connect-js.stripe.com` e `https://js.stripe.com` se usar componentes Connect incorporados ([documentação Stripe — CSP](https://docs.stripe.com/connect/get-started-connect-embedded-components#csp-and-http-header-requirements)).

O bloqueio do arquivo `.map` costuma afetar só source maps no DevTools; se o onboarding ou pagamentos falharem de fato, ajuste o CSP como acima. Evite `Cross-Origin-Opener-Policy: same-origin` no front que use fluxos Stripe Connect em popup/componentes incorporados (o padrão `unsafe-none`/ausente é o compatível).

### Instalação

```bash
# Instalar dependências
npm install

# Criar arquivo .env com a chave da OpenAI
echo "VITE_OPENAI_API_KEY=sua_chave_aqui" > .env

# Iniciar servidor de desenvolvimento
npm run dev
```

## Funcionalidades

- **Sistema de Permissões**: Controle de acesso a funcionalidades por plano
- **Tradução Automática**: Tradução de produtos e categorias usando IA
- **Gerenciamento de Planos**: Diferentes níveis de acesso
- **Cardápio Digital**: Interface responsiva para clientes
- **Controle de Pedidos**: Sistema completo de gestão de pedidos

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
