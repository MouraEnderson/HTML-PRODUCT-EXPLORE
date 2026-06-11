# DEC-015 — Expand Item Provider

**Data:** 2026-06-14  
**Build:** `bom20260614c`  
**Referência:** [dseng_v1](https://media.3ds.com/support/documentation/developer/Cloud/en/DSDoc.htm?show=CAAEngineeringWS/dseng_v1.htm) — validado via SDK oficial `ws3dx.dseng` (DS CPE EMED)

---

## Decisão

**Expand Item** (`dseng:EngItem/{id}/expand`) passa a ser a **fonte principal candidata** para atender o objetivo original do app: espelhar a estrutura expandida/carregada do Product Structure Explorer via API oficial.

**Full BOM API** permanece disponível como **modo alternativo** (`DATA_SOURCE = 'full-bom-api'`).

---

## Contrato oficial Expand Item (dseng_v1)

Fonte: documentação **Engineering Web Services** (`dseng_v1`) + implementação de referência `ws3dx.dseng` (`EngItemService.Expand`, `IExpand`).

| Campo | Valor oficial |
|-------|----------------|
| **Método HTTP** | **POST** (único — não há GET documentado para `/expand`) |
| **Endpoint** | `{3DSpace}/resources/v1/modeler/dseng/dseng:EngItem/{ID}/expand` |
| **`{ID}`** | ID interno `dseng:EngItem` (32 hex) — **não** `name` `prd-R...` |
| **Content-Type** | `application/json` |
| **Headers widget** | `Accept: application/json` + `SecurityContext` via `WAFData.authenticatedRequest` |
| **Proibido no widget** | `x-csrf-token`, `X-CSRF-Token`, `PlatformContext.getHeaders()` manual |
| **Transporte widget** | **WAFData direto** — padrão documentado para custom widgets 3DDashboard |
| **Backend externo** | Não exigido pelo contrato dseng; server-side SDK usa 3DPassport + `SecurityContext` |

### Body POST oficial (`IExpand`)

```json
{
  "expandDepth": 2,
  "withPath": true,
  "type_filter_bo": ["VPMReference", "VPMRepReference"],
  "type_filter_rel": ["VPMInstance", "VPMRepInstance"]
}
```

| Propriedade | Semântica (dseng_v1) |
|-------------|----------------------|
| `expandDepth` | `-1` = todos os níveis; `1`, `2`, `3`… = profundidade específica. **Default doc: `1`** |
| `withPath` | `true` retorna objetos `Path` no `member` (obrigatório para normalização DEC-015) |
| `type_filter_bo` | Default `["VPMReference"]`; autorizado: `VPMReference`, `VPMRepReference` |
| `type_filter_rel` | Default `["VPMInstance"]`; autorizado: `VPMInstance`, `VPMRepInstance` |
| `filter` | Opcional — filtro avançado (Public Filter Specification) |

### Response (exemplo confirmado tenant + doc)

```json
{
  "totalItems": 4,
  "member": [
    { "type": "VPMReference", "id": "DDED8256...", "title": "...", "name": "prd-...", "revision": "A", "state": "IN_WORK" },
    { "type": "VPMInstance", "id": "DDED8256...", "name": "Physical Product....1" },
    { "Path": ["DDED8256...(root)", "DDED8256...(instance)", "DDED8256...(childRef)"] }
  ]
}
```

- **`member`**: mix de `VPMReference`, `VPMInstance` e `{ Path: [...] }`
- **`Path`**: cadeia `Reference → Instance → Reference → …`
- **`totalItems` / `member.length`**: estatística API — **não** total visual da tabela

---

## Contrato Expand Item (implementação)

Endpoint:

```
/resources/v1/modeler/dseng/dseng:EngItem/{internalRootId}/expand
```

- `{internalRootId}` = id interno **VPMReference** (ex.: `63FC553465A62400699E0792000086AB`)
- **Não** usar `name` `prd-R...` diretamente no path
- Body documentado (POST): `expandDepth`, `withPath: true`, filtros `VPMReference` / `VPMInstance`
- Autenticação: `WAFData.authenticatedRequest` + `SecurityContext` (sem headers CSRF manuais)

---

## Transporte HTTP (`bom20260614c`)

### Implementação

**Uma única chamada POST** conforme dseng_v1 — sem cascade GET/POST especulativo, sem fallback silencioso para Full BOM API.

```javascript
WAFData.authenticatedRequest(url, {
  method: 'POST',
  type: 'json',
  headers: { Accept: 'application/json', SecurityContext: '...' },
  data: JSON.stringify({ expandDepth, withPath: true, type_filter_bo, type_filter_rel })
});
```

Logs probe: `transport: direct-wafdata`, `method: POST`, `url`, `custom headers`, `status`.

### Correção CORS (`bom20260614b`)

Removido `PlatformContext.getHeaders()` que injetava `x-csrf-token` → preflight bloqueado no iframe GitHub Pages.

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

## Validação bom20260614c

| Item | Valor |
|------|-------|
| Método | POST (dseng_v1) |
| Transporte | direct-wafdata |
| Body | `expandDepth` + `withPath: true` + type_filter_* |
| Headers | Accept + SecurityContext (sem CSRF manual) |
| Validação tenant | _pendente_ — `__expandItemProbe(2)` |

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
