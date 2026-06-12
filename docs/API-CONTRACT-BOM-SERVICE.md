# API Contract — SKA BOM Service (Render)

**Serviço:** SKA BOM Service  
**Base URL (produção):** https://bom-resolver.onrender.com  
**Versão contrato:** v1 (documentação PR 1; implementação PR 2+)  
**Decisão:** DEC-018

---

## Rotas legadas (preservadas — não alterar contrato nesta fase)

| Método | Rota | Notas |
|--------|------|-------|
| GET | `/health` | `service: bom-resolver`, `version: 0.2.1` |
| POST | `/api/bom/resolve` | Server-auth resolver |
| POST | `/api/bom/browser/start` | Browser-auth job start |
| POST | `/api/bom/browser/continue` | Browser-auth job continue |
| POST | `/api/bom/expand-item/start` | Expand Item job (diagnóstico) |

---

## GET /api/3dx/bom/health (implementado — PR 2 mock)

**Status:** ✅ mock em `backend/src/routes/threeDxBomRoutes.js`

**Resposta 200:**

```json
{
  "ok": true,
  "service": "SKA_BOM_SERVICE",
  "source": "RENDER_BOM_SERVICE",
  "version": "v1",
  "mode": "mock"
}
```

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `ok` | boolean | Serviço operacional |
| `service` | string | Identificador fixo `SKA_BOM_SERVICE` |
| `source` | string | `RENDER_BOM_SERVICE` |
| `version` | string | Versão do contrato (`v1`) |
| `mode` | string | `mock` \| `dseng-official` |

---

## POST /api/3dx/bom/structure (implementado — PR 2 mock, PR 3 dseng real)

**Status:** ✅ mock em PR 2 — sem chamada 3DEXPERIENCE

### Request

**Headers:** `Content-Type: application/json`

**Body:**

```json
{
  "rootId": "63FC553465A62400699E0792000086AB",
  "depth": 2,
  "includeRoot": true,
  "mode": "dseng-official"
}
```

| Campo | Obrigatório | Default | Descrição |
|-------|-------------|---------|-----------|
| `rootId` | **sim** | — | Physical id `dseng:EngItem` (32 hex) |
| `depth` | não | `2` | Profundidade de expansão (inteiro ≥ 0) |
| `includeRoot` | não | `true` | Incluir linha da raiz em `rows` |
| `mode` | não | `dseng-official` | Modo de resolução (`dseng-official` na v1) |

### Response sucesso (200)

```json
{
  "ok": true,
  "source": "RENDER_BOM_SERVICE",
  "mode": "dseng-official",
  "root": {
    "id": "63FC553465A62400699E0792000086AB",
    "title": "CJ MESA 4BCS VP TOP 3DX",
    "revision": "1.1",
    "state": "IN_WORK",
    "owner": "rafael.ruiz"
  },
  "rows": [
    {
      "rowKey": "level0:63FC553465A62400699E0792000086AB",
      "level": 0,
      "parentId": null,
      "instanceId": null,
      "physicalId": "63FC553465A62400699E0792000086AB",
      "title": "CJ MESA 4BCS VP TOP 3DX",
      "description": "",
      "revision": "1.1",
      "owner": "rafael.ruiz",
      "maturity": "IN_WORK",
      "format": "VPMReference",
      "type": "VPMReference"
    }
  ],
  "counts": {
    "totalRows": 1,
    "rootIncluded": true,
    "depth": 2
  },
  "diagnostics": {
    "status": "OK",
    "endpointsUsed": [],
    "durationMs": 0,
    "warnings": [],
    "errors": []
  }
}
```

### Campos `rows[]`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `rowKey` | string | Chave estável única (`levelN:physicalId` ou com instance) |
| `level` | number | Profundidade na árvore (0 = raiz) |
| `parentId` | string \| null | Physical id do pai |
| `instanceId` | string \| null | Id da instância VPMInstance quando aplicável |
| `physicalId` | string | Referência EngItem / VPMReference |
| `title` | string | Título exibido na tabela |
| `description` | string | Descrição |
| `revision` | string | Revisão |
| `owner` | string | Proprietário |
| `maturity` | string | Estado de maturidade (`state` ENOVIA) |
| `format` | string | Formato de exibição (ex.: VPMReference) |
| `type` | string | Tipo BO (`VPMReference`, etc.) |

### Response erro validação (422)

```json
{
  "ok": false,
  "source": "RENDER_BOM_SERVICE",
  "error": {
    "code": "ROOT_ID_REQUIRED",
    "message": "rootId is required"
  },
  "diagnostics": {
    "status": "ERROR",
    "errors": []
  }
}
```

### Códigos de erro previstos (v1)

| code | HTTP | Quando |
|------|------|--------|
| `ROOT_ID_REQUIRED` | 422 | `rootId` ausente ou vazio |
| `INVALID_DEPTH` | 422 | `depth` não numérico ou negativo |
| `ROOT_NOT_FOUND` | 404 | EngItem não encontrado |
| `AUTH_FAILED` | 401/403 | Falha autenticação 3DSpace |
| `UPSTREAM_ERROR` | 502 | Erro ENOVIA não recuperável |
| `INTERNAL_ERROR` | 500 | Erro interno (sem segredo no body) |

---

## POST /api/3dx/bom/diagnostic (implementado — PR 2 mock)

**Status:** ✅ mock em PR 2 — sem chamada upstream

### Request

```json
{
  "rootId": "63FC553465A62400699E0792000086AB",
  "depth": 2
}
```

### Response (exemplo)

```json
{
  "ok": true,
  "source": "RENDER_BOM_SERVICE",
  "parameters": {
    "rootId": "63FC553465A62400699E0792000086AB",
    "depth": 2
  },
  "environment": {
    "spaceUrlConfigured": true,
    "securityContextConfigured": true,
    "credentialsMode": "env"
  },
  "endpointsUsed": [
    "GET /resources/v1/modeler/dseng/dseng:EngItem/{id}"
  ],
  "durationMs": 1200,
  "warnings": [],
  "errors": []
}
```

**Regra:** nunca retornar `password`, `cookie`, `csrf` ou tokens completos em `diagnostics`.

---

## Mapeamento frontend (PR 4)

| UI | Campo API |
|----|-----------|
| Tabela E-BOM | `rows[]` |
| KPI Total Peças | `counts.totalRows` (ou `rows.length` se documentado equivalente) |
| Label produto | `root.title` |
| Banner fonte | `source` + `mode` |
| Erro usuário | `error.message` |
| Avançado/diagnóstico | `diagnostics` |

**Request do botão Atualizar estrutura:**

```http
POST https://bom-resolver.onrender.com/api/3dx/bom/structure
Content-Type: application/json

{
  "rootId": "<seleção ou config>",
  "depth": 2,
  "includeRoot": true,
  "mode": "dseng-official"
}
```

---

## Versionamento

- Contrato **v1** fixado neste documento.
- Breaking changes exigem novo path ou campo `version` incrementado e PR dedicado.
- Rotas `/api/bom/*` permanecem até deprecação formal na Fase 5.
