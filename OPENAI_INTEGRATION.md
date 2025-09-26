# 🤖 Integração OpenAI GPT-4 Mini

Este projeto agora inclui integração completa com a API da OpenAI usando o modelo GPT-4o Mini para geração automática de conteúdo.

## 📦 Instalação

### 1. Instalar a biblioteca OpenAI

```bash
npm install openai
```

### 2. Obter chave da API

1. Acesse [OpenAI Platform](https://platform.openai.com/)
2. Faça login na sua conta
3. Vá para "API Keys" no menu lateral
4. Clique em "Create new secret key"
5. Copie a chave gerada (começa com `sk-`)

## 🚀 Como Usar

### 1. Acessar a Configuração de IA

1. Acesse `/owner` no seu projeto
2. Clique em "Configuração de IA" no menu lateral
3. Cole sua chave da API OpenAI
4. Configure os parâmetros desejados:
   - **Modelo**: GPT-4o Mini (recomendado), GPT-4o, ou GPT-3.5 Turbo
   - **Max Tokens**: Máximo de tokens na resposta (padrão: 1000)
   - **Temperature**: Criatividade da resposta (0 = focado, 2 = criativo)

### 2. Testar a Conexão

1. Clique em "Testar Conexão" para verificar se a API está funcionando
2. Se aparecer "✅ Conexão estabelecida com sucesso!", está tudo configurado!

### 3. Testar Prompts

1. Use a seção "Teste de Prompts" para experimentar
2. Digite um prompt do sistema (opcional) para definir o comportamento da IA
3. Digite seu prompt de teste
4. Clique em "Testar Prompt" para ver a resposta

## 🎯 Funcionalidades Disponíveis

### Geração de Conteúdo Automático

O serviço inclui funções especializadas para:

- **Descrições de Produtos**: Gera descrições atrativas para pratos
- **Nomes de Produtos**: Sugere nomes criativos para novos pratos
- **Conteúdo Promocional**: Cria textos para banners e campanhas

### Exemplos de Uso

```typescript
import { openaiService } from './services/openaiService';

// Gerar descrição de produto
const description = await openaiService.generateProductDescription(
  'Hambúrguer Artesanal', 
  'Lanches'
);

// Gerar nomes de produtos
const names = await openaiService.generateProductNames(
  'Sobremesa de chocolate com morango',
  'Sobremesas'
);

// Gerar conteúdo promocional
const promo = await openaiService.generatePromotionalContent(
  'Happy Hour',
  'jovens profissionais'
);
```

## 🔧 Configuração Avançada

### Parâmetros Recomendados

- **GPT-4o Mini**: Mais econômico, boa qualidade
- **Max Tokens**: 1000 para descrições, 500 para nomes
- **Temperature**: 0.7 para equilíbrio entre criatividade e consistência

### Segurança

- ✅ Chave da API salva apenas localmente no navegador
- ✅ Não é enviada para servidores externos
- ✅ Configuração persistente entre sessões

## 💰 Custos

O GPT-4o Mini é muito mais econômico que o GPT-4o completo:

- **GPT-4o Mini**: ~$0.15 por 1M tokens de entrada, ~$0.60 por 1M tokens de saída
- **GPT-4o**: ~$2.50 por 1M tokens de entrada, ~$10.00 por 1M tokens de saída

## 🛠️ Desenvolvimento

### Estrutura dos Arquivos

```
src/
├── services/
│   └── openaiService.ts          # Serviço principal da OpenAI
├── pages/
│   └── owner/
│       └── AIConfiguration.tsx   # Interface de configuração
└── components/
    └── AdminSidebar.tsx          # Menu lateral atualizado
```

### Adicionando Novas Funcionalidades

Para adicionar novas funções de IA:

1. Adicione métodos no `openaiService.ts`
2. Crie prompts específicos para sua necessidade
3. Teste na interface de configuração
4. Integre nas páginas desejadas

## 🐛 Solução de Problemas

### Erro de Conexão

- ✅ Verifique se a chave da API está correta
- ✅ Confirme se tem créditos na conta OpenAI
- ✅ Teste com um prompt simples primeiro

### Respostas Inconsistentes

- ✅ Ajuste a temperatura (menor = mais consistente)
- ✅ Melhore o prompt do sistema
- ✅ Use prompts mais específicos

### Custos Altos

- ✅ Use GPT-4o Mini ao invés de GPT-4o
- ✅ Reduza o max_tokens
- ✅ Teste com prompts menores primeiro

## 📞 Suporte

Se encontrar problemas:

1. Verifique o console do navegador para erros
2. Teste a conexão na interface de configuração
3. Confirme se a chave da API está válida
4. Verifique se tem créditos na conta OpenAI

---

**🎉 Pronto! Agora você pode usar IA para gerar conteúdo automático no seu projeto!**
