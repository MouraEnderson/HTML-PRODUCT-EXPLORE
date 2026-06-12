# DEC-016 — Explorer Mirror (fonte principal)

**Build:** `bom20260614k`

## Decisão

A tabela E-BOM e os KPIs principais usam **Explorer Mirror** como única fonte aceitável para o requisito de produto: refletir o Product Structure Explorer carregado/visível.

**Expand Item** permanece apenas como **diagnóstico técnico** (Avançado). Não alimenta a tabela principal.

## Modos

| Modo | Uso |
|------|-----|
| **A — Explorer Mirror** | Botão **Atualizar estrutura** — fonte principal |
| **B — Expand Item Diagnostic** | Avançado → Diagnóstico técnico Expand Item |

## Proibido na tabela principal

- DOM scraping, clipboard, TSV, Ctrl+C/Ctrl+V
- `slice(expectedCount)` ou cortar linhas para bater com Explorer
- Expand Item / Full BOM API como fonte silenciosa
- Mascarar divergência Explorer vs dashboard

## Validação de divergência

Se `explorerCount > 0` e `dashboardRows !== explorerCount`:

- Bloquear sucesso
- Não preencher tabela
- Mensagem: divergência Explorer vs fonte do dashboard

## Fontes oficiais tentadas (sem gambiarra)

1. `postMessage` (`3DX_STRUCTURE`, `ENOPSTR_*`, payload com `structureItems` / `loadedNodes`)
2. Cache `__BOM_OFFICIAL_STRUCTURE_CACHE__` (intercom widget)
3. AMD `ENOPSTR_AP` / `ENOSCEN_AP` (`getLoadedStructure`, `getVisibleNodes`)

Se nenhuma fonte retornar linhas que batam com o Explorer:

> Não foi encontrada fonte oficial para espelhar exatamente a grade atual do Product Structure Explorer.

## Relatório técnico

Campos: `explorerCount`, `dashboardRows`, `sourceUsed`, `sourceMode`, `isExplorerMirror`, `divergence`, `expandItemRows` (se diagnóstico executado).

## Widget piloto

```
https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-v3-08i.html?v=bom20260614k
```
