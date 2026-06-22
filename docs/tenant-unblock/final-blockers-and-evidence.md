# Bloqueios finais e evidência — BOM Analytics WAFData

**Build:** `bom20260617d`  
**Cache deploy:** `waf3dx20260620e`  
**Widget:** `widget-v3-08i.html`  
**Tenant:** `r1132100929518-us1-space.3dexperience.3ds.com/enovia`

---

## Ação única do usuário

1. Abrir widget **logado** no 3DDashboard (Web Page Reader).
2. Clicar **Avançado → Executor 3DX → Executar validação completa**.
3. Ler PASS/FAIL por etapa na tela; opcional **Exportar relatório sanitizado**.

Sem F12, cookie manual ou probes externos.

---

## Resultado esperado quando tudo PASS

```json
{
  "wafAvailable": true,
  "csrfOk": true,
  "canReadRoot": true,
  "expandOk": true,
  "rowsDetected": 13,
  "ebomReady": true,
  "threeD": {
    "lineClickReal": true,
    "geometrySourceFound": true,
    "viewerRenderedRealModel": true
  },
  "maturity": {
    "maturityReadOk": true,
    "transitionsLoaded": true,
    "verifiedByReread": true
  },
  "pass": true
}
```

---

## Bloqueios confirmados no tenant piloto (evidência reproduzível)

| Área | Status | Evidência automatizada |
|------|--------|------------------------|
| WAFData + CSRF + GET root | ✅ PASS | Executor step `GET root EngItem` 200 |
| POST expand | ✅ PASS | `official-dseng-v1+sc+csrf` → 200, 13 rows |
| Explorer prd→dseng | ✅ FIX | Registry `EXPLORER_CONTEXT_REGISTRY_KNOWN_ROOT` |
| 3D derived web | ❌ BLOCKED | `dsdo Locate fileCount=0` — sem GLB/OBJ gerado |
| 3D STEP | ⚠️ PARCIAL | Regras STEP no Platform Manager; Locate ainda fileCount=0 no item teste |
| Maturidade read | ✅ PASS | GET state OK |
| Maturidade write | ❌ BLOCKED | `GetNextStates` 404; invokes write 403/404 |

---

## Próximas ações objetivas (código vs admin)

| Bloqueio | Responsável | Ação |
|----------|-------------|------|
| fileCount=0 | Admin DS | Gerar Derived Output GLB/OBJ ou STEP para peças de teste |
| STEP sem viewer | Produto | Deploy `STEP_GEOMETRY_CONVERTER_URL` stateless (file-only) **ou** habilitar GLB no Derived Format |
| Maturidade write 404 | Plataforma/roles | Habilitar invoke lifecycle REST ou capturar contrato nativo quando disponível |

---

## Arquivos entregues nesta fase

| Arquivo | Entrega |
|---------|---------|
| `assets/js/waf3dx-client-bom20260617d.js` | Cliente completo + `runFullValidation` + Executor |
| `assets/js/integration/product-explorer-sync-provider.js` | Registry prd→dseng |
| `assets/js/bom-ska-service-hotfix-20260617d.js` | Cadeia 3D WAF + integração Executor |
| `docs/tenant-unblock/*.md` | Evidência e planos |

---

## Relatório sanitizado

```js
window.__waf3dxClient.exportSanitizedReport()
```

Não inclui: cookie, token, CSRF value, bearer, headers sensíveis completos.
