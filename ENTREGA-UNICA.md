# Entrega única — BOM Analytics Mont10

## URL do Additional App (cole no Platform Manager)

```
https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-v2.html?snapshot=data/mont10.json&v=entrega1
```

**Atenção:** `mouraenderson` (com **e**), não `mouraanderson`.

## O que você deve ver

- Título: **Mont10**
- **3** itens no total
- **3** aprovados
- Sem erro de rede / sem demo Drone
- Não precisa clicar **Varrer** (dados já vêm do arquivo)

## Se não aparecer assim

1. Remova o widget do dashboard e adicione de novo com a URL acima.
2. Ctrl+Shift+R na aba do dashboard.
3. Confirme que é **Additional App** (não só Web Page Reader antigo).

## Atualizar com a grade real do Explorer (quando quiser)

1. Explorer Mont10 → selecione linhas → **Ctrl+C**
2. Abra https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/collect.html
3. Cole → **Gerar JSON** → **Baixar**
4. Substitua `data/mont10.json` no GitHub (commit) — a mesma URL passa a refletir a estrutura real.

## Automático (futuro, não desta entrega)

Precisa coletor com API no host que o F12 mostra com status 200 — não é esta URL.
