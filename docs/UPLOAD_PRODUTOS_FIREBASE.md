# Upload de Fotos de Produtos – Firebase Storage

## 1. Diagnóstico do problema anterior

- **O que já existia:** O `storageService` tinha `uploadImage(file, folder, fileName)` que enviava para o Storage em `products/product-image_<timestamp>.<ext>`. O Settings chamava esse upload e colocava a URL no `productForm.image`; ao salvar o produto, a URL era persistida no Firestore no campo `product.image`. Ou seja, a **persistência da URL no banco** e o **upload real** já estavam implementados em parte.
- **Problemas identificados:**
  1. **Path genérico:** Tudo ia para `products/` sem `restaurantId` nem `productId`, dificultando organização, limpeza e regras de segurança por restaurante.
  2. **Regras do Storage:** Não havia arquivo `storage.rules` no projeto; se as regras no Console estiverem fechadas, o upload pode falhar por permissão.
  3. **UX:** Não havia loading durante o upload, nem bloqueio de duplo envio; feedback era só `alert()`.
  4. **Substituição de imagem:** A lógica de deletar a imagem antiga ao trocar já existia, mas a extração do path da URL podia falhar em alguns formatos de URL do Storage.
  5. **Validação:** Tipos e tamanho eram validados no handler; não havia validação centralizada e reutilizável (ex.: apenas JPG, PNG, WebP e máx. 5MB).

## 2. Arquitetura da solução

```
[Settings / Formulário do produto]
        │
        ▼
[handleProductImageUpload]
        │  • Validação (tipo, tamanho) no storageService
        │  • uploadProductImage(file, restaurantId, productId?)
        ▼
[Firebase Storage]
   Path: restaurants/{restaurantId}/items/{productId|temp_ts}/{safeFileName}
        │
        ▼
[getDownloadURL] → URL pública
        │
        ▼
[setProductForm.image = url]  →  ao salvar produto: productData.image = productForm.image
        │
        ▼
[Firestore] products/{id} .image = url
```

- **Criação:** Usuário escolhe foto → upload para `restaurants/{id}/items/temp_{timestamp}/{file}` → URL no formulário → ao clicar “Salvar”, produto é criado no Firestore com `image: url`.
- **Edição:** Usuário troca foto → upload para `restaurants/{id}/items/{productId}/{file}` → nova URL no formulário → ao salvar, `updateProduct` persiste a nova URL; a imagem antiga é deletada do Storage (path extraído da URL antiga) para evitar órfãs.

## 3. Estrutura de arquivos

- `firebase.ts` – já inicializa `getStorage(app)` e exporta `storage`.
- `src/services/storageService.ts`:
  - Constantes: `ALLOWED_IMAGE_TYPES`, `MAX_PRODUCT_IMAGE_SIZE_BYTES`.
  - `extractStoragePathFromUrl(url)` – extrai path do Storage a partir da URL.
  - `buildProductImagePath(restaurantId, itemId, fileName)` – path escalável.
  - `sanitizeFileName(name)` – nome seguro.
  - `uploadProductImage(file, restaurantId, productId?)` – upload com path por restaurante/item.
  - `uploadImage`, `deleteImage`, `deleteImageByUrl` – mantidos para banners/áudio e compatibilidade.
- `src/pages/Settings.tsx`:
  - Importa `uploadProductImage`, `extractStoragePathFromUrl`, `deleteImage`.
  - Estado `isUploadingProductImage` para loading e bloqueio de duplo envio.
  - `handleProductImageUpload` usa `uploadProductImage(file, restaurantId, editingProduct?.id)` e, em sucesso, atualiza o formulário e remove a imagem antiga do Storage.
  - Input com `accept="image/jpeg,image/jpg,image/png,image/webp"` e `disabled={isUploadingProductImage}`; preview com overlay de loading (ícone de refresh).
- `storage.rules` – regras do Firebase Storage (leitura pública, escrita condicionada a auth e tipo/tamanho).

## 4. Regras do Firebase Storage

Arquivo: **`storage.rules`** na raiz do projeto.

- **restaurants/{restaurantId}/items/{itemId}/{fileName}:**  
  - `read: true` (URLs de download acessíveis).  
  - `write:` apenas se `request.auth != null`, tamanho &lt; 6MB e tipo `image/(jpeg|jpg|png|webp)`.
- Pastas **products/**, **banners/**, **audio/** mantidas com read true e write com auth para compatibilidade.
- Demais paths negados.

Se o app **não** usar Firebase Authentication (apenas sessão/outro auth), as regras de write vão bloquear. Opções: (1) usar Firebase Auth (recomendado para produção) ou (2) em desenvolvimento temporariamente usar `allow write: if true` para testar.

Deploy das regras:

```bash
firebase deploy --only storage
```

## 5. Melhorias implementadas e recomendadas

- **Implementado:**
  - Path escalável por restaurante e item; nome de arquivo sanitizado; validação de tipo e tamanho no serviço.
  - Preview da imagem no formulário; loading durante upload; bloqueio de múltiplos envios; remoção da imagem antiga ao substituir.
  - Extração robusta do path da URL para delete; tratamento de erro com mensagem ao usuário.

- **Recomendado para depois:**
  - **Compressão:** Redimensionar/comprimir no cliente (ex.: canvas ou lib como `browser-image-compression`) antes do upload.
  - **Limpeza de temp:** Remover pastas `restaurants/{id}/items/temp_*` antigas (ex.: Cloud Function agendada ou job no backend).
  - **Placeholder:** Componente `ProductImage` já usado; para `src` vazio pode-se exibir um placeholder padrão nas listagens.
  - **Logs:** Manter `console.error`/`console.warn` nos catches e, se desejar, enviar erros para um serviço de monitoramento.

## 6. Garantias de exibição

- A URL salva em `product.image` no Firestore é a mesma retornada por `getDownloadURL` após o upload.
- As telas que já usam `product.image` (Menu, DeliveryMenu, Settings listagem e modal de edição) continuam usando o mesmo campo; não é necessário alterar essas telas para a exibição da imagem funcionar após o upload.
