# FASE 2 — Auto-context from Product Explorer

## Componentes

- `assets/js/bom-auto-context-detector-bom20260622b.js`
  - Executa 5 probes em paralelo:
    1. `PlatformAPI.getStructureContext()`
    2. `ExplorerContext.currentSelection` / `ProductExplorerBridge.getSelection()`
    3. contexto `3DXCompass`
    4. `PlatformBridge` com `postMessage`
    5. inspeção segura de `iframe` irmão acessível
- `assets/js/bom-expandable-object-resolver-bom20260622b.js`
  - Resolve o objeto detectado para `dseng:EngItem`
  - Estratégias:
    1. GET direto por ID hexadecimal
    2. UQL `name:"prd-*"`
    3. UQL `label:"título"`
    4. busca pontuada com bloqueio explícito para ambiguidade
- `assets/js/bom-auto-expand-orchestrator-bom20260622b.js`
  - Roda no boot do widget
  - Atualiza badge/status
  - Preenche `#explorerObjectId` e `#skaDepthInput`
  - Dispara `loadManualInput()` quando a profundidade estimada é maior que zero

## UI

`widget-v3.html` agora expõe:

- `#autoContextBadge`
- `#autoContextLabel`
- `#btnRetryAutoContext`
- `#skaDepthInput`

## Diagnostics

`__bomWafSessionController.exportDiagnostics()` agora inclui:

- `autoContextProbeResults`
- `detectedObject`
- `resolverStrategy`
- `expectedChildCount`
- `estimatedDepth`
- `autoContextTimings`

## Fallback honesto

Quando nenhuma probe encontra contexto válido, o widget:

- mostra `Aguardando seleção no Explorer`
- mantém a entrada manual ativa
- permite reexecutar a detecção com `Tentar detectar novamente`

## Validação local

- `cd backend && npm test`
- `node scripts/test-session-controller.js`
- `node scripts/test-auto-context.js`
