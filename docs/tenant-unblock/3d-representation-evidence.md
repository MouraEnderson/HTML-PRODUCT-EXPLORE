# Evidências — representação 3D (tenant unblock)

**Projeto:** BOM Analytics 3DEXPERIENCE  
**Repositório:** MouraEnderson/HTML-PRODUCT-EXPLORE  
**Data de referência:** 2026-06-18  
**Commit main:** `dfbcf15`

---

## 1. Resumo

A dashboard possui **viewer próprio Three.js** (sem 3DPlay, sem iframe). O backend já implementa o pipeline oficial:

```txt
dseng:EngItem → dsdo:DerivedOutputs/Locate → DownloadTicket → cache → modelUrl
fallbacks: EngRepInstance, expand 3DShape, ds3sh search, dsxcad locate
```

No tenant piloto **R1132100929518**, o backend **encontra objetos 3DShape** ligados ao EngItem, mas **`dsdo:DerivedOutputs/Locate` retorna zero arquivos** em formato web (GLB/glTF/OBJ/STL). Sem arquivo renderizável, o Three.js não tem geometria para exibir.

O erro exibido no widget (`OFFICIAL_3D_REPRESENTATION_API_REQUIRED`) reflete **bloqueio de tenant/configuração**, não falha do viewer.

---

## 2. Objeto testado

| Papel | ID / nome |
|-------|-----------|
| Root CJ MESA | `63FC553465A62400699E0792000086AB` |
| Título root | CJ MESA 4BCS VP TOP 3DX |
| Item Tampo | `63FC553465A62400699DB56700005253` |
| name visual | `prd-R1132100929518-01099369` |
| Estado | IN_WORK, revisão 1.1 |

**3DShapes encontrados** via `dseng:expand` depth=2:

| 3DShape ID |
|------------|
| `63FC553465A62400699DB30C00004EF7` |
| `2C56DEE5E1E943068A77F7E8B2F0AB7B` |

Outro item testado na UI (vidro):

| Item | referenceId |
|------|-------------|
| TRN-40702074_Mesa vidro VP 4bcs | `63FC553465A62400699DB30C00004EB9` |

Mesmo padrão de erro no painel 3DView.

---

## 3. Endpoints testados

Base: `https://r1132100929518-us1-space.3dexperience.3ds.com/enovia` (via backend Render, credencial cookie de serviço).

| Endpoint | Método | Payload resumido | HTTP | Resultado | Conclusão |
|----------|--------|------------------|------|-----------|-----------|
| `dseng:EngItem/{id}` | GET | id=Tampo | 200 | Item lido (title, state IN_WORK) | OK |
| `dsdo:DerivedOutputs/Locate` | POST | type=VPMReference, id=Tampo | 200 | **fileCount: 0** | Sem Derived Output |
| `dseng:EngRepInstance` | GET | parent=Tampo | 200 | **repCount: 0** | Sem VPMRepInstance |
| `dseng:EngItem/{id}/expand` | POST | depth=2, filters 3DShape | 200 | **shapeCount: 2**, memberCount: 11 | Geometria existe |
| `dsdo:Locate` via 3DShape | POST | id=63FC…4EF7 | 200 | **fileCount: 0** | Sem output no shape |
| `dsdo:Locate` via 3DShape | POST | id=2C56…AB7B | 200 | **fileCount: 0** | Sem output no shape |
| `ds3sh:3DShape/search` | GET | searchStr=Tampo | 200 | totalItems: 0 | Search por título vazio |
| `ds3sh:3DShape/{id}` | GET | shape id | 200 | Metadados OK | Shape existe, sem arquivo web |
| `dsxcad:Representation/locate` | POST | referencedObject EngItem | **400** | Dependency Link completion error | Caminho CAD bloqueado |

**Render (proxy):**

| Rota | Método | HTTP | Resultado |
|------|--------|------|-----------|
| `/api/3dx/visualization/probe` | POST | 200 | `ok:false`, code `OFFICIAL_3D_REPRESENTATION_API_REQUIRED` |
| `/api/3dx/visualization/resolve` | POST | 200 | `ok:false`, sem `modelUrl` |

---

## 4. Evidência sanitizada

### 4.1 Probe visualization (Tampo)

```json
{
  "ok": false,
  "referenceId": "63FC553465A62400699DB56700005253",
  "code": "OFFICIAL_3D_REPRESENTATION_API_REQUIRED",
  "attempts": [
    { "step": "dsdo:DerivedOutputs/Locate", "status": 200, "fileCount": 0 },
    { "step": "dseng:EngRepInstance", "status": 200, "repCount": 0 },
    { "step": "dseng:expand depth=2", "status": 200, "shapeCount": 2, "memberCount": 11 },
    { "step": "dsdo via 3DShape 63FC553465A62400699DB30C00004EF7", "status": 200, "fileCount": 0 },
    { "step": "dsdo via 3DShape 2C56DEE5E1E943068A77F7E8B2F0AB7B", "status": 200, "fileCount": 0 },
    { "step": "dsxcad:Representation/locate", "status": 400, "summary": "Dependency Link completion error" }
  ]
}
```

### 4.2 Resolve (sem segredos)

```json
{
  "ok": false,
  "code": "OFFICIAL_3D_REPRESENTATION_API_REQUIRED",
  "message": "Representação 3D web não disponível após tentativas dsdo/dsxcad/dseng.",
  "item": {
    "id": "63FC553465A62400699DB56700005253",
    "title": "Tampo",
    "revision": "1.1",
    "state": "IN_WORK"
  }
}
```

Nenhum cookie, token, bearer ou ticket URL completo é registrado nos logs públicos do probe (`probeSanitizer.js` redige campos sensíveis).

---

## 5. Conclusão técnica

```txt
O bloqueio NÃO está no viewer Three.js nem no layout do widget.
O bloqueio É que o tenant não retorna arquivo GLB/glTF/OBJ/STL
nem DownloadTicket para representação renderizável via dsdo.

Existe 3DShape associado, mas sem Derived Output configurado/gerado.
```

Formatos como **CGR** ou **authoringvisu** (regras Allegro→CGR no Platform Manager) **não servem** o viewer atual, que exige malha web padrão (GLB/glTF/OBJ/STL).

---

## 6. Perguntas para admin / Dassault

1. Este tenant possui **Derived Output** configurado para **GLB/glTF/OBJ/STL** em Physical Product / 3DShape / VPMReference?
2. O **Derived Format Converter** está instalado e em execução?
3. Como gerar Derived Output web renderizável para os EngItems da CJ MESA (ex.: Tampo `63FC553465A62400699DB56700005253`)?
4. Qual endpoint oficial retorna **DownloadTicket** para 3DShape/representação **sem 3DPlay**?
5. Existe formato CGR/3DXML/STEP disponível para download via REST? Se sim, qual endpoint e payload?
6. O erro `dsxcad:Representation/locate` 400 exige payload diferente, dependency link ou permissão adicional?
7. O 3DShape pode ser baixado diretamente (`ds3sh`)? Qual contrato retorna geometria utilizável fora da plataforma?

---

## 7. Opções de desbloqueio

| Opção | Descrição | Impacto no widget |
|-------|-----------|-------------------|
| **A** | Configurar **Derived Output GLB/glTF** no Platform Manager (regra para SOLIDWORKS/3DEXPERIENCE, não Allegro PCB) | Reteste `/visualization/resolve` → `ok:true` |
| **B** | Habilitar **Derived Format Converter** + evento (save/maturity) que gere output | Arquivos aparecem em `dsdo:Locate` |
| **C** | Fornecer endpoint oficial de download de 3DShape/representation com ticket | Ajustar resolver se contrato for diferente |
| **D** | Entregar nativo (3DXML/CGR/STEP) + **conversor backend real** | Nova decisão de produto; não implementado hoje |

---

## 8. Reteste

```bash
cd backend
npm run probe:tenant -- 63FC553465A62400699E0792000086AB 63FC553465A62400699DB56700005253
```

Ou via Render:

```bash
curl -s -X POST https://bom-resolver.onrender.com/api/3dx/visualization/resolve \
  -H "Content-Type: application/json" \
  -d '{"referenceId":"63FC553465A62400699DB56700005253","title":"Tampo","mode":"dseng-official"}'
```

**Aceite:** `ok:true`, `format` ∈ {glb,gltf,obj,stl}, `modelUrl` acessível com HTTP 200 e bytes de modelo.
