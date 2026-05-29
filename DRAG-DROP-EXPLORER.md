# Drag & Drop — estrutura do Product Explorer

## Por que isso funciona no Web Page Reader

Arrastar arquivo **não usa API** nem sincronização com o Explorer.  
O navegador lê o Excel/CSV **localmente** → KPIs, gráficos e tabela funcionam.

## Passo a passo

1. Abra **Product Structure Explorer** (aba EXPLORE).
2. Carregue o produto (ex.: Drone) e **expanda** a estrutura se precisar.
3. **Exporte para Excel** (menu Export / ferramentas do Explorer).
4. No widget **Web Page Reader** (URL GitHub Pages):
   - Arraste o `.xlsx` para a área **"Arrastar estrutura do Product Explorer"**
   - Ou clique **Escolher arquivo**
5. O dashboard monta árvore, KPIs e colunas automaticamente.

## Formatos aceitos

- `.xlsx` / `.xls` (recomendado)
- `.csv`

## Colunas reconhecidas (cabeçalho)

Nome, Title, Tipo, Revisão, Estado, Nível, Quantidade, Owner, Organization, etc.  
(Português ou inglês.)

## Limitação

- Precisa **exportar** de novo se a estrutura mudar no Explorer.
- Não é tempo real (diferente do 3DSpace com API).

## URL do widget

```
https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/index.html
```
