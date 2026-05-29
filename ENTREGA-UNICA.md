# Entrega — BOM Analytics Mont10 (dashboard 3DDashboard)

## URL do Additional App (cole no Platform Manager)

```
https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-v2.html?snapshot=data/mont10.json&v=bom20260601j
```

**Conta GitHub:** `mouraenderson` (com **e**).

**Build:** `bom20260601j` — Mont10 ao abrir **sem Varrer**; API só no botão verde.

## O que você deve ver (sem clicar Varrer)

| Campo | Valor |
|-------|--------|
| Estrutura | **Mont10** |
| Status | **Snapshot: Mont10 — 3 itens** |
| KPIs | 3 total, 3 aprovados |
| Tabela | Mont10, M1, M2 — Aprovado |

## Se o dashboard ainda mostrar build antigo (`bom20260601e`)

1. **Ctrl+Shift+R** na aba LISTA 3DX.
2. Remova o widget BOM e adicione de novo com a URL acima (pode manter só `widget-v2.html` — o snapshot padrão já vem embutido no build **f**).
3. Confira a faixa azul: **build bom20260601j**.

## Atualizar dados reais do Explorer

1. Explorer Mont10 → grade → **Ctrl+C**
2. https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/collect.html → colar → **Gerar JSON** → **Baixar**
3. Substituir `data/mont10.json` no repositório GitHub (commit).

## Varrer (futuro)

Quando a API ENOVIA responder no tenant, o botão verde continua disponível; a entrega atual usa **snapshot** para não depender de rede `*-space`.
