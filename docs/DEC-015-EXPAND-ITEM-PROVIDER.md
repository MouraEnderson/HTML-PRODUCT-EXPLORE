# DEC-015 — Expand Item Provider

**Data:** 2026-06-14  
**Build:** `bom20260614f`  
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

## Transporte HTTP (`bom20260614f`)

### Evolução de erros no tenant

| Build | Erro | Causa provável |
|-------|------|----------------|
| 14a | CORS / ResponseCode 0 | `x-csrf-token` manual → preflight bloqueado |
| 14c | HTTP 415 | Content-Type/body incorreto |
| 14d | HTTP 403 | POST sem CSRF/contexto válido via `authenticatedRequest` cross-origin |
| 14e | HTTP 405 | Retry host **ifwe** — host inválido para dseng |
| 14f | — | CSRF oficial + POST **space-only** + validação automática no widget |

### Implementação 14f (oficial)

1. `GET {space}/resources/v1/application/CSRF` → `csrf.name` + `csrf.value` (`ENO_CSRF_TOKEN`)
2. `POST {space}/resources/v1/modeler/dseng/dseng:EngItem/{rootId}/expand` com body dseng_v1
3. Headers: `Accept`, `Content-Type`, `SecurityContext`, `[csrf.name]: csrf.value`
4. **Somente host `*-space*`** — nunca `ifwe`, nunca `proxifiedRequest` no fluxo principal
5. Painel **Validação Expand Item** no widget (`ExpandItemValidator.run()`)

Logs: `[ExpandItemValidator] CSRF status/name/value present`, POST expand, classificação A–F.

### Correção CORS (`bom20260614b`)

Removido `PlatformContext.getHeaders()` que injetava `x-csrf-token` → preflight bloqueado no iframe GitHub Pages.

### Regressão 14e (revertida em 14f)

Retry `*-space` ↔ `*-ifwe` e `proxifiedRequest` foram **removidos** do fluxo principal após **405** confirmado no tenant.

---

## Gate automático de validação (`bom20260614f`)

Antes de **Atualizar estrutura** com `DATA_SOURCE=expand-item`:

1. Usuário clica **Validar Expand Item** (Avançado) ou `AUTO_VALIDATE_EXPAND_ITEM=true` no boot.
2. `ExpandItemValidator.run()` executa WAFData → CSRF → root → POST → normalização.
3. Classificação **A** (`200` + `pathCount > 0` + `normalizedRows > 0`) libera **Atualizar estrutura**.
4. Classificação **B/C/D/E/F** bloqueia carga — mensagem:  
   `Expand Item ainda não validado. Rode Validação Expand Item.`
5. Full BOM API **não** é fallback silencioso.

Relatório copiável: `window.__lastExpandItemValidationReport` (JSON) via botão **Copiar relatório técnico**.

Documentação operacional: `docs/VALIDACAO-EXPAND-ITEM-AUTOMATICA.md`.

**PR #11 permanece draft** até classificação **A** no tenant real.

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

## Validação bom20260614f

| Item | Valor |
|------|-------|
| Método | POST (dseng_v1) |
| Transporte | `WAFData.authenticatedRequest` + GET CSRF + `ENO_CSRF_TOKEN` |
| Host | `*-space*` only (nunca ifwe) |
| Body | `expandDepth` + `withPath: true` + type_filter_* |
| Validação widget | **Validar Expand Item** (sem Console manual) |
| Gate | Atualizar estrutura só após classificação **A** |

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
- `docs/VALIDACAO-EXPAND-ITEM-AUTOMATICA.md`
- `docs/VALIDACAO-EXPAND-ITEM-3DDASHBOARD.md`
- `docs/RELATORIO-ENTREGA-BOM-API-2026-06-13.md`
