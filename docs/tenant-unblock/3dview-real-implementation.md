# 3DView real via WAFData session — implementação

**Build:** `bom20260617d` / cache `waf3dx20260620e`  
**Cliente:** `window.__waf3dxClient`  
**Viewer:** `assets/js/ui/bom-3d-viewer.js` (Three.js, sem 3DPlay)

---

## Fluxo principal (sessão logada)

```
Clique linha E-BOM real
  → find3DGeometrySource(referenceId)
  → find3DShapeOrRep + dsdo:DerivedOutputs/Locate
  → downloadGeometry (DownloadTicket + FCS)
  → convertGeometryIfNeeded (GLB/OBJ/STL direto | STEP→GLB se converter configurado)
  → renderGeometryInThree → Bom3DViewer
```

**Não usa:** 3DPlay, iframe, mock, cubo fake.

---

## API pública (`__waf3dxClient`)

| Função | Descrição |
|--------|-----------|
| `find3DGeometrySource(id)` | Localiza representação + derived web ou STEP |
| `downloadGeometry(target)` | Baixa blob via sessão WAFData |
| `convertGeometryIfNeeded(file)` | Pass-through web; STEP exige `APP_CONFIG.STEP_GEOMETRY_CONVERTER_URL` |
| `renderGeometryInThree(target)` | Renderiza no painel `#partPreviewImage` |

---

## Caminho A — Derived web direto

Prioridade em `pickBestWebFile()`: GLB, glTF, OBJ, STL.

Critério PASS:

```json
{
  "lineClickReal": true,
  "geometrySourceFound": true,
  "derivedOutputFound": true,
  "viewerRenderedRealModel": true,
  "format": "GLB"
}
```

---

## Caminho B — STEP + conversão

Tenant piloto tem regras Derived Format STEP/PDF/DXF/XCV **sem GLB/OBJ** no dropdown.

Quando `dsdo Locate` retorna STEP:

1. `downloadGeometry` baixa STEP real (byteLength > 0).
2. `convertGeometryIfNeeded` tenta POST para `STEP_GEOMETRY_CONVERTER_URL` (somente arquivo, **sem cookie/CSRF**).
3. Se converter ausente → bloqueio documentado com evidência:

```json
{
  "stepAvailable": true,
  "conversionOk": false,
  "blocker": "STEP→mesh converter not configured in widget",
  "evidence": ["STEP downloaded byteLength=…", "Configure APP_CONFIG.STEP_GEOMETRY_CONVERTER_URL"]
}
```

---

## Evidência tenant (regressão)

| Item | Resultado |
|------|-----------|
| Tampo `63FC553465A62400699DB56700005253` | `find3DShapeOrRep` PASS |
| `dsdo Locate` | HTTP 200, **fileCount=0** (sem GLB/OBJ/STEP gerado) |
| Clique linha E-BOM | Mensagem honesta `NO_DERIVED_OUTPUT` ou STEP pipeline |

---

## Validação automatizada

No widget logado: **Avançado → Executor 3DX → Testar 3DView** ou **Executar validação completa**.

Console:

```js
window.__waf3dxClient.find3DGeometrySource('63FC553465A62400699DB56700005253')
window.__waf3dxClient.renderGeometryInThree({ referenceId: '…' })
```

Relatório: `window.__waf3dxClient.exportSanitizedReport()`
