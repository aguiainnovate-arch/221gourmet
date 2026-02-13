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
