# BOM Analytics — modo snapshot (sem deploy 3DSpace)

## Ideia

1. **Explorer** — você abre Mont10 (ou outro assembly).
2. **Coletor** — copia a grade → gera JSON.
3. **Widget GitHub** — só **lê** o JSON (KPIs, gráficos, tabela).

Não precisa publicar pasta em `/enovia/webapps/`.

---

## Uso rápido (só colar, hoje)

1. Aba **PRODUCTEXPLORE** no 3DDashboard.
2. Explorer: abra **Mont10** → selecione linhas da grade → **Ctrl+C**.
3. No widget BOM, seção **“Estrutura do Explorer”** → **Ctrl+V** → **Importar cola**.
4. Deve mostrar **Mont10 / M1 / M2** (não Drone).

---

## Uso com JSON (recomendado para equipe)

### A — Gerar arquivo

Abra no navegador (logado ou não):

```
https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/collect.html
```

Cole a estrutura → **Gerar JSON** → **Baixar .json**.

### B — Publicar no GitHub (uma vez)

Coloque o arquivo em `data/`, por exemplo:

`data/mont10-snapshot.json`

(Quem mantém o repo faz commit, ou peça para incluir o anexo.)

### C — URL do Additional App

```
https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-uwa.html?snapshot=data/mont10-snapshot.json
```

Teste de exemplo (3 itens fictícios Mont10):

```
https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-uwa.html?snapshot=data/mont10-exemplo-snapshot.json
```

---

## O que você precisa criar no 3DDashboard

- **Additional App** (já tem) com URL do widget acima.
- **Não** precisa alterar deploy 3DSpace para os dados.
- Explorer continua à esquerda; BOM à direita lendo o snapshot.

---

## Quando quiser automático (futuro)

Aí sim: TI publica `webapps/BomAnalytics` e o widget aponta para o **3DSpace** — API varre a árvore sozinha.
