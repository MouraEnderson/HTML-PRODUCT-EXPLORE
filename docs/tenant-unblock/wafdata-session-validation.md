# WAFData session validation — BOM Analytics

**Build:** `bom20260617d`  
**Cliente oficial:** `assets/js/waf3dx-client-bom20260617d.js` → `window.__waf3dxClient`  
**Probe legado:** `assets/js/wafdata-probe-bom20260617d.js` → `window.__bomWafProbe`  
**Modo E-BOM:** `BOM_DATA_SOURCE = wafdata-session`  
**Objetivo:** widget no 3DDashboard/Web Page Reader chama 3DSpace com **sessão do usuário logado** via `WAFData.authenticatedRequest`, sem Render CAS e sem cookie manual.

---

## Como abrir o diagnóstico no widget

1. Abrir widget: `widget-v3-08i.html?v=bom20260617d` no 3DDashboard (Web Page Reader).
2. No topo do widget BOM Analytics:
   - Botão **Diagnóstico** (sempre visível, ao lado do build pill) → abre painel flutuante **Diagnóstico 3DX**
   - Ou clique **Avançado** (também visível no topo) → Root Physical ID, profundidade, Testar Root ID
3. No painel **Diagnóstico 3DX**:
   - **Testar sessão 3DX** — matriz completa (WAF → CSRF → GET root → POST expand variants → 3D → maturidade)
   - **Testar E-BOM** — CSRF + GET root + POST expand
   - **Testar 3DView** — `find3DShapeOrRep` + `dsdo:DerivedOutputs/Locate`
   - **Testar maturidade read-only** — GET state + `invoke/dseng:GetNextStates`
   - **Exportar diagnóstico sanitizado** — JSON sem token/CSRF/cookie

Console (frame do widget):

```js
window.__waf3dxClient.runFullDiagnostic()
window.__waf3dxClient.getLastDiagnostic()
window.__waf3dxClient.exportSanitizedDiagnostic()
```

---

## Fontes pesquisadas (oficial Dassault)

| Fonte | URL | Uso |
|-------|-----|-----|
| WAFData API | [CAAWebAppsTaDataAccess](https://library.plmcoach.com/caa3dx/win_b64.doc/English/CAAWebAppsJSWS/CAAWebAppsTaDataAccess.htm) | `authenticatedRequest`, sessão 3DPassport automática no widget |
| CSRF em widgets | [CAA3DSwymUcBasicWidget](https://library.plmcoach.com/caa3dx/win_b64.doc/English/CAASwymInfraUI/CAA3DSwymUcBasicWidget.htm) | POST exige token; padrão ENOVIA: `GET /resources/v1/application/CSRF` → header `ENO_CSRF_TOKEN` |
| REST ENOVIA / dseng | [DSDoc IAM REST TOC](https://media.3ds.com/support/documentation/developer/R2021x/en/DSDoc.htm?show=CAAiamREST/CAATciamRESTToc.htm) | EngItem GET/expand, invoke lifecycle |
| Postman primer 3DX | [3DSwym community post](https://3dswym.3dexperience.3ds.com/post/enovia-user-community/3dexperience-web-services-postman-primer_TGle4SV2RFOt9z8alqjtKw) | ordem CAS → CSRF → POST |
| Implementação interna validada | `assets/js/integration/expand-item-validator.js` | `onComplete`/`onFailure`, `CompassServices.ensureWorkingSpaceUrl`, host `*-space*` |

---

## Endpoints testados

| # | Método | Endpoint | Headers testados |
|---|--------|----------|------------------|
| 1 | GET | `/resources/v1/application/CSRF` | `Accept`, `SecurityContext` (com/sem) |
| 2 | GET | `/resources/v1/modeler/dseng/dseng:EngItem/{rootId}` | `Accept`, `SecurityContext` |
| 3 | POST | `/resources/v1/modeler/dseng/dseng:EngItem/{rootId}/expand` | matriz abaixo |
| 4 | POST | `/resources/v1/modeler/dsdo/dsdo:DerivedOutputs/Locate` | CSRF + SecurityContext |
| 5 | POST | `/resources/v1/modeler/dsdo/.../DownloadTicket` | CSRF + SecurityContext |
| 6 | POST | `/resources/v1/modeler/dseng/dseng:EngItem/{id}/invoke/dseng:GetNextStates` | CSRF + SecurityContext |

**Root de teste:** `63FC553465A62400699E0792000086AB` (CJ MESA 4BCS VP TOP 3DX)  
**SecurityContext:** `ctx::VPLMProjectLeader.Company Name.CS_IMPLANTACAO`  
**Space URL:** `https://r1132100929518-us1-space.3dexperience.3ds.com/enovia`

---

## Matriz POST expand (registrada em `runFullDiagnostic`)

Para cada payload alternativo, o cliente testa combinações:

| Variante headers | Descrição |
|------------------|-----------|
| `+sc+csrf` | SecurityContext + ENO_CSRF_TOKEN (oficial) |
| `+sc+csrf+xhr` | acima + `X-Requested-With: XMLHttpRequest` |
| `+sc-no-csrf` | SecurityContext sem token |
| `+no-sc+csrf` | token sem SecurityContext |
| `+no-sc-no-csrf` | sem ambos |

**Payloads expand:**

| Label | Body |
|-------|------|
| `official-dseng-v1` | `{ expandDepth, withPath:true, type_filter_bo:[VPMReference,VPMRepReference], type_filter_rel:[VPMInstance,VPMRepInstance] }` |
| `with-3dshape-filter` | inclui `3DShape` em `type_filter_bo` |
| `depth-zero` | `expandDepth: 0` |
| `without-path` | `withPath: false` |

O relatório `expandMatrix[]` indica **qual combinação passou ou falhou** (HTTP + rowsDetected).

---

## Critério PASS fase 1

```json
{
  "wafAvailable": true,
  "csrfOk": true,
  "canReadRoot": true,
  "expandOk": true,
  "rowsDetected": 5,
  "pass": true
}
```

---

## Evidência conhecida no tenant (2026-06-11)

| Etapa | Status | Notas |
|-------|--------|-------|
| WAFData no frame | ✅ | `authenticatedRequest`, CSRF 200, SecurityContext OK |
| GET `dseng:EngItem/prd-*` | ❌ **404** | Explorer expõe `prd-R1132100929518-01103695` — **não usar como rootId** |
| UQL `name:prd-R1132100929518-01103695` | ✅ 200 | → `63FC553465A62400699E0792000086AB` |
| UQL `label:"CJ MESA 4BCS VP TOP 3DX"` | ✅ 200 | → mesmo dseng id |
| GET root dseng | ✅ 200 | `63FC553465A62400699E0792000086AB` |
| POST expand `official-dseng-v1+sc+csrf` | ✅ 200 | **13 rows** — variante vencedora |
| POST expand em candidato errado (`8EA67E9…`) | ❌ 403 | expand só no root correto |
| dsdo Locate | ⚠️ 200 fileCount=0 | admin: gerar Derived Output web |
| GetNextStates invoke | ❌ 404 | read-only via GET state OK; write bloqueado no tenant |

**Implementação:** `window.__waf3dxClient.resolveEngItemRootId({ physicalId, title })` resolve prd→dseng antes do expand. Sync Explorer dispara automaticamente.

---

## Evidência anterior (2026-06 — pré-UQL)

| Etapa | Status observado | Notas |
|-------|------------------|-------|
| WAFData no frame | ✅ presente | `window.__bomWafProbe` / `WAFData.authenticatedRequest` |
| GET root | _validar no 3DDashboard_ | esperado 200 se SecurityContext OK |
| POST expand | ❌ **403** reportado (antes do fix CSRF/SC) | matriz identificou `official-dseng-v1+sc+csrf` |
| Render CAS | ❌ não é caminho principal | `/authcheck` falha tenant CAS |

**Bloqueio provável em 403 expand:** permissão PLM (role/collab space), SecurityContext incorreto para POST, ou política Web Page Reader. O diagnóstico deve apontar a variante exata — não esconder 403.

---

## Registro de execução (preencher após teste no tenant)

| Campo | Valor |
|-------|--------|
| Data | |
| Frame | Web Page Reader / 3DDashboard |
| Usuário | |
| **1. WAFData** | |
| **2. CSRF** | |
| **3. GET root** | |
| **4. Expand (variante vencedora)** | |
| **5. rowsDetected** | |
| **6. dsdo Locate** | |
| **7. Maturity read-only** | |
| **8. pass** | |

Exportar: **Avançado → Exportar diagnóstico sanitizado** ou `__waf3dxClient.exportSanitizedDiagnostic()`.

---

## Próxima ação se expand continuar 403

1. Rodar **Testar sessão 3DX** e copiar `expandMatrix` completo.
2. Comparar SecurityContext do widget (`PlatformContext.getState()`) com o da UI nativa (EngItem no mesmo collab space).
3. Validar role **VPLMProjectLeader** ou equivalente para POST expand no root CJ MESA.
4. Se todas as variantes falharem com 403: abrir ticket Dassault com endpoint exato + SecurityContext mascarado + evidência GET root OK / POST expand 403.
