# DEC-015 — Expand Item Provider

**Data:** 2026-06-14  
**Build:** `bom20260614b`  
**Arquivo:** `assets/js/integration/expand-item-provider.js`

---

## Decisão

**Expand Item** (`dseng:EngItem/{id}/expand`) passa a ser a **fonte principal candidata** para atender o objetivo original do app: espelhar a estrutura expandida/carregada do Product Structure Explorer via API oficial.

**Full BOM API** permanece disponível como **modo alternativo** (`DATA_SOURCE = 'full-bom-api'`).

---

## Contrato Expand Item

Endpoint:

```
/resources/v1/modeler/dseng/dseng:EngItem/{internalRootId}/expand
```

- `{internalRootId}` = id interno **VPMReference** (ex.: `63FC553465A62400699E0792000086AB`)
- **Não** usar `name` `prd-R...` diretamente no path
- Body documentado (POST): `expandDepth`, `withPath: true`, filtros `VPMReference` / `VPMInstance`
- Autenticação: `WAFData.authenticatedRequest` + `SecurityContext` (sem headers CSRF manuais)

---

## Transporte HTTP (`bom20260614b`)

### Problema `bom20260614a`

Chamada direta com `PlatformContext.getHeaders()` injetava `x-csrf-token` → preflight CORS bloqueado no iframe GitHub Pages:

```
Request header field x-csrf-token is not allowed by Access-Control-Allow-Headers
NetworkError ResponseCode value "0"
```

### Correção

1. **Headers mínimos:** apenas `Accept: application/json` + `SecurityContext` (de `PlatformContext.getState()`, nunca `getHeaders()`).
2. **Sem** `x-csrf-token`, `X-CSRF-Token`, `Content-Type` manual em GET.
3. **Cascade de métodos** (logs por tentativa):

| Id | Método | URL |
|----|--------|-----|
| A | GET | `/expand` |
| B | GET | `/expand?$expandDepth={levels}&withPath=true` |
| C | GET | `/expand?$levels={levels}` |
| D | POST | `/expand` + body documentado |

4. **Fallback backend-browser-auth** se direct-wafdata retorna status 0 / CORS:
   - `POST /api/bom/expand-item/start` → retorna mesmas tentativas
   - Front executa via WAFData limpo (padrão Full BOM API)

Logs probe:

```
[ExpandItemProvider] transport: direct-wafdata | backend-browser-auth
[ExpandItemProvider] method: GET | POST
[ExpandItemProvider] url: ...
[ExpandItemProvider] custom headers: Accept, SecurityContext
[ExpandItemProvider] status: 200
```

---

## Payload

O member contém:

| Tipo | Uso |
|------|-----|
| `VPMReference` | Metadados de referência (title, name, revision, state, owner…) |
| `VPMInstance` | Instância de montagem (name com sufixo `.1`, `.2`…) |
| `Path` | Cadeia hierárquica para reconstruir a árvore |

Exemplo de `Path`:

```
VPMReference(root) → VPMInstance → VPMReference(child) → …
```

---

## Normalização

Função: `normalizeExpandItemPayload(payload)`

Regras:

1. Dicionários `VPMReference` e `VPMInstance` por `id`
2. Extrair objetos com propriedade `Path` na ordem do payload
3. Cada `Path` gera linhas; `rowKey = Path.slice(0, i+1).join('/')`
4. **Não** deduplicar por `referenceId` sozinho — mesma referência em instâncias diferentes = linhas distintas
5. Raiz (`Path[0]`) incluída **uma vez** em `level: 0`
6. Para `i = 2, 4, 6…`: `level = i/2`, `parentReferenceId = Path[i-2]`, `instanceId = Path[i-1]`, `referenceId = Path[i]`

### O que NÃO usar como total visual

- `member.length`
- `totalItems`

O **Total Peças** e a tabela usam **`rows.length`** após normalização.

---

## Resolução de root

Ordem (dinâmica):

1. `ExplorerContext` / seleção Explorer — id interno VPMReference (32 hex)
2. `EnoviaApi.resolveEngItemMember(prd-R…, rootName)` — UQL exato
3. `findEngItemByLabel` / UQL por título da estrutura
4. `KNOWN_ROOT_BY_PRD` — **apenas fallback temporário** com log:
   `KNOWN_ROOT fallback usado — não válido para release genérico`

Log: `[ExpandItemProvider] root resolution source:`

---

## Configuração

```javascript
APP_CONFIG.DATA_SOURCE = 'expand-item';      // principal
APP_CONFIG.EXPAND_ITEM_LEVELS = 2;           // teste inicial (depois 99 ou valor do usuário)
// alternativo:
APP_CONFIG.DATA_SOURCE = 'full-bom-api';
```

### Profundidade vs Explorer visual

`EXPAND_ITEM_LEVELS` controla `expandDepth` na API. Valores altos (ex.: 99) podem retornar **mais linhas** que o Explorer com expansão parcial. Para aproximar a contagem visual do Explorer, use a **mesma profundidade** que o usuário expandiu.

---

## Fluxo Atualizar estrutura (`expand-item`)

1. Resolver `rootId` interno
2. Expand Item (transporte corrigido)
3. `normalizeExpandItemPayload`
4. Renderizar tabela + KPIs sobre `rows`
5. Status: `Expand Item: X linhas carregadas`
6. Banner: `Explorer carregado: N | Expand Item: X linhas | modo dseng/expand`

**Não** chama Full BOM API neste modo. **Não** fallback silencioso em caso de erro.

---

## Probe de teste

```javascript
await window.__expandItemProbe(1);
await window.__expandItemProbe(2);
await window.__expandItemProbe(99);
// window.__lastExpandItemPayload — raw
// window.__lastExpandItemRows — normalizado
// window.__lastExpandItemStats — transporte/status
```

---

## Validação bom20260614b

| Item | Status |
|------|--------|
| Método final usado | _pendente tenant_ (A/B/C/D — ver logs `method:`) |
| Transporte | direct-wafdata → backend-browser-auth se CORS |
| Payload real com Path | _pendente tenant_ |
| pathCount / normalizedRows | _pendente tenant_ |
| Full BOM API | modo alternativo apenas |
| DOM/TSV/clipboard | reprovados |

---

## Reprovados (inalterado)

- DOM scraping / mirror visual
- TSV / clipboard
- `slice(expectedCount)`
- Full BOM API como espelho do Explorer
- Probes RAW 404/403 no fluxo normal de produção
- Headers CSRF manuais cross-origin

---

## Relacionados

- DEC-014: Mirror Explorer via widget separado reprovado; Full BOM API como alternativa
- `docs/VALIDACAO-EXPAND-ITEM-3DDASHBOARD.md`
- `docs/RELATORIO-ENTREGA-BOM-API-2026-06-13.md`
