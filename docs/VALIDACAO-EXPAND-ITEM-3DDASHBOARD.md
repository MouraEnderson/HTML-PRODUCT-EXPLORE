# Validação obrigatória — Expand Item no 3DDashboard (DEC-015)

**Build:** `bom20260614a`  
**Status:** ⏳ pendente validação com sessão 3DEXPERIENCE autenticada  
**PR:** #11 — **não fazer merge** até concluir esta checklist

---

## Pré-requisito

GitHub Pages deve servir `bom20260614a` (widget boot: `Carregando build 20260614a (Expand Item · DEC-015)`).

Verificar:

```text
https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-v3-08i.html?v=bom20260614a
```

---

## Passos no tenant piloto

1. Abrir dashboard piloto com Product Structure Explorer e estrutura carregada.
2. Widget: `widget-v3-08i.html?v=bom20260614a`
3. Console do widget (iframe):

```javascript
await window.__expandItemProbe(1)
await window.__expandItemProbe(2)
await window.__expandItemProbe(99)
```

4. Conferir logs `[ExpandItemProvider]`:

- `rootId:` — id interno 32 hex (não `prd-R...`)
- `levels:` — 1, 2, 99
- `raw member count:`
- `reference count:`
- `instance count:`
- `path count:` — **> 0**
- `normalized rows:` — **> 0**
- `first raw path:`
- `first normalized row:`

5. Objetos globais:

```javascript
window.__lastExpandItemPayload   // member + Path
window.__lastExpandItemRows      // { source, rows, stats }
```

6. **Atualizar estrutura** — status deve mostrar `Expand Item: X linhas` com `X === rows.length`.

7. Comparar profundidade: se Explorer está expandido 2 níveis, `EXPAND_ITEM_LEVELS=2` deve aproximar a contagem; `99` pode trazer mais linhas (comportamento esperado da API).

---

## Critérios de aceite

| Critério | Esperado |
|----------|----------|
| POST `/dseng:EngItem/{id}/expand` | 200 |
| Payload | `member` com `Path` |
| `pathCount` | > 0 |
| `normalizedRows` | > 0 |
| Hierarquia | `level` correto por Path |
| Instâncias | `instanceId` preservado |
| Deduplicação | não colapsar por `referenceId` sozinho |
| Total Peças | `rows.length` |
| Modo | Expand Item Provider (não Full BOM API) |
| Console | limpo (sem probes RAW 404/403) |

---

## Root resolution (release)

Ordem dinâmica — hardcode `KNOWN_ROOT_BY_PRD` só como último fallback:

1. ExplorerContext / seleção
2. `EnoviaApi.resolveEngItemMember`
3. UQL por título
4. `KNOWN_ROOT_BY_PRD` (temporário)

---

## Tentativa Cloud Agent (2026-06-14)

- GitHub Pages: `bom20260614a` publicado via branch `gh-pages`.
- Playwright headless: redirecionado para **Login | 3DEXPERIENCE ID** — sem sessão autenticada.
- Widget direto (sem WAF): `__expandItemProbe` falha em resolver root (esperado fora do 3DDashboard).

**Conclusão:** validação real depende de execução no Console do widget dentro do 3DDashboard com usuário logado.
