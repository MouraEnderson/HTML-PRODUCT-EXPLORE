# BOM Analytics — Backup Estável: Viewer 3D Descoberto

## BACKUP

**SHA:** `137b615e064f` (último commit estável com thumbnail SVG)
**Data:** 2026-07-01
**Para restaurar:** `git reset --hard 137b615e064f`

---

## Estado funcional completo

| Item | Status |
|------|--------|
| Widget F5 | ✅ UWA lifecycle |
| E-BOM 92 linhas CJ MESA | ✅ depth 20 |
| E-BOM 39 linhas SKA Drone | ✅ resolução genérica UQL |
| Gráficos pizza | ✅ Saúde Maturidade + Proprietários |
| IDs reais no clique | ✅ Reference ID, Instance ID |
| Resolução genérica prd-R | ✅ UQL automática |
| Maturity write (promote) | ✅ `/resources/lifecycle/maturity/promote` |
| Ícone SVG por tipo | ✅ Assembly (azul) / Part (verde) |
| Repositório limpo | ✅ 10 arquivos ativos |
| Módulo AMD 3D disponível | ✅ `DS/3DPlayModelViewer/3DPlayModelViewer` |

---

## Descoberta: Viewer 3D via AMD

### O que foi testado

| Módulo | Status | Evidência |
|--------|--------|-----------|
| `DS/Visualization/Viewer3D` | ❌ 404 | Não existe no tenant |
| `DS/3DPlayModelViewer/3DPlayModelViewer` | ✅ function | Console: `typeof V = function`, keys: `parent, extend, singleton, implement` |

### Como foi descoberto

Captura de telemetry no Network tab ao abrir a janela Information de uma peça (01_SKA_Leg). O campo `usage14` do telemetry revelou:

```json
{
  "category": "3DPlay-experience",
  "action": "ExperienceReady",
  "label": "DS/3DPlayModelViewer/3DPlayModelViewer"
}
```

### Dados complementares capturados

| Item | Valor | Fonte |
|------|-------|-------|
| Módulo AMD | `DS/3DPlayModelViewer/3DPlayModelViewer` | Telemetry usage14 |
| Asset type | `VPMReference` | Telemetry usage11 |
| Asset source | `3DSpace` | Telemetry usage12 |
| Loader config | `OOC` (Out Of Core / streaming) | Telemetry usage10 |
| Geometria via | `cvservlet/fetch/v2` + `progressiveexpand/v2` | Network tab |
| Thumbnail via | `us1-dfcs.3dexperience.3ds.com/fcs/servlet/fcs/media?arg={ticket}` | Network tab |
| Thumbnail size | 144x108 PNG, ~16KB | Response headers |
| App ID | `X3DPLAW_AP` (3DPlay) + `ENOLCMT_AP` (Collaborative Lifecycle) | Telemetry |
| Physical ID teste | `132FB3CE26D70E006A18D18700003181` (01_SKA_Leg) | Telemetry usage15 |

### Fluxo completo capturado da UI nativa

```
1. ENOVIA Information abre para a peça
2. require('DS/3DPlayModelViewer/3DPlayModelViewer') → carrega viewer
3. getStatesAttributes → busca atributos de lifecycle
4. cvservlet/progressiveexpand/v2 → expande estrutura 3D
5. cvservlet/fetch/v2 → busca geometria streaming
6. downloadurl?sign... → gera ticket FCS
7. media?arg={ticket} → baixa thumbnail 144x108
8. Viewer renderiza geometria 3D em canvas WebGL
```

---

## Descoberta: Maturity Promote (sessão anterior)

### Endpoint real

```
POST /enovia/resources/lifecycle/maturity/promote?tenant=R1132100929518
```

### Payload

```json
{
  "data": [{
    "physicalid": "{id}",
    "tostate": "FROZEN",
    "fromstate": "IN_WORK"
  }],
  "metrics": {
    "UXName": "Maturity",
    "client_app_domain": "3DEXPERIENCE 3DDashboard",
    "client_app_name": "ENOLCMI_AP"
  },
  "notificationTimeout": 3600
}
```

### Endpoints que NÃO funcionam no tenant cloud

| Endpoint | Status |
|----------|--------|
| `dseng:GetNextStates` | 404 |
| `dseng:ChangeMaturity` | 404 |
| `dseng:Promote` | 404 |
| `dseng:SetState` | 404 |
| `dslc:changeState` | 404 |
| `dscfg:ChangeAction` | 404 |
| `dslib:ChangeAction` | 404 |
| PATCH `{state}` | 400 "not an attribute" |
| PATCH `{ceStamp, state}` | 400 "not an attribute" |
| `model/changeactions/{id}/lifecycle` | 404 |

---

## Próximo passo: implementar viewer 3D

### O que precisa ser provado

1. Instanciar `DS/3DPlayModelViewer/3DPlayModelViewer` num elemento DOM do nosso widget
2. Passar physicalId do item selecionado na E-BOM
3. Viewer renderiza geometria no canvas
4. Funciona dentro do iframe do widget custom

### Abordagem

1. Carregar o módulo AMD via `require()` dentro do widget (WAFData context)
2. Criar um `<div>` na zona 5 para montar o viewer
3. Ao clicar item na E-BOM, inicializar viewer com o physicalId da peça
4. Se falhar, mostrar diagnóstico honesto (não fake)

### Arquivos envolvidos

- `bom-ska-service-hotfix-20260617d.js` — renderEbomSidePanel, zona 5
- `assets/css/dashboard.css` — estilos do container 3D
- Nenhum outro arquivo muda

### Riscos

- O módulo pode não funcionar dentro de iframe de widget custom (CORS, CSP)
- `cvservlet/fetch` pode exigir SecurityContext diferente
- Tamanho do canvas pode ser limitado pela zona 5
