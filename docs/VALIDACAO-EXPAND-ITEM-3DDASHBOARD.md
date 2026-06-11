# Validação obrigatória — Expand Item no 3DDashboard (DEC-015)

**Build:** `bom20260614b`  
**Status:** ⏳ pendente validação com sessão 3DEXPERIENCE autenticada  
**PR:** #11 — **não fazer merge** até concluir esta checklist

---

## Pré-requisito

GitHub Pages deve servir `bom20260614b`:

```text
https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-v3-08i.html?v=bom20260614b
```

Boot esperado: `Carregando build 20260614b (Expand Item · DEC-015 transport fix)`

Pill: `bom20260614b`

---

## Correção transporte (`bom20260614b` vs `bom20260614a`)

| Problema 14a | Correção 14b |
|--------------|--------------|
| `PlatformContext.getHeaders()` → `x-csrf-token` | Headers mínimos: `Accept` + `SecurityContext` |
| POST direto único | Cascade GET A → B → C → POST D |
| CORS / ResponseCode 0 | Fallback `POST /api/bom/expand-item/start` |

---

## Passos no tenant piloto

1. Dashboard piloto + Product Structure Explorer com estrutura carregada.
2. Widget: `widget-v3-08i.html?v=bom20260614b`
3. Console do **iframe do widget**:

```javascript
await window.__expandItemProbe(1)
await window.__expandItemProbe(2)
await window.__expandItemProbe(99)
```

4. Logs obrigatórios `[ExpandItemProvider]`:

- `rootId:` — id interno 32 hex
- `root resolution source:` — dinâmico (não só KNOWN_ROOT)
- `levels:` — 1, 2, 99
- `transport:` — `direct-wafdata` ou `backend-browser-auth`
- `method:` — GET ou POST (qual tentativa venceu)
- `url:`
- `custom headers:` — **sem** x-csrf-token
- `status:` — HTTP real (não 0)
- `raw member count:`
- `reference count:`
- `instance count:`
- `path count:` — **> 0**
- `normalized rows:` — **> 0**
- `first raw path:`
- `first normalized row:`

5. Objetos globais:

```javascript
window.__lastExpandItemPayload
window.__lastExpandItemRows
window.__lastExpandItemStats
```

6. **Atualizar estrutura** → `Expand Item: X linhas` com `X === rows.length`

7. **Network tab:** sem erro CORS preflight por `x-csrf-token`

8. **Console:** limpo no fluxo normal

---

## Checklist aceite final

- [ ] Pill `bom20260614b`
- [ ] `DATA_SOURCE = expand-item`
- [ ] `__expandItemProbe(2)` → payload com `Path`
- [ ] `pathCount > 0`, `normalizedRows > 0`
- [ ] `status` HTTP real (não ResponseCode 0)
- [ ] Sem CORS por x-csrf-token
- [ ] Atualizar estrutura carrega tabela
- [ ] Total Peças = `__lastExpandItemRows.rows.length`
- [ ] Full BOM API **não** usado como fallback silencioso
- [ ] Root não depende só de hardcode
- [ ] KPI alinhado a rows normalizadas

---

## Profundidade

Config inicial: `EXPAND_ITEM_LEVELS = 2` (teste). Após validar, subir para 99 ou valor alinhado à expansão visual do Explorer.

---

## Root resolution

1. ExplorerContext / seleção
2. `EnoviaApi.resolveEngItemMember`
3. UQL label/título
4. KNOWN_ROOT fallback — log explícito, não release genérico

---

## Tentativas Cloud Agent

| Build | Resultado |
|-------|-----------|
| 14a | CORS x-csrf-token no tenant (reportado) |
| 14b | Patch aplicado; validação tenant pendente |

Playwright headless: sem sessão 3DEXPERIENCE — não substitui teste manual no dashboard.
