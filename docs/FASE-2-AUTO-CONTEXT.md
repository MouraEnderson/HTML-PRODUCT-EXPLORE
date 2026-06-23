# FASE 2 — Auto-context from Product Explorer

## Componentes

- `assets/js/bom-auto-context-detector-bom20260622b.js`
  - Executa 4 probes oficiais/runtime em paralelo:
    1. `PlatformAPI.getStructureContext()` quando exposto pelo runtime do 3DDashboard
    2. `ExplorerContext.currentSelection` / `ProductExplorerBridge.getSelection()`
    3. contexto `3DXCompass` / `widget.getValue('context')` / embed query controlado
    4. `PlatformBridge` com `postMessage` controlado
  - Proibido no produto:
    - DOM scraping
    - `window.top.document`
    - `window.parent.document`
    - `iframe.contentDocument`
    - leitura de DOM de iframe irmão
    - clipboard/TSV
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
- não usa registry CJ se o contexto atual não for CJ
- não carrega nada automaticamente quando o contexto não é seguro

## Critérios de aceite

- CJ aberta e contexto oficial disponível → resolve root CJ e carrega CJ.
- SKA aberta e contexto oficial disponível → resolve SKA e não cai em CJ.
- Recentes / sem estrutura ativa → não carrega nada automaticamente.
- Troca de contexto → limpa estado anterior e resolve novamente.
- Sem API/runtime oficial para seleção do Product Explorer → mantém entrada manual explícita como alternativa oficial.

## Validação local

- `cd backend && npm test`
- `node scripts/test-session-controller.js`
- `node scripts/test-auto-context.js`
