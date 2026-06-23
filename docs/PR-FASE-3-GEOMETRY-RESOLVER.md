# PR FASE 3 — Geometry Resolver real

## Objetivo

Implementar a primeira entrega operacional da Fase 3 sem 3DPlay, sem mock, sem cubo fake e sem placeholder como sucesso.

Fluxo esperado:

```text
linha E-BOM real selecionada
→ referenceId / instanceId reais
→ probes WAFData para representações reais
→ busca de 3DShape / VPMRepReference / EngRepInstance / DerivedOutputs
→ procura por fonte baixável/conversível: GLB, glTF, OBJ, STL, STEP/STP
→ se encontrar fonte real: registrar evidência e formato
→ se não encontrar: mostrar blocker provado com evidência
```

## Build

Build ativo:

```text
bom20260623c
```

Arquivos principais:

```text
assets/js/bom-bundle-bom20260623c.js
assets/js/geometry/bom-geometry-resolver-bom20260623c.js
assets/js/geometry/bom-geometry-controller-patch-bom20260623c.js
```

## Regras obrigatórias

- Não usar 3DPlay como sucesso.
- Não abrir iframe 3DPlay.
- Não gerar cubo fake.
- Não usar arquivo hardcoded.
- Não marcar `viewerRenderedRealModel=true` sem render real.
- Não esconder bloqueio.
- Todo resultado precisa trazer evidência.

## Resultado técnico atual

O botão **Resolver 3D real** aparece no painel de detalhes depois que uma linha E-BOM real é selecionada.

Ao clicar:

1. Lê a linha selecionada no controller oficial.
2. Usa `referenceId` e `instanceId` reais.
3. Executa probes via `WafClient`/WAFData.
4. Procura candidatos de representação e arquivos de geometria.
5. Mostra PASS/FAIL por etapa no painel.

## Probes implementados

Para `referenceId`:

```text
dseng:EngItem/{id}?$expand=dseng:EngRepInstance
dseng:EngItem/{id}?$expand=dseng:EnterpriseReference
dsxcad:VPMReference/{id}?$expand=dsxcad:VPMRepReference
dsxcad:VPMReference/{id}?$expand=dsxcad:3DShape
dsdo:DerivedOutputs/Locate?referencedObject={id}
dsdo:DerivedOutputs/Locate?physicalid={id}
```

Para `instanceId`, quando existir:

```text
dsdo:DerivedOutputs/Locate?instance={instanceId}
```

## Critério de sucesso

Sucesso parcial aceitável nesta entrega:

```json
{
  "lineClickReal": true,
  "representationFound": true,
  "geometrySourceFound": true,
  "viewerRenderedRealModel": false,
  "format": "GLB|glTF|OBJ|STL|STEP|STP",
  "note": "fonte real encontrada; render visual depende de loader/download ticket valido"
}
```

Sucesso final da Fase 3, ainda pendente:

```json
{
  "lineClickReal": true,
  "representationFound": true,
  "geometrySourceFound": true,
  "viewerRenderedRealModel": true,
  "format": "GLB|glTF|OBJ|STL|STEP-converted"
}
```

## Bloqueio aceitável

Se o tenant não expuser geometria baixável/conversível:

```json
{
  "viewerRenderedRealModel": false,
  "blocker": "No downloadable or convertible geometry source found",
  "evidence": [
    "representation candidates tested",
    "dsdo Locate tested",
    "no GLB/OBJ/STL",
    "no STEP/STP available"
  ]
}
```

## Teste manual no 3DDashboard

1. Abrir o link oficial:

```text
https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-v3.html
```

2. Carregar E-BOM real.
3. Selecionar uma linha real.
4. Conferir `Reference ID` e `Instance ID` no painel.
5. Clicar **Resolver 3D real**.
6. Verificar o painel:
   - se encontrou arquivo: deve mostrar formato e evidências;
   - se não encontrou: deve mostrar blocker e evidências.

## Fora de escopo desta entrega

- Maturidade write.
- Render final STEP → mesh.
- 3DPlay.
- Download ticket/FCS avançado quando o tenant exigir fluxo assinado específico.
