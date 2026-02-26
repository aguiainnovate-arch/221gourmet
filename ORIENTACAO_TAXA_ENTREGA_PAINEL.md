# Onde configurar taxa de entrega no painel do restaurante

## Resposta direta

**A configuração de taxa de entrega por distância (R$/km, taxa mínima/máxima, raio, áreas) não existe no painel hoje.**  
Ela **não mudou de lugar** — no código atual essa tela nunca foi implementada. O que existe é apenas o que está descrito abaixo.

---

## 1. Onde fica a configuração de Delivery hoje (passo a passo)

1. Faça **login no painel do restaurante** (Configurações / Settings).
2. No **menu lateral (sidebar)**, clique em **"Delivery"** (último item da lista).
3. Na tela **"Configurações de Delivery"** você verá **apenas** estas seções:
   - **Aparecer no Delivery** — liga/desliga se o restaurante aparece na plataforma de delivery.
   - **Descrição para Assistente de IA** — texto usado pelo chatbot para descrever o restaurante.
   - **Produtos Disponíveis para Delivery** — escolha de quais produtos do cardápio aparecem no delivery.
4. No **final da página**, o botão **"Salvar Todas as Configurações"** salva apenas esses três blocos.

**Caminho exato no painel:**  
**Configurações** → menu lateral **"Delivery"** → **"Configurações de Delivery"**.

Não há em nenhum outro menu:
- Nenhuma seção "Entregas", "Áreas de entrega", "Frete", "Taxas" ou "Logística" no painel.
- Nenhum campo para R$/km, taxa mínima, taxa máxima, raio de atendimento ou bairros/áreas.

---

## 2. O que existe hoje sobre o valor da entrega

- No **checkout de delivery** (quando o cliente faz o pedido), a **taxa de entrega é fixa em R$ 5,00** no código.
- Esse valor **não é configurável** pelo restaurante: não há tela nem campo no painel para alterá-lo.
- Ou seja: hoje não há como definir R$/km, taxa mínima, taxa máxima, raio ou áreas no painel.

---

## 3. Se você lembra de ter configurado “R$ X por km” antes

Algumas possibilidades:

- Era em **outro sistema ou versão** do produto.
- Era uma **previsão ou desenho** da funcionalidade (por exemplo, em documento de requisitos).
- No **221gourmet** existe um documento de **análise/spec** que descreve exatamente essa funcionalidade e onde ela deveria ficar: o arquivo **`ANALISE_TAXA_ENTREGA_POR_DISTANCIA.md`** na raiz do projeto. Ele descreve:
  - Onde deveria ficar: **Configurações → Delivery → seção "Taxa de entrega"** (uma nova seção na mesma aba em que hoje estão “Aparecer no Delivery”, “Descrição para IA” e “Produtos”).
  - Quais campos: valor base (R$), valor por km (R$), raio máximo (km), taxa mínima, taxa máxima, pedido mínimo para isenção, etc.
  - Regras de cálculo, migração e fallback (ex.: manter R$ 5,00 quando a regra não estiver configurada).

Essa análise **não foi implementada** no código: a tela e os campos ainda não existem no painel.

---

## 4. Resumo

| Pergunta | Resposta |
|----------|----------|
| **Em qual menu fica a configuração de taxa por distância?** | Não existe. A única configuração de delivery no painel é: **Configurações → Delivery** (menu lateral) → lá só há “Aparecer no Delivery”, “Descrição para IA” e “Produtos”. |
| **Dá para definir R$/km, taxa mínima, máxima, raio e áreas/bairros?** | Não. Nenhum desses campos existe no painel hoje. O valor da entrega no checkout é fixo (R$ 5,00) no código. |
| **Isso mudou de lugar em alguma atualização?** | Não. Essa configuração nunca foi implementada no painel; não houve “mudança de lugar”. |
| **Passo a passo com nome exato das seções** | 1) Entrar no painel do restaurante. 2) Clicar em **Delivery** no menu lateral. 3) Você verá apenas as três seções listadas acima; não há outra tela de “Taxa de entrega” ou “Frete”. |

Para ter taxa configurável por distância (R$/km, mínima, máxima, raio, etc.), seria necessário desenvolver a funcionalidade usando, por exemplo, o **`ANALISE_TAXA_ENTREGA_POR_DISTANCIA.md`** como especificação e adicionar a seção **“Taxa de entrega”** dentro de **Configurações → Delivery**, conforme descrito naquele documento.
