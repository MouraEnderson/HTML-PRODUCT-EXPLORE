# Colar estrutura do Product Explorer (sem Excel/CSV)

Quando **não há export** para XLS ou CSV, use **copiar e colar** da grade E-BOM.

## Passo a passo

1. Aba **EXPLORE** → Product Structure Explorer → abra o assembly (ex.: Drone).
2. Expanda a árvore até ver as linhas que quer no dashboard.
3. Na **tabela E-BOM** (lista com colunas Nome, Nível, Rev, etc.):
   - Clique na **primeira linha**;
   - **Shift+clique** na última linha (seleciona o bloco), ou use **Ctrl+A** se a grade permitir.
4. **Ctrl+C** (copiar).
5. Aba **PRODUCTEXPLORE** (Web Page Reader) → clique na **caixa grande** → **Ctrl+V**.
6. **Importar estrutura**.

## URL do widget

```
https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/index.html
```

Depois do deploy no 3DSpace, use a URL do tenant (BOM via API, sem colar).

## O que o HTML entende

- Texto separado por **tab** (padrão do Ctrl+C no Explorer).
- Com **cabeçalho** (Nível, Nome, Title…) ou só linhas de dados.
- **Nível** numérico na primeira coluna, ou indentação (espaços/tabs) no nome.

## Se não importar

- Copiou só **uma célula**? Selecione várias linhas.
- Copiou só o **nome do produto** no topo? Selecione linhas da **tabela E-BOM**.
- Mensagem de erro na barra vermelha? Envie um print — ajustamos o parser.

## Alternativa definitiva

Publicar `webapps/BomAnalytics` no **3DSpace** → BOM automática, sem copiar. Ver `DEPLOY-3DSPACE.md`.
