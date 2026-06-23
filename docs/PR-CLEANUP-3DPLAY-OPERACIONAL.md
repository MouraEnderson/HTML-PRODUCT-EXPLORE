# PR Cleanup — remover 3DPlay do fluxo operacional

## Objetivo

Garantir que o link oficial `widget-v3.html` não trate 3DPlay, iframe, postMessage ou placeholder como sucesso de 3D.

O produto piloto permanece com a premissa:

```text
3DDashboard autenticado
→ widget oficial abre pelo link fixo
→ WAFData usa a sessão real do usuário
→ controller único inicializa
→ identifica ou recebe a montagem raiz
→ resolve para root dseng real
→ GET EngItem
→ expand E-BOM real
→ parser dseng preserva ocorrências/instâncias
→ tabela mostra linhas reais
→ clique na linha mostra Reference ID / Instance ID reais
→ depois disso libera 3D real e maturidade real
```

## Alterações

- `build-id.js` passa a apontar para `bom20260623b`.
- Novo bundle operacional `assets/js/bom-bundle-bom20260623b.js` carrega somente módulos permitidos.
- O bundle operacional **não carrega**:
  - `assets/js/integration/3dplay-bridge.js`
  - `assets/js/ui/3dplay-viewer.js`
- `scripts/build-bundle.ps1` remove 3DPlay da lista de módulos gerados.
- `PartPreview` deixa de depender de `ThreeDPlayViewer` e passa a mostrar bloqueio honesto até Geometry Resolver real.

## Critério de 3D aceito

Sucesso só pode ser marcado quando houver geometria real renderizada:

```json
{
  "lineClickReal": true,
  "representationFound": true,
  "geometrySourceFound": true,
  "viewerRenderedRealModel": true,
  "format": "GLB|glTF|OBJ|STL|STEP-converted"
}
```

## Bloqueio aceito

```json
{
  "viewerRenderedRealModel": false,
  "blocker": "No downloadable or convertible geometry source found",
  "evidence": [
    "representation candidates tested",
    "dsdo Locate fileCount=0",
    "no GLB/OBJ/STL",
    "no STEP available"
  ]
}
```

## Proibido

- 3DPlay como solução final.
- iframe 3DPlay.
- postMessage para 3DPlay como sucesso.
- cubo fake.
- modelo hardcoded.
- placeholder como entrega.
- arquivo 3D não relacionado à linha selecionada.

## Status após este PR

- E-BOM e seleção real continuam no controller oficial.
- 3DView fica bloqueado de forma honesta até PR específico de Geometry Resolver.
- Maturidade write continua bloqueada até PR específico com transições reais + reread.
