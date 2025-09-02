# Gestão Automática de Imagens - 221 Gourmet

## Funcionalidades Implementadas

### 🗑️ Deletar Imagens Antigas Automaticamente

O sistema agora automaticamente deleta imagens antigas do Firebase Storage quando são substituídas, evitando acúmulo de arquivos desnecessários e economizando espaço.

### 📋 Cenários Cobertos

#### 1. **Upload de Banner do Restaurante**
- **Quando**: Usuário faz upload de um novo banner
- **Ação**: A imagem antiga do banner é automaticamente deletada do Storage
- **Localização**: `handleBannerUpload()` em `src/pages/Settings.tsx`

#### 2. **Upload de Imagem de Produto**
- **Quando**: Usuário faz upload de uma nova imagem para um produto
- **Ação**: A imagem antiga do produto é automaticamente deletada do Storage
- **Localização**: `handleProductImageUpload()` em `src/pages/Settings.tsx`

#### 3. **Edição de Produto**
- **Quando**: Usuário edita um produto e altera a imagem
- **Ação**: A imagem antiga é deletada quando o produto é salvo
- **Localização**: `saveProduct()` em `src/pages/Settings.tsx`

#### 4. **Exclusão de Produto**
- **Quando**: Usuário exclui um produto
- **Ação**: A imagem do produto é deletada junto com o produto
- **Localização**: `deleteProductItem()` em `src/pages/Settings.tsx`

#### 5. **Remoção Manual de Imagens**
- **Quando**: Usuário remove manualmente uma imagem (banner ou produto)
- **Ação**: A imagem é deletada do Storage
- **Localização**: `handleBannerRemove()` e `handleProductImageRemove()` em `src/pages/Settings.tsx`

### 🔧 Implementação Técnica

#### Função Utilitária
```typescript
const extractImagePathFromUrl = (imageUrl: string): string | null => {
  try {
    const url = new URL(imageUrl);
    const pathMatch = url.pathname.match(/\/o\/(.+?)\?/);
    
    if (pathMatch) {
      return decodeURIComponent(pathMatch[1]);
    }
    return null;
  } catch (error) {
    console.warn('Erro ao extrair path da URL:', error);
    return null;
  }
};
```

#### Padrão de Uso
```typescript
// 1. Armazenar URL antiga
const oldImageUrl = currentImageUrl;

// 2. Fazer upload da nova imagem
const result = await uploadImage(file, folder, fileName);

// 3. Se upload bem-sucedido, deletar imagem antiga
if (result.success && oldImageUrl) {
  try {
    const imagePath = extractImagePathFromUrl(oldImageUrl);
    if (imagePath) {
      await deleteImage(imagePath);
      console.log('Imagem antiga deletada com sucesso');
    }
  } catch (deleteError) {
    console.warn('Erro ao deletar imagem antiga:', deleteError);
    // Não mostrar erro para o usuário, pois o upload foi bem-sucedido
  }
}
```

### 🛡️ Tratamento de Erros

- **Upload bem-sucedido**: Se a nova imagem foi enviada com sucesso, a antiga é deletada
- **Erro na deleção**: Se houver erro ao deletar a imagem antiga, apenas um warning é logado no console
- **Não interrompe o fluxo**: Erros na deleção não afetam a experiência do usuário
- **Validação de URL**: Função utilitária valida se a URL é válida antes de tentar extrair o path

### 📊 Benefícios

1. **Economia de Espaço**: Evita acúmulo de imagens desnecessárias no Storage
2. **Custos Reduzidos**: Menos arquivos = menor custo do Firebase Storage
3. **Organização**: Mantém o Storage limpo e organizado
4. **Transparência**: Usuário não precisa se preocupar com limpeza manual
5. **Robustez**: Sistema funciona mesmo se houver erros na deleção

### 🔍 Monitoramento

- Logs de sucesso: `console.log('Imagem antiga deletada com sucesso')`
- Logs de erro: `console.warn('Erro ao deletar imagem antiga:', error)`
- Monitoramento via Firebase Console: Verificar pasta de Storage periodicamente

### 🚀 Como Testar

1. **Upload de Banner**:
   - Vá para Configurações > Personalização
   - Faça upload de um banner
   - Faça upload de outro banner
   - Verifique no Firebase Console se apenas a imagem mais recente permanece

2. **Upload de Produto**:
   - Vá para Configurações > Gerenciar Cardápio
   - Adicione um produto com imagem
   - Edite o produto e altere a imagem
   - Verifique se a imagem antiga foi deletada

3. **Exclusão de Produto**:
   - Exclua um produto que tenha imagem
   - Verifique se a imagem foi deletada do Storage

### 📝 Notas Importantes

- A deleção é **silenciosa**: não mostra erros para o usuário
- Funciona apenas com URLs do Firebase Storage
- Requer permissões adequadas no Firebase Storage
- Backup automático não é afetado (se configurado)
