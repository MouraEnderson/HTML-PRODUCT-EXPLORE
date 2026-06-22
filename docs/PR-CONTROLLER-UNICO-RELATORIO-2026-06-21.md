# PR Controller Unico - Relatorio de Entrega

Data: 2026-06-21

## Objetivo entregue

O fluxo operacional da E-BOM foi consolidado no controller
`assets/js/bom-waf-session-controller-bom20260621e.js`.

O caminho ativo agora e:

```text
Additional App -> ProductExplorerSyncProvider -> WAFData -> 3DSpace dseng
-> bom-waf-session-controller -> estado unico -> tabela/KPIs/graficos/propriedades
```

`widget-v3.html`, `boot.js` e o refresh de `widget-runtime.js` nao iniciam mais
`App.run()` como caminho de produto.

## Mudancas principais

1. Criado controller oficial com API publica limitada a `boot`, `sync`,
   `refresh`, `resolveCurrentRoot`, `loadStructure`, `selectRow`, `getState` e
   `exportDiagnostics`.
2. O botao `Atualizar estrutura` e os botoes de sincronizacao sao clonados e
   ligados apenas pelo controller durante o boot. Isso remove listeners legados
   ja registrados no elemento ativo.
3. O contexto e lido pelo `ProductExplorerSyncProvider`, que consulta
   `PlatformAPI.getSelection()` e `DS/Selection/Selection.getSelection()`.
   O controller nao usa `ProductExplorerBridge`, clipboard ou leitura do DOM
   como fonte de estrutura.
4. Root dseng e resolvido por id oficial, `prd -> EngItem` ou busca UQL exata.
   O registry CJ MESA so e usado quando titulo ou physical ID confirma CJ MESA.
5. A carga usa `WafBootstrap`, `PlatformContext`, Compass 3DSpace, CSRF e
   `EnoviaApi.expandEngItem()`; nenhuma linha vem de TSV, snapshot, Render ou
   clipboard.
6. O normalizador preserva cada objeto de ocorrencia por `rowKey`, incluindo
   `instanceId`, `referenceId`, pai, nivel, caminho e campos de propriedades.
   Ele nao deduplica pela referencia.
7. O rodape passa a expor `displayRows`, ocorrencias, referencias unicas,
   `rawRows`, profundidade e estado `VALID`/`PARTIAL`.
8. A tabela nao descarta apos 8 mil linhas: todas as linhas ficam no estado e o
   DOM e acrescido em blocos de mil durante a rolagem.
9. O painel direito apresenta dados reais da linha selecionada, inclusive
   Reference ID e Instance ID. 3DView e maturidade write continuam explicitamente
   bloqueados e sem mensagem de falso sucesso.

## Itens removidos do caminho operacional

Os arquivos de TSV, clipboard, snapshot, scanner DOM, `BomOrchestrator`,
`ProductExplorerBridge`, 3DPlay e `App.run()` permanecem no repositorio para
historico/compatibilidade, mas nao sao invocados pelo bootstrap oficial desta PR.
O inventario completo esta em
`docs/PR-CONTROLLER-UNICO-INVENTARIO-2026-06-21.md`.

## Testes locais executados

Comando:

```powershell
node scripts/build-bundle-node.js
node --check assets/js/bom-waf-session-controller-bom20260621e.js
node scripts/test-session-controller.js
git diff --check
```

Resultado: todos passaram.

O teste de contrato cobre:

- SKA nao e classificado como CJ;
- registry CJ apenas com titulo ou physical ID CJ;
- duas instancias de uma referencia sao mantidas como duas linhas;
- contadores distinguem ocorrencias de referencias unicas;
- diagnostico exportado nao inclui cookie, token ou authorization;
- `widget-v3.html` inicia o controller oficial e nao contem `App.run()`.

## Teste no tenant autenticado

Ainda e obrigatorio validar no Additional App autenticado, pois apenas o tenant
real fornece o payload de `dseng:EngItem/expand` e a selecao atual do Explorer.

1. Abra SKA_ENDERSW-BES-00009887 no Product Structure Explorer.
2. Clique `Atualizar estrutura` uma vez.
3. Confirme que o titulo/Reference ID nao sao CJ MESA e que o rodape mostra as
   metricas separadas.
4. Abra CJ MESA 4BCS VP TOP 3DX e repita. Nesse caso o registry CJ pode aparecer
   como fonte do root.
5. Se a API falhar, use `window.__bomWafSessionController.exportDiagnostics()`
   no console. O diagnostico nao contem credenciais.

## Limitacoes honestas

- A forma exata do payload `expand` deve ser confirmada no tenant para completar
  qualquer mapeamento de campos especificos do release FD02. O controller nao
  tenta TSV, DOM ou CJ como substituto silencioso se esse payload nao fornecer
  ocorrencias utilizaveis.
- 3DView real depende de um geometry resolver e ticket/FCS; nao foi iniciado.
- Maturidade write depende de um contrato de transicao permitido; nao foi iniciado.

## Referencias tecnicas

- 3DEXPERIENCE Developer Documentation, CAA IAM REST:
  https://media.3ds.com/support/documentation/developer/Cloud/FD02/en/DSDoc.htm?show=CAAiamREST/CAATciamRESTToc.htm
- Contrato e evidencias anteriores do repositorio:
  `docs/ANALISE-CONTRATO-EBOM-2026-06-06.md`,
  `docs/VALIDACAO-EXPAND-ITEM-3DDASHBOARD.md` e
  `docs/SPRINT-29-CONTRATO-DSENG-MASK-DETAILS.md`.
