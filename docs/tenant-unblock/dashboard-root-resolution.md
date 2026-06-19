# Dashboard root resolution — E-BOM estável

**Build:** `bom20260617d`  
**Widget:** `widget-v3-08i.html?v=bom20260617d`  
**Escopo:** apenas resolução de root e persistência da E-BOM (sem 3D, sem maturidade)

---

## Problema

O **Product Structure Explorer** pode expor apenas contexto parcial no Web Page Reader:

- título visível (`CJ MESA 4BCS VP TOP 3DX`)
- name visual (`prd-R1132100929518-01103695`)
- **sem** `rootId` dseng de 32 hex

`prd-R...` **não** é rootId dseng. O physicalId correto para regressão é:

`63FC553465A62400699E0792000086AB`

Quando o PSE não entrega rootId oficial, a dashboard **não pode** zerar a E-BOM se já existir um root válido salvo.

---

## Fluxo `resolveRootForBomLoad()`

Prioridade:

1. **rootId dseng explícito** do Product Explorer (PlatformAPI / DS/Selection / ExplorerContext)
2. **POST `/api/3dx/bom/resolve-selection`** com title/name/candidatos do PSE
3. **`localStorage` `bomAnalytics:lastGoodContext:bom20260617d`**
4. **Root manual** em Avançado (`explorerObjectId`)
5. Erro claro (sem sucesso falso)

Regra: contexto inválido/parcial **nunca apaga** estrutura boa anterior.

---

## Persistência `lastGoodContext`

Chave:

```js
bomAnalytics:lastGoodContext:bom20260617d
```

Salva somente após `/structure` ou `/resolve-selection` com:

- `ok: true`
- `rows.length > 0`
- `counts.totalRows > 0`
- `rootId` dseng válido

**Nunca salva:** cookie, token, CSRF, senha, session id.

Exemplo sanitizado:

```json
{
  "build": "bom20260617d",
  "tenant": "r1132100929518-us1",
  "spaceUrl": "https://r1132100929518-us1-space.3dexperience.3ds.com/enovia",
  "rootId": "63FC553465A62400699E0792000086AB",
  "rootTitle": "CJ MESA 4BCS VP TOP 3DX",
  "rootName": "prd-R1132100929518-01103695",
  "mode": "dseng-official",
  "expandStrategy": "expand-item",
  "depth": 1,
  "expandDepth": 1,
  "includeRoot": true,
  "lastSuccessAt": "2026-06-19T12:00:00.000Z"
}
```

---

## Boot, Sincronizar e Atualizar

| Ação | Comportamento |
|------|----------------|
| **Boot** | Aguarda ~1s pelo PSE; se sem rootId, carrega `lastGoodContext` automaticamente |
| **Sincronizar** | PSE → resolve-selection → lastGoodContext → erro |
| **Atualizar** | root atual → lastGoodContext → Avançado → erro |

Mensagem de fallback típica:

> Product Explorer não forneceu rootId dseng oficial. Usando último root válido salvo: CJ MESA 4BCS VP TOP 3DX.

---

## Testes manuais

### A — root manual

1. `localStorage.removeItem('bomAnalytics:lastGoodContext:bom20260617d')`
2. Avançado → `63FC553465A62400699E0792000086AB` → Testar Root ID
3. Confirmar **5 linhas** e chave salva

### B/C — fechar aba/navegador

1. Com `lastGoodContext` salvo e E-BOM carregada
2. Fechar aba ou navegador
3. Reabrir widget → boot deve recuperar estrutura (ou **Atualizar** com root salvo)

### D — PSE sem rootId oficial

1. PSE mostra CJ MESA mas API não entrega physicalId
2. Dashboard tenta resolve-selection e/ou lastGoodContext
3. Tabela **não** deve zerar se houver root salvo

### E — resolve-selection falha

1. Backend indisponível ou auth falha
2. Com `lastGoodContext` válido → dashboard usa root salvo
3. Estrutura anterior mantida quando já renderizada

---

## Backend (validação)

```bash
curl -s https://bom-resolver.onrender.com/api/3dx/bom/health
curl -s https://bom-resolver.onrender.com/api/3dx/bom/health/authcheck
curl -s -X POST https://bom-resolver.onrender.com/api/3dx/bom/structure \
  -H "Content-Type: application/json" \
  -d '{"rootId":"63FC553465A62400699E0792000086AB","depth":1,"expandDepth":1,"includeRoot":true,"mode":"dseng-official","expandStrategy":"expand-item"}'
curl -s -X POST https://bom-resolver.onrender.com/api/3dx/bom/resolve-selection \
  -H "Content-Type: application/json" \
  -d '{"title":"CJ MESA 4BCS VP TOP 3DX","name":"prd-R1132100929518-01103695","mode":"dseng-official","expandStrategy":"expand-item","expandDepth":1}'
```

Esperado CJ MESA depth=1: **5 linhas**.

---

## Arquivos alterados

- `assets/js/bom-ska-service-hotfix-20260617d.js` — `resolveRootForBomLoad`, persistência, boot
- `assets/js/integration/product-explorer-sync-provider.js` — contexto parcial com title/name
- `backend/src/services/threeDxCasAuth.js` — passport eu1 first, parse `lt` robusto
- `backend/src/services/threeDxBomService.js` — resolve-selection com title/name flat
