# Validação obrigatória — Expand Item no 3DDashboard (DEC-015)

**Build:** `bom20260614e`  
**Status:** ⏳ **bloqueado em validação Postman** (auth/transporte POST)  
**PR:** #11 — **não fazer merge** até Postman/probe OK  
**Protocolo Postman:** [`VALIDACAO-EXPAND-ITEM-POSTMAN.md`](./VALIDACAO-EXPAND-ITEM-POSTMAN.md)

---

## Situação conhecida no tenant (2026-06-11)

| Host | POST expand | Interpretação |
|------|-------------|---------------|
| `*-space` | **403** | CSRF/SecurityContext/permissão (contrato correto, auth incompleta) |
| `*-ifwe` | **405** | Host errado para dseng — **não usar** |

Root 32 hex e normalizador Path: **OK**. Próximo gate: **Postman ou probe dashboard** com CSRF oficial.

---

## Pré-requisito Pages

```text
https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-v3-08i.html?v=bom20260614e
```

Pill: `bom20260614e`

---

## Fase 1 — Postman (obrigatória antes de novo patch)

1. Importar `postman/Expand-Item-DEC015.postman_collection.json` + environment tenant  
2. Autenticar CAS/Postman Primer  
3. Executar requests 1→2→3  
4. Preencher relatório em `VALIDACAO-EXPAND-ITEM-POSTMAN.md`

**Alternativa:** probe no iframe widget:

```javascript
await fetch('https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/scripts/expand-item-postman-probe-dashboard.mjs')
  .then(r => r.text())
  .then(src => import(URL.createObjectURL(new Blob([src], { type: 'text/javascript' }))))
  .then(m => m.runExpandItemPostmanProbe());
window.__expandItemPostmanReport
```

---

## Fase 2 — Widget (somente se Postman = 200 + Path)

```javascript
await window.__expandItemProbe(2)
```

Logs obrigatórios `[ExpandItemProvider]`:

- `rootId:` — 32 hex  
- `status:` — **200** (não 403/405/0)  
- `path count:` — **> 0**  
- `normalized rows:` — **> 0**  

Objetos: `__lastExpandItemPayload`, `__lastExpandItemRows`, `__lastExpandItemStats`

**Atualizar estrutura** → `Expand Item: X linhas`, KPI = `rows.length`

---

## Checklist aceite final

- [ ] Postman/probe: CSRF 200 + token presente  
- [ ] Postman/probe: root validation 200  
- [ ] Postman/probe: POST expand 200 + Path count > 0  
- [ ] Pill `bom20260614e` (ou `14f` após patch transporte)  
- [ ] `__expandItemProbe(2)` → Path real no dashboard  
- [ ] Atualizar estrutura carrega tabela  
- [ ] Full BOM API **não** usado como fallback  
- [ ] Sem host `*-ifwe*` para dseng  

---

## Evolução erros widget

| Build | Erro | Causa |
|-------|------|-------|
| 14a | CORS/0 | x-csrf-token manual |
| 14c | 415 | Content-Type |
| 14d | 403 space | POST sem ENO_CSRF_TOKEN |
| 14e | 405 ifwe | Fallback host errado |

---

## Root resolution (inalterado)

1. ExplorerContext / seleção  
2. `EnoviaApi.resolveEngItemMember`  
3. UQL label/título  
4. KNOWN_ROOT fallback — só teste, log explícito  

Playwright headless: sem sessão — não substitui Postman/probe dashboard.
