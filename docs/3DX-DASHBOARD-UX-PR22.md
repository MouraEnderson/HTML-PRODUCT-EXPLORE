# 3DX Dashboard UX — PR #22

**Data:** 2026-06-11  
**Branch:** `hotfix/3dx-dashboard-layout-context-empty-state-v1`  
**Build:** `bom20260617c`  
**Base:** PR #21 (`bom20260617b`) — runtime estável no Web Page Reader

---

## 1. Objetivo do dashboard

A BOM Analytics deve entregar ao usuário no 3DDashboard:

- Contexto da estrutura aberta/trabalhada no **Product Structure Explorer**
- Sincronização com **SKA BOM Service / dseng**
- Tabela **E-BOM** legível e central
- KPIs, gráficos, maturidade, proprietário, revisão, descrição e formato coerentes com o payload SKA
- Diagnostics técnico **compacto**
- Erro **honesto** quando contexto/rootId não é válido

A dashboard **não** pode mostrar número falso, gráfico com 1 quando SKA retornou 0/erro, nem depender do usuário interpretar stack trace para operar.

---

## 2. Problema visual observado (Web Page Reader real)

Após PR #21 (runtime 17b estável):

| Sintoma | Impacto |
|---------|---------|
| Topbar apertada; botão “Sincronizar…” quebra | UX operacional ruim |
| Coluna direita estreita | Gráficos/preview sem valor |
| Tabela E-BOM não protagonista | Objetivo principal obscurecido |
| Diagnostics invasivo | Empurra tabela; ocupa metade da tela em erro |
| KPI/gráfico mostrando **1** com SKA ERROR · 0 itens | Dado falso / estado inconsistente |

---

## 3. Decisão de layout — 3 zonas operacionais

Escopo CSS final em `.bom-layout-page.bom-3dx-product-dashboard` (não altera layouts históricos `.bom-layout-grid`).

```
┌─────────────────────────────────────────────────────────────┐
│ Zona 1 — Topbar compacta (brand, status, produto, ações)    │
├──────────────────────────────┬──────────────────────────────┤
│ Zona 2 — Banner, diag, filtros, KPIs                         │ Zona 3 — Gráficos │
├──────────────────────────────┼──────────────────────────────┤
│ Zona 4 — Tabela E-BOM (área principal)                       │ Zona 5 — Preview 3D │
└──────────────────────────────┴──────────────────────────────┘
```

Grid:

- Colunas: `minmax(0, 1fr)` + `clamp(240px, 28%, 340px)`
- Linhas: topbar auto · KPI/filtros ~24% · tabela+preview `1fr`

Topbar operacional:

- Esquerda: BOM Analytics + status curto
- Centro: produto selecionado (ellipsis)
- Direita: Sincronizar, Atualizar, badge SKA/dseng, build 17c, Avançado
- Modo compacto (&lt;980px): labels curtos + `title`/`aria-label` completos

---

## 4. Validação de rootId antes do SKA

Função `normalizeCandidateRootId(ctx, manualRootId)` no hotfix 17c:

| Critério | Aceito |
|----------|--------|
| String hex 24–32 chars | ✅ Physical ID dseng |
| Título, label, nome, id curto | ❌ Não chamar SKA |
| `prd-*` prefix | ❌ |
| Espaços | ❌ |

Fluxo:

1. Usuário seleciona item no PSE
2. PlatformAPI / ExplorerContext detecta contexto
3. **Validação** do candidato rootId
4. Se válido → POST SKA
5. Se inválido → `CONTEXT_INVALID`, tabela/KPI/gráficos zerados, orientação Avançado

**ROOT_NOT_FOUND** só aparece quando o ID enviado **parece válido** mas o backend negou — não por lixo/label enviado como rootId.

---

## 5. Erro / 0 itens zera toda UI

`renderEmptySkaState(reason, details)`:

- Limpa tabela, KPIs, gráficos, legends, pager, preview
- Define `__BOM_SKA_EMPTY_STATE__ = true`
- Patches em `App.refreshUI`, `KpiCards.render`, `ChartsManager.render` respeitam empty state
- Diagnostics compacto: resumo + “Detalhes” colapsável

Estados cobertos: contexto inválido, root ausente, ROOT_NOT_FOUND, payload 0 linhas, CORS/rede, erro backend.

---

## 6. Product Explorer context vs rootId dseng

O PSE pode **detectar seleção** (título, path, evento) sem entregar **Physical ID dseng** válido.

Isso **não é falha de backend** — é limitação de contexto. A UI mostra:

> Contexto detectado, mas sem Root Physical ID dseng válido

**Avançado** é fallback operacional (Root Physical ID + Profundidade + **Testar Root ID**), não fluxo principal.

---

## 7. Arquivos alterados (PR #22)

| Arquivo | Alteração |
|---------|-----------|
| `widget-v3-08i.html` | Boot `bom20260617c` + runtime 17c |
| `assets/js/build-id.js` | Build 17c |
| `assets/js/widget-runtime-bom20260617c.js` | Paint HTML 3 zonas + hotfix 17c |
| `assets/js/bom-ska-service-hotfix-20260617c.js` | Validação contexto, empty state, topbar, diagnostics |
| `assets/css/dashboard.css` | Seção PR #22 layout escopado |
| `scripts/test-pr22-local.mjs` | Testes A–E locais |

**Não alterado:** `backend/src`, contrato `/api/3dx/bom/*`, Mirror/Expand/clipboard/TSV/postMessage operacional.

---

## 8. Testes

| Teste | Critério |
|-------|----------|
| A | Build 17c, probe, layout class, sem 17b |
| B | Estado inicial sem dado fake / gráfico 1 |
| C | Contexto inválido **não** POST SKA |
| D | ROOT_NOT_FOUND zera UI |
| E | Avançado CJ MESA depth=1 → 5 linhas coerentes |
| F | Web Page Reader 3DEXPERIENCE (manual) |

Comando local:

```bash
python -m http.server 8080
node scripts/test-pr22-local.mjs
```

URL:

```
widget-v3-08i.html?v=bom20260617c&t=3dx&probe=<commit>
```

---

## 9. Sucessor — Visual aprovado (2026-06-17)

O layout evoluiu após PR #22 até o aceite visual do usuário piloto no Web Page Reader.

**Documento canônico:** [`docs/3DX-DASHBOARD-VISUAL-APPROVED-20260617.md`](3DX-DASHBOARD-VISUAL-APPROVED-20260617.md)

- Build: `bom20260617d`
- Commit: `abf29bc`
- Quadrantes: FILTRO | GRAFICO / EBOM | 3DVIEW
- Painel, Avançado e KPI row removidos da UX final
- LayoutFit neutralizado para o grid 3DX

---

## 10. Critério final de aceite (PR #22 histórico)

No Web Page Reader:

- Visualmente operacional (topbar legível, tabela central, diagnostics compacto)
- Sem dados falsos em erro
- Contexto validado antes do SKA
- CJ MESA via Avançado: 5 linhas coerentes em tabela/KPIs/gráficos/legend/pager
