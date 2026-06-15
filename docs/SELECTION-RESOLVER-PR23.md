# Selection Resolver — PR #23

**Data:** 2026-06-11  
**Branch:** `feature/backend-product-explorer-selection-resolver-v1`  
**Build frontend:** `bom20260617d`  
**Backend:** `POST /api/3dx/bom/resolve-selection`

---

## 1. Objetivo do dashboard

Entregar resultado operacional no 3DEXPERIENCE:

```
Product Structure Explorer (seleção)
  → frontend captura contexto bruto
  → backend resolve EngItem dseng
  → SKA BOM Service retorna rows/counts
  → dashboard: tabela, KPIs, gráficos, diagnostics
```

O frontend **sozinho** não consegue transformar seleção PSE em Physical ID dseng confiável — PlatformAPI/ExplorerContext pode retornar título, instância, relação ou ID não aceito por `/dseng:EngItem/{ID}`.

---

## 2. Por que PR #22 não fecha o projeto

PR #22 (`bom20260617c`) entrega:

- layout 3DX usável;
- empty state sem dado falso;
- diagnostics compacto;
- validação regex no frontend (evita lixo óbvio).

Mas **não resolve** seleção real do PSE quando o contexto não traz Physical ID dseng válido. PR #23 move a resolução para o backend.

---

## 3. Nova rota — `POST /api/3dx/bom/resolve-selection`

### Request

```json
{
  "selection": {
    "raw": {},
    "normalized": {},
    "source": "PlatformAPI/ExplorerContext",
    "manualRootId": "optional"
  },
  "depth": 1,
  "includeRoot": true,
  "mode": "dseng-official"
}
```

### Sucesso (HTTP 200)

Inclui `resolution` + mesmo contrato de `rows`/`counts`/`diagnostics` de `/structure`:

```json
{
  "ok": true,
  "resolution": {
    "status": "RESOLVED",
    "strategy": "direct-engitem",
    "rootId": "63FC553465A62400699E0792000086AB",
    "rootTitle": "CJ MESA 4BCS VP TOP 3DX",
    "attempts": []
  },
  "rows": [...],
  "counts": { "totalRows": 5 }
}
```

### Falha (HTTP 422)

```json
{
  "ok": false,
  "error": {
    "code": "SELECTION_NOT_RESOLVED",
    "message": "Não foi possível resolver a seleção..."
  },
  "resolution": {
    "status": "NOT_RESOLVED",
    "attempts": [...]
  }
}
```

---

## 4. Estratégias (`selectionResolver.js`)

Ordem segura:

| # | Estratégia | Ação |
|---|------------|------|
| 1 | `manual-root` | Root ID Avançado |
| 2 | `direct-engitem` | `normalized.rootId` / `selectedId` |
| 3 | `physicalid` / `reference-id` | Campos do objeto bruto sanitizado |
| 4 | `search-title` | **Não executa** busca ampla — registra tentativa SKIPPED |
| — | Cada candidato | `GET /dseng:EngItem/{ID}` via cliente existente |

Reutiliza `ThreeDxDsengClient`, `buildStructureFromRoot` e normalizer de `/structure`.

---

## 5. Fluxos frontend (`bom20260617d`)

| Ação | Endpoint |
|------|----------|
| **Sincronizar com Product Explorer** | `POST /resolve-selection` |
| **Testar Root ID / Avançado** | `POST /structure` |

### Contexto bruto

`ProductExplorerSyncProvider.getRawSelectionContext()`:

```json
{
  "source": "PlatformAPI/ExplorerContext",
  "selected": { "platformItem": {}, "explorerContext": {} },
  "normalized": {},
  "timestamp": "...",
  "page": "3DEXPERIENCE Web Page Reader"
}
```

Botão **Copiar diagnóstico de contexto** (Avançado) — debug técnico, não fluxo operacional.

---

## 6. Diagnostics

**Resolvido:**

> Product Explorer → SKA OK · 5 itens

Detalhes: `resolution.strategy`, `rootId`, `rootTitle`, `attempts`, `endpointsUsed`.

**Não resolvido:**

> Contexto não resolvido

Detalhes: candidates testados, status HTTP, `SELECTION_NOT_RESOLVED`.

---

## 7. Limitações

- PSE pode detectar seleção sem entregar ID dseng — backend tenta resolver; se falhar, diagnostics + fallback Avançado.
- Sem DOM scraping, clipboard operacional, TSV, Mirror, Expand Item, postMessage operacional.
- Deploy backend Render necessário para rota `/resolve-selection` em produção.

---

## 8. Testes

### Backend

```bash
cd backend && npm test
```

11 testes: `selectionResolver` (9) + `resolveSelection` mock (2).

### Frontend local

```bash
python -m http.server 8080
node scripts/test-pr23-local.mjs
```

### Integração Render (pós-deploy backend)

```bash
curl -s -X POST https://bom-resolver.onrender.com/api/3dx/bom/resolve-selection \
  -H "Content-Type: application/json" \
  -d '{"selection":{"normalized":{"rootId":"63FC553465A62400699E0792000086AB","title":"CJ MESA 4BCS VP TOP 3DX"}},"depth":1,"includeRoot":true,"mode":"dseng-official"}'
```

Esperado: `resolution.status=RESOLVED`, `rows.length=5`.

### 3DEXPERIENCE (manual)

1. Abrir PSE + BOM Analytics  
2. Selecionar CJ MESA  
3. **Sincronizar** → Network deve mostrar `/resolve-selection`  
4. Se resolver: tabela/KPIs/gráficos coerentes  
5. Se não: diagnostics + **Copiar diagnóstico de contexto** + Avançado com root manual = 5

---

## 9. URL widget

```
widget-v3-08i.html?v=bom20260617d&t=3dx&probe=<commit>
```

---

## 10. Diferença Product Explorer Sync vs Avançado

| | Product Explorer Sync | Avançado Root ID |
|--|----------------------|------------------|
| Entrada | Contexto PSE bruto + normalizado | Root Physical ID manual |
| Backend | `/resolve-selection` | `/structure` |
| Quando usar | Fluxo principal operacional | Fallback / debug / root conhecido |
