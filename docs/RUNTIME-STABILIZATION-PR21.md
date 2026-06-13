# Runtime Stabilization — PR #21

**Data:** 2026-06-11  
**Branch:** `hotfix/widget-3dx-runtime-stabilization-v1`  
**Build:** `bom20260617b`  
**Base audit commit (main pré-PR21):** `919b8ed`

---

## 1. Problema reportado

Após merge do PR #20 e correção do `WidgetCompilerException` (CDATA + `});` extra), o usuário ainda reportou:

- Link do widget não funcionando corretamente no 3DEXPERIENCE Web Page Reader
- Build pill exibindo **n14** / referências a builds antigos
- Erro `WidgetCompilerException: Compilation produced 11 syntax errors`

**Decisão:** não tratar como cache. Estabilizar release/runtime com build novo rastreável.

---

## 2. Inventário main (919b8ed) — PR #20 mergeado

### Commits desde PR #20

| Commit | Descrição |
|--------|-----------|
| `7c1e296` | PR #20 Product Explorer sync (bom20260617a) |
| `fb737b3` | Hardening bridge/boot/hotfix 16a removido |
| `919b8ed` | Fix CDATA + startBundle bracket balance |

### Boot produção (17a — estado auditado)

| Ordem | Arquivo |
|-------|-----------|
| inline | `widget-v3-08i.html` (paint + boot inline grande) |
| 1 | `chart.umd.min.js` |
| 2 | `bom-bundle-bom20260607a.js` |
| 3 | `product-explorer-sync-provider.js` |
| 4 | `bom-ska-service-hotfix-20260617a.js` |

### Riscos identificados

| Risco | Evidência |
|-------|-----------|
| `async/await` no hotfix 17a | `fetchBomStructureFromSkaService` — Rhino/WidgetCompiler |
| Boot inline grande | difícil validar XHTML; histórico de `});` extra |
| `Date.now()` cache bust | não rastreável por commit |
| Boot duplo 3DX | `executeInit` + `onLoad` + `widget.body` |
| Build 17a contaminado | histórico erro/cache/sintaxe |
| Bundle interno `config.js` BUILD `bom20260614n` | pill n14 se hotfix não sobrescrever |

### Referências legadas (não devem estar no boot produção)

| Termo | Runtime 17a boot |
|-------|------------------|
| n14 / bom20260614n | bundle interno apenas; hotfix sobrescreve |
| bom-api-id-hotfix | removido do boot PR #20 |
| explorer-mirror / expand-item | só `__BOM_DEBUG__` |
| ProductExplorerBridge operacional | removido PR #20 |
| clipboard / TSV | desabilitado no hotfix |

---

## 3. Decisão técnica PR #21

| Item | Decisão |
|------|---------|
| Build | **bom20260617b** (não reutilizar 17a) |
| Hotfix | `bom-ska-service-hotfix-20260617b.js` — ES5, sem async/await |
| Widget loader | `widget-v3-08i.html` mínimo + CDATA |
| Runtime externo | `widget-runtime-bom20260617b.js` — paint/boot ES5 |
| Cache bust | `?v=bom20260617b&c=dc91dcf` |
| Boot | idempotente via `__BOM_WIDGET_BOOT_STATE__` |
| Release | `__BOM_RELEASE_MANIFEST__` + `__BOM_RELEASE_PROBE__()` |
| Product Explorer Sync | preservado (PlatformAPI + ExplorerContext) |
| SKA BOM Service | preservado (`credentials: omit`) |

---

## 4. URLs finais

**Navegador direto:**
```
https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-v3-08i.html?v=bom20260617b&probe=dc91dcf
```

**3DEXPERIENCE Web Page Reader:**
```
https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-v3-08i.html?v=bom20260617b&t=3dx&probe=dc91dcf
```

**Verificação no console:**
```javascript
window.__BOM_RELEASE_PROBE__()
// { build: 'bom20260617b', commit: 'dc91dcf', ... }
```

---

## 5. Checklist de validação

- [ ] Build pill = **17b**
- [ ] `__BOM_RELEASE_PROBE__().build === 'bom20260617b'`
- [ ] Sem WidgetCompilerException no 3DX
- [ ] Sem async/await no boot principal
- [ ] Sem n14 / bom20260614n visível
- [ ] Botões Sincronizar / Atualizar BOM
- [ ] CJ MESA depth=1 = 5 em toda UI
- [ ] Sem Mirror/Expand/Bridge em produção

---

## 6. Rollback plan

Se 3DX continuar quebrando após merge PR #21:

1. Reverter merge PR #21 em `main` (restore widget boot anterior).
2. Identificar último widget que compilava no tenant (ex.: tag git `919b8ed`).
3. Reaplicar em PRs pequenos:
   - loader estável (Opção B)
   - provider ES5
   - hotfix SKA ES5
   - UX/count fixes

Não remendar main com commits diretos.

---

## 7. Por que 17a → 17b

- 17a publicado com histórico de WidgetCompilerException, cache confuso e build pill n14
- Novo build limpa rastreabilidade release (`probe=dc91dcf`)
- Hotfix 17b remove `async/await` e `.finally()` da cadeia principal
