# Guia de Importação de Produtos via CSV

Este guia explica como usar a funcionalidade de importação de produtos via CSV no sistema 221 Gourmet.

## 📋 Estrutura do CSV

O arquivo CSV deve seguir a estrutura abaixo, com os campos separados por vírgulas:

### Campos Obrigatórios
- `name` - Nome do produto
- `description` - Descrição do produto
- `price` - Preço (use ponto como separador decimal)
- `category` - Categoria do produto

### Campos Opcionais
- `preparationTime` - Tempo de preparo em minutos
- `available` - Disponibilidade (true/false, padrão: true)

### Campos de Tradução (Opcionais)
- `name_en` - Nome em inglês
- `name_es` - Nome em espanhol
- `name_fr` - Nome em francês
- `description_en` - Descrição em inglês
- `description_es` - Descrição em espanhol
- `description_fr` - Descrição em francês

## 📝 Exemplo de CSV

```csv
name,description,price,category,preparationTime,available,name_en,name_es,name_fr,description_en,description_es,description_fr
Hambúrguer Clássico,Hambúrguer artesanal com queijo alface e tomate,25.90,Lanches,15,true,Classic Burger,Hamburguesa Clásica,Burger Classique,"Artisanal burger with cheese lettuce and tomato","Hamburguesa artesanal con queso lechuga y tomate","Burger artisanale avec fromage laitue et tomate"
X-Bacon,X-Bacon com bacon crocante e queijo derretido,32.50,Lanches,20,true,X-Bacon,X-Bacon,X-Bacon,"X-Bacon with crispy bacon and melted cheese","X-Bacon con tocino crujiente y queso derretido","X-Bacon avec bacon croustillant et fromage fondu"
Refrigerante Cola,Refrigerante cola 350ml,8.90,Bebidas,2,true,Cola Soda,Refresco de Cola,Soda Cola,"Cola soda 350ml","Refresco de cola 350ml","Soda cola 350ml"
```

## 🔧 Como Usar

### 1. Acesse as Configurações
- Vá para `/settings` no sistema
- Clique na aba "Gerenciar Cardápio"

### 2. Inicie a Importação
- Clique no botão "Importar CSV"
- O modal de importação será aberto

### 3. Prepare o Arquivo
- **Opção A**: Faça upload de um arquivo CSV
- **Opção B**: Cole o conteúdo CSV diretamente no campo de texto
- **Opção C**: Baixe o template e preencha com seus dados

### 4. Execute a Importação
- Clique em "Importar Produtos"
- O sistema irá:
  - Validar a estrutura do CSV
  - Criar categorias que não existem
  - Importar todos os produtos
  - Mostrar o resultado da operação

## ⚠️ Regras Importantes

### Validação de Dados
- Todos os campos obrigatórios devem estar preenchidos
- Preços devem ser números positivos
- Categorias serão criadas automaticamente se não existirem
- Valores booleanos: use `true`/`false` ou `1`/`0`

### Formato de Valores
- **Preços**: Use ponto como separador decimal (ex: 25.90)
- **Tempo**: Número inteiro em minutos
- **Texto com vírgulas**: Use aspas duplas (ex: "Descrição com vírgula")

### Tratamento de Erros
- Produtos com erro não impedem a importação dos demais
- Erros são exibidos em uma lista detalhada
- Categorias são criadas antes da importação dos produtos

## 🎯 Dicas de Uso

### Preparando o CSV
1. Use um editor de planilhas (Excel, Google Sheets, etc.)
2. Preencha os dados seguindo a estrutura
3. Exporte como CSV (UTF-8)
4. Verifique se não há caracteres especiais problemáticos

### Organizando os Dados
- Agrupe produtos por categoria
- Use nomes descritivos para categorias
- Mantenha consistência nos nomes de produtos
- Adicione traduções para melhor experiência do cliente

### Testando a Importação
1. Comece com poucos produtos para testar
2. Verifique se as categorias foram criadas corretamente
3. Confirme se os produtos aparecem no cardápio
4. Teste as traduções se aplicável

## 🔍 Solução de Problemas

### Erro: "Cabeçalho obrigatório não encontrado"
- Verifique se o CSV tem cabeçalho na primeira linha
- Confirme se os nomes dos campos estão corretos
- Use o template fornecido como base

### Erro: "Número de colunas não corresponde"
- Verifique se não há vírgulas extras no final das linhas
- Use aspas para valores que contêm vírgulas
- Confirme se todas as linhas têm o mesmo número de colunas

### Erro: "Preço deve ser maior que zero"
- Verifique se os preços estão no formato correto (25.90)
- Confirme se não há espaços extras nos valores
- Use ponto como separador decimal, não vírgula

### Produtos não aparecem após importação
- Verifique se a importação foi bem-sucedida
- Recarregue a página de produtos
- Confirme se não há erros na lista de importação

## 📞 Suporte

Se encontrar problemas com a importação:
1. Verifique a estrutura do CSV
2. Teste com o template fornecido
3. Verifique os logs de erro no console do navegador
4. Entre em contato com o suporte técnico
