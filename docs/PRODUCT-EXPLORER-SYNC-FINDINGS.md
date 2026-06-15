# Product Structure Explorer — Sync Findings

**Data:** 2026-06-17  
**Build:** `bom20260617d` (PR #23)  
**Objetivo:** BOM Analytics acompanha Product Structure Explorer como camada analítica; dados via SKA BOM Service / dseng.

---

## 1. Perguntas objetivas

| # | Pergunta | Resposta |
|---|----------|----------|
| 1 | API oficial para item selecionado no PSE? | **Parcial — sim** via `DS/PlatformAPI/PlatformAPI.getSelection()` e `DS/Selection/Selection.getSelection()` (RequireJS). Documentado no ecossistema 3DEXPERIENCE Platform API. |
| 2 | Evento oficial de seleção? | **Não encontrado** evento estável exposto ao widget BOM para PSE vizinho. Bridge usa `postMessage` (`ENOPSTR_selection`, `ENOSCEN_selection`) — **não é contrato oficial documentado** para este widget. |
| 3 | Evento oficial de expansão? | **Não encontrado** contrato confiável para nós expandidos/carregados do PSE. |
| 4 | API para root/current object do widget vizinho? | **Parcial** — `PlatformAPI.getSelection()` retorna seleção atual da plataforma; `ExplorerContext` agrega query/hash/selection. Sem API “get neighbor widget root” comprovada. |
| 5 | API para lista de nós expandidos? | **Não** via contrato oficial acessível ao BOM widget. |
| 6 | Widget BOM recebe contexto PSE por contrato oficial? | **Parcial (CAMINHO B)** — seleção via PlatformAPI; root/name via ExplorerContext + query; **não** mirror visual/expansão. |
| 7 | `explorer-mirror-provider` usa contrato estável? | **Não** — postMessage + heurísticas; DEC-016/017 encerraram como fonte operacional. |
| 8 | `expand-item-provider` usa contrato oficial? | **Sim (dseng)** via WAFData POST EngItem/expand — **diagnóstico/legado**, não sync PSE. |
| 9 | APIs testadas no código | PlatformAPI, Selection, ExplorerContext, ProductExplorerBridge, WAFData, widget.requirejs |
| 10 | APIs que não funcionaram como sync final | DOM scrape (`window.top.document`), clipboard, TSV, Explorer Mirror operacional, expand-item como tabela principal |
| 11 | Caminho recomendado | **CAMINHO B** — sync por contexto/seleção oficial (PlatformAPI + ExplorerContext), botão **Sincronizar com Product Explorer**, depth manual em Avançado, SKA BOM Service como fonte de dados |

---

## 2. APIs pesquisadas no repositório

| API / módulo | Arquivo | Uso atual | Confiável para sync? |
|--------------|---------|-----------|----------------------|
| `DS/PlatformAPI/PlatformAPI.getSelection` | `product-explorer-bridge.js` | Poll seleção | **Sim (oficial)** |
| `DS/Selection/Selection.getSelection` | `product-explorer-bridge.js` | Poll seleção | **Sim (oficial)** |
| `ExplorerContext.refresh/get` | `explorer-context.js` | physicalId, rootName | **Sim**, com `refresh(false)` sem DOM poll |
| `ProductExplorerBridge.subscribe` | `product-explorer-bridge.js` | postMessage/hash | **Secundário** — não contrato oficial |
| `widget.addEvent` | `widget-v3-08i.html` | onLoad/onRefresh | Widget lifecycle only |
| `WAFData.authenticatedRequest` | expand-item, enovia-api | dseng browser | Oficial ENOVIA, **não** para sync PSE |
| `window.postMessage` ENOPSTR_* | mirror-provider, bridge | Mirror | **Workaround** — proibido como fonte final |
| `window.top.document` scrape | bridge, mirror | Chrome PSE | **Proibido** — frágil |
| `PlatformAPI.publish` | `3dplay-bridge.js` | 3DPlay | Não aplicável à BOM table |

---

## 3. Decisão técnica — CAMINHO B

**Implementado:** `assets/js/integration/product-explorer-sync-provider.js`

### Fluxo

1. `ProductExplorerSyncProvider.refresh()` tenta `PlatformAPI.getSelection()`.
2. Complementa com `ExplorerContext.refresh(false)` (sem poll DOM).
3. Emite contexto interno `{ rootId, selectedId, title, source, eventType, path }`.
4. Botão **Sincronizar com Product Explorer** → `rootId` detectado → POST SKA BOM Service.
5. Botão **Atualizar BOM** → repete última sync com mesmo root/depth.
6. Root Physical ID + Profundidade ficam em **Avançado** (fallback manual).

### Limitações documentadas (honestas)

- **Expansão visual automática do PSE não está disponível** por contrato oficial neste runtime.
- Contagem dseng (`depth`) é controlada pelo SKA Service, **não** pela grade visual expandida à esquerda.
- Se PlatformAPI indisponível (ex.: localhost), status: *Contexto indisponível — modo avançado*.

### Auto-sync

- Se `PlatformAPI.getSelection` disponível no 3DDashboard, poll leve (3s) + debounce 500ms dispara refresh de contexto.
- Sync automático de **dados** (chamada Render) só se `__BOM_EXPLORER_AUTO_SYNC__ === true` (opt-in; default **false** no PR #20 v1).

---

## Hardening final PR #20 → estabilização PR #21

**Build ativo:** `bom20260617b` (substitui `bom20260617a` — ver `docs/RUNTIME-STABILIZATION-PR21.md`)

| Regra | Implementação |
|-------|---------------|
| ProductExplorerBridge / postMessage | **Não é fonte operacional.** Apenas diagnóstico. |
| Explorer Mirror / Expand Item | **Não carregam no boot principal.** Somente `__BOM_DEBUG__`. |
| Fonte operacional de contexto | PlatformAPI + ExplorerContext |
| Fonte operacional de dados | SKA BOM Service / dseng |
| Runtime widget | `widget-runtime-bom20260617b.js` (ES5, boot idempotente) |
| Release manifest | `window.__BOM_RELEASE_PROBE__()` → build 17b + commit |

**URL widget:**
`widget-v3-08i.html?v=bom20260617b&t=3dx&probe=<commit>`

---

## 4. Fonte oficial de dados

**SKA BOM Service:** `POST https://bom-resolver.onrender.com/api/3dx/bom/structure`  
`credentials: omit` — sem Authorization/Cookie no browser.

Product Explorer fornece **contexto** (rootId/seleção).  
SKA Service fornece **rows/counts/diagnostics**.

---

## 5. Por que não clipboard / TSV / DOM / Mirror

| Abordagem | Motivo de rejeição |
|-----------|-------------------|
| Clipboard Ctrl+C | Frágil, bloqueado em iframe, DEC-018 |
| TSV | Não é contrato; diverge do Explorer visual |
| DOM scraping | Quebra com UI DS; proibido como solução final |
| Explorer Mirror | Workaround postMessage; não contrato oficial |
| Expand Item tabela | Backend legado browser; não SKA architecture |

---

## 6. Referências externas (oficiais / técnicas)

- [3DEXPERIENCE Platform API — Widget development](https://media.3ds.com/support/documentation/developer/Cloud/en/English/) — ecossistema widget/UWA/PlatformAPI (documentação DS).
- RequireJS modules `DS/PlatformAPI/PlatformAPI`, `DS/Selection/Selection` — padrão 3DDashboard Additional App.
- [MDN — fetch credentials](https://developer.mozilla.org/en-US/docs/Web/API/fetch#credentials) — `omit` para CORS sem cookie.

---

## 7. Próximos passos (pós PR #20)

1. Validar `PlatformAPI.getSelection` no tenant piloto com PSE aberto (3DDashboard).
2. Se DS publicar evento oficial PSE→widget, migrar de poll para subscribe (CAMINHO A).
3. PR 5 — limpeza legado mirror/clipboard do boot.
4. Opcional: `depth` inferido por política de produto (não por contagem visual Explorer).

---

## 8. PR #23 — resolução no backend (decisão 2026-06-11)

**Problema:** PlatformAPI/ExplorerContext frequentemente retorna título, instância ou ID não aceito diretamente por `/dseng:EngItem/{ID}`. Validar regex no frontend não entrega BOM operacional.

**Decisão:**

| Camada | Responsabilidade |
|--------|------------------|
| Frontend | Capturar contexto bruto sanitizado (`getRawSelectionContext`) |
| Backend | `POST /api/3dx/bom/resolve-selection` → candidatos → `GET EngItem` → `/structure` |
| Avançado | `POST /api/3dx/bom/structure` com Root Physical ID manual |

**Fluxo Sincronizar:** refresh PSE → resolve-selection → render rows.  
**Não fazer:** chamar `/structure` com título/label como rootId no sync PSE.

Ver `docs/SELECTION-RESOLVER-PR23.md`.
