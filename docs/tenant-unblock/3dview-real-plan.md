# 3DView real via WAFData session — plano e status

**Build:** `bom20260617d`  
**Cliente:** `window.__waf3dxClient`  
**Viewer:** `assets/js/ui/bom-3d-viewer.js` (Three.js, sem 3DPlay)

---

## Fluxo alvo

```
Clique linha E-BOM real
  → EngItem referenceId
  → dseng expand (3DShape / VPMRepReference)
  → dsdo:DerivedOutputs/Locate
  → dsdo:DerivedOutputFiles/DownloadTicket
  → download FCS
  → Three.js (GLB/glTF/OBJ/STL)
```

---

## Endpoints implementados no cliente

| Etapa | API | Função cliente |
|-------|-----|----------------|
| Representações | `POST .../dseng:EngItem/{id}/expand` (filtro 3DShape) | `find3DShapeOrRep(id)` |
| Derived outputs | `POST .../dsdo:DerivedOutputs/Locate` | `locateDerivedOutputs(target)` |
| Download ticket | `POST .../dsdo:DerivedOutputs/{parent}/dsdo:DerivedOutputFiles/{file}/DownloadTicket` | `downloadDerivedOutput(target)` |

**Referência backend (contrato):** `backend/src/services/threeDxRepresentationResolver.js`

---

## Fontes pesquisadas

| Tópico | Fonte |
|--------|-------|
| dseng EngRepInstance / expand | DSDoc IAM REST / `expand-item-validator.js` |
| dsdo Locate / DownloadTicket | `enoviaClient.js`, `threeDxRepresentationResolver.js` |
| Derived Output on demand | `threeDxUpstreamMatrix.js` — `dsdo:DerivedOutputJobs` (probe admin) |
| Formatos web | GLB, glTF, OBJ, STL, 3DXML — prioridade no `pickBestWebFile()` |

---

## Critério de aceite

```json
{
  "lineClickReal": true,
  "representationFound": true,
  "derivedOutputFound": true,
  "viewerRenderedRealModel": true
}
```

---

## Status atual

| Item | Status |
|------|--------|
| Probe `Testar 3DView` no widget | ✅ implementado |
| Clique linha → cadeia WAF (`loadVisualizationForRowWaf`) | ✅ implementado |
| Render real GLB/glTF via blob WAFData | ⚠️ **pendente validação tenant** — transporte binário pode exigir `type`/proxy adicional |
| `fileCount = 0` | ✅ diagnóstico honesto, sem mock |

**Resposta esperada quando bloqueado:**

```json
{
  "derivedOutputAvailable": false,
  "fileCount": 0,
  "blocker": "No derived output available for this representation",
  "requiredAdminAction": "Enable/generate derived output for web visualization"
}
```

**Item de teste:** Tampo `63FC553465A62400699DB56700005253`

---

## Próximas ações

1. Desbloquear **POST expand** (fase 1) — 3DView depende de expand para achar 3DShape.
2. Rodar **Testar 3DView** no widget; registrar `fileCount` e formatos.
3. Se `fileCount = 0`: admin gera Derived Output (GLB/OBJ) no 3DEXPERIENCE ou avaliar `dsdo:DerivedOutputJobs` on-demand (documentado no backend matrix).
4. Se ticket OK mas viewer falha: capturar Network F12 no download FCS e ajustar transporte binário WAFData (sem cookie manual).
