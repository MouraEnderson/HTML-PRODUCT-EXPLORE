# PR Controller Unico - Inventario Operacional

Data: 2026-06-21

## Decisao desta PR

O unico dono operacional da sincronizacao de E-BOM passara a ser
`assets/js/bom-waf-session-controller-bom20260621e.js`.

Ele sera iniciado por `widget-v3.html`, `boot.js` e pelo refresh do widget. Nenhum
desses pontos deve iniciar `App.run()` como fluxo de carga de estrutura.

## Inventario do checkout atual

| Responsabilidade | Arquivos atuais | Acao nesta PR |
| --- | --- | --- |
| Bootstrap do widget | `widget-v3.html`, `assets/js/widget-boot.js`, `assets/js/boot.js`, `assets/js/widget-runtime-bom20260617[b-d].js` | Direcionar os pontos ativos para o controller. Os runtimes versionados antigos ficam legados e nao sao carregados por `widget-v3.html`. |
| Botao Atualizar estrutura (`btnImportPaste`) | `assets/js/app.js`, `assets/js/ui/drop-zone.js`, `assets/js/ui/snapshot-panel.js` | Permanecem no repositorio como legado, mas nao sao inicializados pelo bootstrap oficial. O controller reatribui o botao uma vez. |
| Botao Sincronizar / Atualizar BOM | `assets/js/ui/explorer-sync-panel.js`, `assets/js/app.js`, `assets/js/platform/widget-runtime.js` | O controller e o unico listener operacional. `widget-runtime.js` passa a chamar `controller.refresh()`. |
| Renderizacao da tabela | `assets/js/ui/data-table.js`, `assets/js/app.js` | `DataTable` sera somente renderer. O controller sera a unica fonte de `setData`. |
| Contadores, graficos e propriedades | `assets/js/processing/metrics-engine.js`, `assets/js/ui/kpi-cards.js`, `assets/js/ui/charts-manager.js`, `assets/js/ui/part-preview.js`, `assets/js/app.js` | Manter renderizadores; retirar `app.js` do boot operacional. O controller calcula e entrega um estado unico. |
| Contexto / root | `assets/js/integration/product-explorer-sync-provider.js`, `assets/js/integration/explorer-context.js`, `assets/js/integration/product-explorer-bridge.js`, `assets/js/integration/enovia-api.js` | Usar somente `ProductExplorerSyncProvider` (PlatformAPI, DSSelection e contexto permitido) e `EnoviaApi`. `ProductExplorerBridge` e DOM mirror nao entram no controller. |
| WAFData / CSRF / 3DSpace | `assets/js/platform/waf-bootstrap.js`, `assets/js/platform/context.js`, `assets/js/platform/compass.js`, `assets/js/platform/waf-client.js`, `assets/js/integration/enovia-api.js` | Manter como cadeia oficial autenticada. |
| Clipboard, TSV, snapshot e DOM mirror | `assets/js/services/tsv-bom-loader.js`, `assets/js/services/paste-bom-loader.js`, `assets/js/services/file-import-service.js`, `assets/js/services/bom-snapshot.js`, `assets/js/services/explorer-scanner.js`, `assets/js/services/bom-orchestrator.js` | Legado inerte para o fluxo de produto. Nao sera chamado pelo controller. |
| 3DPlay e imagem | `assets/js/integration/3dplay-bridge.js`, `assets/js/ui/3dplay-viewer.js`, `assets/js/ui/part-image.js` | Fora do fluxo desta PR. O painel exibira somente disponibilidade honesta da linha real. |
| Fallback CJ MESA | `APP_CONFIG.STRUCTURE_IDS`, `assets/js/integration/enovia-api.js`, `assets/js/app.js`, scanner e importadores | O controller permite registry somente quando o contexto atual e comprovadamente CJ MESA. Nenhum fallback global. |

## Conflitos comprovados

1. `widget-v3.html` carrega o bundle e chama `App.run()`, seguido de
   `rebindScanButton()` e `rebindImportButton()`.
2. `assets/js/boot.js` carrega arquivos individuais e chama `App.run()`, com
   `runFallback()` posterior.
3. `app.js`, `drop-zone.js` e `snapshot-panel.js` registram ou religam o
   `btnImportPaste`.
4. `explorer-sync-panel.js` registra `btnSyncExplorer` e usa estado persistido
   proprio.
5. `widget-runtime.js` aciona o refresh simulando clique de botao.

Essa combinacao explica carga repetida, contagem stale e fontes concorrentes.

## Contrato operacional novo

`window.__bomWafSessionController` expora apenas:

```js
{ boot, sync, refresh, resolveCurrentRoot, loadStructure, selectRow, getState, exportDiagnostics }
```

O controller deve usar WAFData autenticado, SecurityContext e CSRF para carregar
E-BOM. Falhas vao para status e diagnostico; nunca para `tbody`.

## Restricoes assumidas

- Nenhum cookie manual, clipboard, TSV, Render CAS, DOM scraping,
  `window.top.document` ou `iframe.contentDocument` faz parte do fluxo.
- O registry CJ conhecido so pode ser usado quando titulo ou physical ID do
  contexto atual confirma CJ MESA.
- O teste remoto no tenant precisa ser feito no Additional App autenticado. Os
  testes locais desta PR validam contrato, isolamento de listeners e normalizacao.
- 3DView real e maturidade write continuam fora desta PR; nao sera exibido sucesso
  falso para essas capacidades.
