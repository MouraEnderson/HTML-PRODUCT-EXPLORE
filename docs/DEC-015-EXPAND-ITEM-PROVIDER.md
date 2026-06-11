# DEC-015 — Expand Item Provider

**Data:** 2026-06-14  
**Build:** `bom20260614a`  
**Arquivo:** `assets/js/integration/expand-item-provider.js`

---

## Decisão

**Expand Item** (`dseng:EngItem/{id}/expand`) passa a ser a **fonte principal candidata** para atender o objetivo original do app: espelhar a estrutura expandida/carregada do Product Structure Explorer via API oficial.

**Full BOM API** permanece disponível como **modo alternativo** (`DATA_SOURCE = 'full-bom-api'`).

---

## Contrato Expand Item

Endpoint (POST):

```
/resources/v1/modeler/dseng/dseng:EngItem/{internalRootId}/expand
```

- `{internalRootId}` = id interno **VPMReference** (ex.: `63FC553465A62400699E0792000086AB`)
- **Não** usar `name` `prd-R...` diretamente no path
- Body documentado: `expandDepth`, `withPath: true`, filtros `VPMReference` / `VPMInstance`
- Autenticação: `WAFData.authenticatedRequest` + `SecurityContext`

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
4. `KNOWN_ROOT_BY_PRD` — **apenas fallback temporário de teste** (último recurso)

## Configuração

```javascript
APP_CONFIG.DATA_SOURCE = 'expand-item';      // principal
APP_CONFIG.EXPAND_ITEM_LEVELS = 99;          // expandDepth enviado ao POST /expand
// alternativo:
APP_CONFIG.DATA_SOURCE = 'full-bom-api';
```

### Profundidade vs Explorer visual

`EXPAND_ITEM_LEVELS` controla `expandDepth` na API. Valores altos (ex.: 99) podem retornar **mais linhas** que o Explorer com expansão parcial. Para aproximar a contagem visual do Explorer, use a **mesma profundidade** que o usuário expandiu (ex.: probe `__expandItemProbe(2)` antes de `Atualizar estrutura` com `EXPAND_ITEM_LEVELS = 2`).

---

## Fluxo Atualizar estrutura (`expand-item`)

1. Resolver `rootId` interno (search EngItem / seleção Explorer / mapa conhecido)
2. POST Expand Item com `EXPAND_ITEM_LEVELS`
3. `normalizeExpandItemPayload`
4. Renderizar tabela + KPIs sobre `rows`
5. Status: `Expand Item: X linhas carregadas`

**Não** chama Full BOM API neste modo.

---

## Probe de teste

```javascript
await window.__expandItemProbe(2);
// window.__lastExpandItemPayload — raw
// window.__lastExpandItemRows — normalizado
```

Logs: `[ExpandItemProvider] rootId:`, `levels:`, contagens, primeiro path, primeira linha.

---

## Reprovados (inalterado)

- DOM scraping / mirror visual
- TSV / clipboard
- `slice(expectedCount)`
- Full BOM API como espelho do Explorer
- Probes RAW 404/403 no fluxo normal de produção

---

## Relacionados

- DEC-014: Mirror Explorer via widget separado reprovado; Full BOM API como alternativa
- `docs/RELATORIO-ENTREGA-BOM-API-2026-06-13.md`
