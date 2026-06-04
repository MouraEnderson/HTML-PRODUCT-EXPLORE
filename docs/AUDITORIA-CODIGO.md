# Auditoria de Codigo e Arquitetura

Data: 2026-06-03

## Objetivo do produto

O app deve ser um BOM Analytics para 3DDashboard / Additional App, publicado via GitHub Pages, capaz de ler automaticamente a estrutura aberta no Product Structure Explorer e apresentar uma E-BOM real, completa e navegavel.

Fluxo principal obrigatorio:

```text
Additional App -> WAFData -> i3DXCompassServices -> 3DSpace REST -> dseng/ENOVIA -> E-BOM normalizada
```

O app deve entregar:

- leitura automatica da estrutura, sem depender de `Ctrl+A`, `Ctrl+C`, `Ctrl+V` ou botao manual como fluxo de produto;
- suporte a qualquer tamanho pratico de estrutura, de 1 peca a centenas de milhares de itens;
- E-BOM com pais e filhos, preservando titulo, descricao, revisao, proprietario, tipo, maturidade e IDs;
- KPIs, graficos e tabela coerentes com a E-BOM carregada;
- selecao de item na E-BOM acionando 3DView proprio dentro da aplicacao;
- fallback manual apenas como contingencia temporaria;
- console sem tempestade de `404`, `406` ou chamadas de midia durante carga de estrutura.

## Fora do produto

- Web Page Reader.
- Deploy admin em `webapps` da plataforma 3DX.
- Widget 3DPlay separado como solucao final.
- TSV/clipboard/DOM mirror como arquitetura principal.
- Limite funcional fixo de itens.

## Motivo da auditoria

Os testes reais mostraram que corrigir o fallback TSV por heuristica esta levando a comportamento inconsistente. A raiz passou a aparecer, mas os metadados do pai continuaram errados no dashboard real, mesmo com testes locais passando.

Conclusao: antes de novas mudancas, e necessario auditar o codigo inteiro e reduzir os caminhos concorrentes que alteram a estrutura.

## Hipotese atual

O codigo possui multiplos pontos capazes de carregar, normalizar ou alterar a E-BOM:

- loader API;
- loader TSV;
- loader paste/clipboard;
- fallback DOM/mirror;
- `BomSnapshot`;
- `BomService`;
- enriquecedores de owner/PRD/imagem.

Esses caminhos podem alterar raiz, metadados, contagem e IDs em momentos diferentes. Isso cria diferenca entre teste local e runtime real no 3DDashboard.

## Regras da auditoria

- Nao alterar runtime durante a auditoria.
- Nao atualizar dependencias.
- Nao apagar arquivos.
- Nao refatorar antes de concluir o mapa.
- Registrar achados como fatos, riscos ou hipoteses.
- Priorizar caminho API-first e escalavel.
- Tratar TSV/manual como contingencia isolada.

## Perguntas que a auditoria precisa responder

1. Qual arquivo decide o loader principal no clique/auto-sync?
2. Quais arquivos podem montar payload E-BOM?
3. Quais arquivos podem inserir, remover ou reordenar a raiz?
4. Quais arquivos podem sobrescrever revisao, proprietario, tipo e maturidade?
5. Quais flags do `APP_CONFIG` estao contraditorias ou obsoletas?
6. Onde o app ainda depende de clipboard, TSV ou DOM mirror como fluxo primario?
7. Onde o app resolve `physicalId` da raiz aberta no Explorer?
8. Onde o app resolve 3DSpace via Compass?
9. Onde o app chama `dseng` e como trata paginacao/filhos?
10. O que precisa existir para estruturas de 300 mil itens: lazy loading, virtualizacao, cache e cancelamento?
11. Onde sera criado o pipeline 3D proprio vinculado ao item da E-BOM?

## Arquivos inicialmente suspeitos

### Entrada e configuracao

- `assets/js/app.js`
- `assets/js/config.js`
- `assets/js/widget-boot.js`
- `assets/js/boot.js`
- `assets/js/3dx-boot.js`

### Plataforma 3DX

- `assets/js/platform/compass.js`
- `assets/js/platform/waf-client.js`
- `assets/js/platform/waf-bootstrap.js`
- `assets/js/platform/platform-bridge.js`
- `assets/js/platform/context.js`
- `assets/js/integration/explorer-context.js`
- `assets/js/integration/product-explorer-bridge.js`
- `assets/js/integration/enovia-api.js`

### Carga e normalizacao E-BOM

- `assets/js/services/bom-orchestrator.js`
- `assets/js/services/api-bom-loader.js`
- `assets/js/services/tsv-bom-loader.js`
- `assets/js/services/paste-bom-loader.js`
- `assets/js/services/explorer-scanner.js`
- `assets/js/services/file-import-service.js`
- `assets/js/services/bom-snapshot.js`
- `assets/js/services/bom-service.js`
- `assets/js/processing/bom-normalizer.js`
- `assets/js/services/attribute-service.js`

### Preview, midia e 3D

- `assets/js/ui/part-preview.js`
- `assets/js/ui/part-image.js`
- `assets/js/ui/3dplay-viewer.js`
- `assets/js/integration/3dplay-bridge.js`

### UI da E-BOM

- `assets/js/ui/data-table.js`
- `assets/js/ui/bom-tree.js`
- `assets/js/ui/sync-banner.js`
- `assets/js/ui/charts-manager.js`
- `assets/js/ui/kpi-cards.js`

## Entregaveis da auditoria

1. Mapa de fluxo atual.
2. Mapa de fluxo alvo.
3. Matriz de arquivos: manter, revisar, isolar, remover depois.
4. Lista de flags conflitantes.
5. Lista de bugs/riscos confirmados.
6. Plano de corte para chegar a um unico pipeline de estrutura.
7. Plano de testes reais: 1 item com 2 corpos, 3 itens, 20 itens, 79 itens e estrutura grande.

## Criterio de saida

A auditoria so termina quando houver clareza suficiente para implementar sem tentativa e erro:

- qual e o pipeline principal;
- qual e o fallback;
- quais arquivos ficam responsaveis por cada etapa;
- quais caminhos deixam de mexer na estrutura;
- quais testes precisam provar o comportamento antes de publicar.

## Achados iniciais

### A1 - Botao manual esta forcando fallback paste

Arquivo: `assets/js/app.js`

O fluxo do botao `Atualizar estrutura` entra em `runImportFromClipboard` e chama:

```text
BomOrchestrator.refreshStructure({
  source: 'manual',
  allowAutoCopy: ...,
  preferApi: false,
  forceLoader: 'paste'
})
```

Impacto:

- contradiz o objetivo API-first;
- transforma o paliativo Ctrl+C/Ctrl+V no caminho principal do botao;
- mascara falhas reais da API;
- torna impossivel validar leitura automatica enquanto esse fluxo for o principal.

Status: confirmado por leitura de codigo.

### A2 - Auto-sync existe, mas evita estrutura maior sem paste

Arquivo: `assets/js/app.js`

`syncOpenExplorerStructure` roda por poll (`AUTO_SYNC_EXPLORER_MS: 4000`), mas para estruturas acima de `AUTO_SYNC_REQUIRE_PASTE_ABOVE` quando nao ha buffer de cola.

Impacto:

- o app aparenta ter leitura automatica, mas estruturas acima de 12 itens caem para instrucao manual;
- isso explica parte do comportamento observado em 20/79 itens;
- contradiz o requisito de leitura automatica para qualquer tamanho.

Status: confirmado por leitura de codigo.

### A3 - Existem multiplos caminhos aplicando payload E-BOM

Arquivos:

- `assets/js/services/explorer-scanner.js`
- `assets/js/services/tsv-bom-loader.js`
- `assets/js/services/paste-bom-loader.js`
- `assets/js/services/bom-snapshot.js`
- `assets/js/ui/drop-zone.js`
- `assets/js/ui/snapshot-panel.js`

Pontos de aplicacao:

- `BomSnapshot.buildFromImported(...)`
- `BomSnapshot.applyPayload(...)`
- `BomService.loadFromImportedItems(...)`
- `BomService.loadLazyFull(...)`

Impacto:

- raiz, contagem e metadados podem ser tratados em lugares diferentes;
- testes locais de um caminho nao garantem comportamento do dashboard real;
- aumenta risco de pai/filho e metadados divergirem.

Status: confirmado por busca de chamadas.

### A4 - `BomSnapshot` ainda altera estrutura antes de aplicar

Arquivo: `assets/js/services/bom-snapshot.js`

`buildFromImported` chama `ensureContextRoot`, que pode inserir raiz sintética com base em contexto externo.

Impacto:

- camada de snapshot nao e apenas snapshot;
- ela altera raiz e metadados;
- isso mistura responsabilidade de normalizacao com persistencia/aplicacao.

Status: confirmado por leitura de codigo.

### A5 - `FileImportService` tambem altera raiz e metadados

Arquivo: `assets/js/services/file-import-service.js`

O parser possui funcoes como `ensureFirstPastedRoot`, `firstPastedProductMeta` e reparos de owner/title.

Impacto:

- parser TSV esta assumindo responsabilidade de estrutura;
- a mesma regra de raiz pode ser aplicada antes e depois por modulos diferentes;
- aumenta o risco de duplicar raiz ou criar raiz com metadados incompletos.

Status: confirmado por leitura de codigo.

### A6 - Configuracao atual possui flags conflitantes

Arquivo: `assets/js/config.js`

Exemplos:

- `PRIMARY_LOADER: 'api'`
- `PREFER_API_ON_MANUAL_REFRESH: true`
- `AUTO_SYNC_PREFER_API: false`
- botao manual em `app.js` usando `forceLoader: 'paste'`
- `FAST_TSV_MAX: 500`
- `AUTO_SYNC_REQUIRE_PASTE_ABOVE: 12`

Impacto:

- o comportamento real depende de combinacoes de flags e overrides no codigo;
- o nome das flags sugere API-first, mas o runtime manual força paste;
- dificulta depurar 404/406 e contagem.

Status: confirmado por leitura de codigo.

### A7 - API 3DSpace/dseng existe, mas nao governa o fluxo principal

Arquivos:

- `assets/js/platform/compass.js`
- `assets/js/platform/waf-client.js`
- `assets/js/integration/enovia-api.js`
- `assets/js/services/api-bom-loader.js`
- `assets/js/services/bom-service.js`

O codigo tem resolucao de 3DSpace, WAFData, chamadas `dseng:EngItem` e `dseng:EngInstance`, mas o botao principal nao usa esse caminho atualmente.

Impacto:

- o app tem parte da base API-first, mas o fluxo validado pelo usuario esta no fallback;
- os erros 404/406 precisam ser investigados no caminho API sem interferencia de TSV/DOM/paste;
- nao ha criterio claro de quando API falha e quando fallback assume.

Status: confirmado por leitura de codigo.

### A8 - `EnoviaApi.getProductRoot` ainda tenta PhysicalProduct/VPMReference para IDs `prd-`

Arquivo: `assets/js/integration/enovia-api.js`

Para IDs cloud `prd-`, o codigo tenta `getPhysicalProduct`/`getVpmReference` antes de `getEngItem`.

Impacto:

- pode ser necessario para resolver raiz, mas precisa ser comprovado contra a documentacao FD02;
- pode reintroduzir endpoints que geram 404/406;
- precisa de teste diagnostico isolado no tenant real.

Status: confirmado por leitura de codigo; validacao documental pendente.

### A9 - O orquestrador ainda mistura API, TSV, paste e DOM como fontes equivalentes

Arquivo: `assets/js/services/bom-orchestrator.js`

`pickLoaderMode` escolhe entre `api`, `tsv`, `paste` e `dom-fallback`. Depois, `runManualFallbackChain` e `runAutoFallbackChain` tentam outras fontes quando a primeira falha.

Impacto:

- a aplicacao nao possui uma unica verdade para a estrutura;
- uma falha de API pode ser escondida por TSV/paste;
- cada fonte pode aplicar regras diferentes de raiz, contagem e metadados;
- dificulta reproduzir erros 404/406 e entender se o E-BOM veio da API real ou do paliativo.

Status: confirmado por leitura de codigo.

### A10 - Existe limite funcional no store atual

Arquivos:

- `assets/js/config.js`
- `assets/js/services/bom-service.js`

`APP_CONFIG.BOM_MAX_NODES` esta definido como `50000` e `BomService.canAddNode()` interrompe inclusao quando `nodeCount` atinge esse valor.

Impacto:

- conflita com o requisito de suportar estruturas sem limite funcional de contagem, inclusive cenarios de 300 mil itens;
- pode gerar carga parcial sem deixar claro para o usuario;
- a solucao correta exige paginacao, cache, busca, lazy loading e UI virtualizada, nao apenas aumentar o numero.

Status: confirmado por leitura de codigo.

### A11 - Raiz sintetica e metadados sao corrigidos em mais de um modulo

Arquivos:

- `assets/js/services/file-import-service.js`
- `assets/js/services/bom-snapshot.js`
- `assets/js/services/bom-service.js`

`FileImportService.ensureFirstPastedRoot`, `BomSnapshot.ensureContextRoot` e `BomService.loadFromImportedItems` participam da decisao de raiz/level/metadados quando a fonte e TSV/paste.

Impacto:

- explica erros como pai sem revisao/proprietario ou pai criado com dados herdados do filho;
- torna instavel a diferenca entre 20 linhas copiadas e 19 linhas exibidas;
- precisa virar uma unica etapa de normalizacao, com regras testaveis.

Status: confirmado por leitura de codigo e pelos testes manuais reportados.

### A12 - O fluxo 3D atual ainda e 3DPlay/2D, nao viewer proprio

Arquivos:

- `assets/js/ui/part-preview.js`
- `assets/js/ui/3dplay-viewer.js`
- `assets/js/integration/3dplay-bridge.js`
- `assets/js/ui/part-image.js`

Ao selecionar uma linha, `PartPreview.show` chama `ThreeDPlayViewer.show`. Esse viewer prefere painel 2D quando `PREFER_2D_IN_PANEL` ou `EMBED_PLAYER === false`, e o bridge ainda tenta resolver IDs para 3DPlay.

Impacto:

- nao atende o requisito final de 3DView proprio dentro da aplicacao;
- `getpicture`/miniatura fica misturado com visualizacao 3D;
- IDs sinteticos (`IMP_`, `grid_`) nunca serao suficientes para render 3D real.

Status: confirmado por leitura de codigo.

### A13 - `product-explorer-bridge.js` concentra responsabilidades demais

Arquivo: `assets/js/integration/product-explorer-bridge.js`

Arquivo com 2428 linhas. Ele participa de selecao, espelho DOM, leitura de contexto do dashboard, catalogo de IDs, enrichment de owner/PRD, auto-copy, contagem e filtros de ruido.

Impacto:

- alto acoplamento com fallback manual e heuristicas do Explorer;
- risco alto de corrigir uma parte e quebrar outra;
- deve ser isolado como adaptador temporario, nao como fonte principal do produto.

Status: confirmado por leitura de codigo.

### A14 - `DropZone` e `SnapshotPanel` ainda bypassam o fluxo de orquestracao

Arquivos:

- `assets/js/ui/drop-zone.js`
- `assets/js/ui/snapshot-panel.js`

Esses componentes chamam `FileImportService.parseTextAsync`, `BomSnapshot.buildFromImported` ou `BomService.loadFromImportedItems` diretamente.

Impacto:

- criam entradas paralelas para alterar o E-BOM;
- podem aplicar dados sem passar por um orquestrador/normalizador unico;
- devem ser isolados como ferramenta de diagnostico/importacao manual, fora do fluxo principal.

Status: confirmado por leitura de codigo.

### A15 - `CompassServices` possui fallback estatico para tenant

Arquivo: `assets/js/platform/compass.js`

O modulo usa `i3DXCompassServices.getServiceUrl('3DSpace', platformId)`, mas tambem possui fallback para `tenantSpaceUrl()`. O fallback IFWE esta bloqueado por flag, porem o fallback estatico para `spaceHost` continua existindo.

Impacto:

- pode ser util como contingencia, mas precisa aparecer em diagnostico;
- a URL efetiva deve ser comprovada no tenant real;
- nao podemos tratar IFWE como 3DSpace.

Status: confirmado por leitura de codigo.

### A16 - Bundles gerados estao versionados junto com fonte

Arquivos:

- `assets/js/bom-bundle.js`
- `assets/js/bom-bundle-bom20260606f.js`

Os bundles contem copia concatenada dos modulos fonte e aparecem nas buscas com milhares de linhas duplicadas.

Impacto:

- dificulta auditoria e revisao;
- aumenta risco de editar fonte e esquecer bundle;
- para publicacao via GitHub Pages pode ser necessario manter bundle, mas a regra de geracao precisa ficar explicita.

Status: confirmado por leitura de codigo.

## Matriz preliminar por arquivo

Legenda:

- **Manter**: faz parte do nucleo provavel do produto.
- **Revisar**: necessario, mas precisa reduzir acoplamento/risco.
- **Isolar**: manter como fallback, diagnostico ou legado temporario, fora do fluxo principal.
- **Remover depois**: nao apagar agora; remover somente apos substituicao validada.

| Area | Arquivo | Decisao | Motivo |
| --- | --- | --- | --- |
| Boot/publicacao | `index.html` | Manter | Entrada GitHub Pages/Additional App. |
| Boot/publicacao | `assets/js/widget-boot.js` | Revisar | Bootstrap WAF/Require precisa permanecer, mas deve ficar pequeno e diagnostico. |
| Boot/publicacao | `assets/js/boot.js` | Revisar | Confirmar papel frente ao bundle atual. |
| Boot/publicacao | `assets/js/3dx-boot.js` | Revisar | Confirmar se ainda e usado ou se duplicou bootstrap. |
| Boot/publicacao | `assets/js/build-id.js` | Manter | Identificacao de build ajuda nos testes em tenant. |
| Build | `scripts/build-bundle-node.js` | Manter | Define ordem ativa do bundle. |
| Build | `assets/js/bom-bundle.js` | Revisar | Necessario para Pages, mas deve ser gerado, nao editado manualmente. |
| Build | `assets/js/bom-bundle-bom20260606f.js` | Isolar | Snapshot de bundle versionado; decidir politica de historico depois. |
| Config | `assets/js/config.js` | Revisar | Flags conflitam com API-first e ha limite `BOM_MAX_NODES`. |
| Query | `assets/js/embed-query.js` | Manter | Parametros de embed sao uteis para debug/publicacao. |
| Plataforma | `assets/js/platform/widget-runtime.js` | Manter | Adaptacao Additional App. |
| Plataforma | `assets/js/platform/platform-bridge.js` | Revisar | Ponte externa precisa ser pequena e comprovada. |
| Plataforma | `assets/js/platform/context.js` | Manter | Contexto/CSRF deve ficar centralizado. |
| Plataforma | `assets/js/platform/compass.js` | Revisar | Resolver 3DSpace via Compass e auditar fallback estatico. |
| Plataforma | `assets/js/platform/waf-bootstrap.js` | Manter | Base para carregar WAFData/Compass. |
| Plataforma | `assets/js/platform/waf-client.js` | Revisar | Cliente central, mas precisa expor diagnostico claro de URL/status. |
| API | `assets/js/integration/enovia-api.js` | Revisar | Nucleo REST dseng, mas root/children precisam ser comprovados na FD02. |
| API | `assets/js/services/api-bom-loader.js` | Manter | Loader API deve virar caminho principal. |
| API | `assets/js/services/api-diagnostic.js` | Manter | Essencial para testar tenant sem contaminar fluxo. |
| API | `assets/js/services/bom-service.js` | Revisar | Store/lazy loader util, mas limite e import path precisam mudar. |
| API | `assets/js/services/attribute-service.js` | Manter | Normalizacao de atributos deve ser preservada e testada. |
| API | `assets/js/services/physical-product-service.js` | Revisar | Pode ajudar no pipeline 3D, mas papel precisa ser separado da E-BOM. |
| Busca | `assets/js/integration/search-api.js` | Isolar | Busca nao e fluxo principal de estrutura. |
| Busca | `assets/js/services/product-search-service.js` | Isolar | Manter fora da carga E-BOM principal. |
| Busca | `assets/js/ui/product-search-panel.js` | Isolar | UI auxiliar, nao objetivo central agora. |
| Explorer | `assets/js/integration/explorer-context.js` | Revisar | Contexto do Explorer e necessario, mas nao deve decidir loader sozinho. |
| Explorer | `assets/js/integration/product-explorer-bridge.js` | Isolar | Adaptador grande demais; manter temporario como leitura de contexto/fallback. |
| Fallback | `assets/js/services/file-import-service.js` | Isolar | Parser manual deve alimentar normalizador unico, nao decidir estrutura final. |
| Fallback | `assets/js/services/tsv-bom-loader.js` | Isolar | Contingencia manual, nao fluxo primario. |
| Fallback | `assets/js/services/paste-bom-loader.js` | Isolar | Contingencia manual, nao fluxo primario. |
| Fallback | `assets/js/services/explorer-scanner.js` | Isolar | Mistura API/DOM/paste/builtin; precisa ser quebrado em adaptadores. |
| Snapshot | `assets/js/services/bom-snapshot.js` | Revisar | Util para testes/sessao, mas nao pode corrigir raiz em paralelo. |
| Orquestracao | `assets/js/services/bom-orchestrator.js` | Revisar | Deve virar fluxo unico API-first com fallback explicito. |
| Processamento | `assets/js/processing/bom-normalizer.js` | Manter | Deve virar ponto unico de normalizacao. |
| Processamento | `assets/js/processing/metrics-engine.js` | Manter | KPIs dependem dele. |
| Processamento | `assets/js/processing/anomaly-detector.js` | Revisar | Util, mas secundario frente a carga/3D. |
| UI | `assets/js/app.js` | Revisar | Controlador central com muita responsabilidade; precisa emagrecer por etapas. |
| UI | `assets/js/ui/data-table.js` | Revisar | Tabela E-BOM e central, mas precisa virtualizacao para grandes estruturas. |
| UI | `assets/js/ui/kpi-cards.js` | Manter | KPIs do painel. |
| UI | `assets/js/ui/charts-manager.js` | Manter | Graficos atuais, desde que nao bloqueiem carga. |
| UI | `assets/js/ui/filters.js` | Manter | Busca/filtros sao essenciais em BOM grande. |
| UI | `assets/js/ui/sync-banner.js` | Manter | Estado claro de carregamento/erro. |
| UI | `assets/js/ui/layout-fit.js` | Manter | Ajuste visual dentro do dashboard. |
| UI | `assets/js/ui/dashboard-theme.js` | Manter | Tema/UX atual. |
| UI | `assets/js/ui/bom-tree.js` | Isolar | Arvore nao esta como tela principal; pode voltar depois se precisar. |
| UI | `assets/js/ui/explorer-sync-panel.js` | Isolar | Diagnostico/fallback, nao produto final. |
| UI | `assets/js/ui/snapshot-panel.js` | Isolar | Ferramenta de snapshot/importacao, fora do fluxo principal. |
| UI | `assets/js/ui/drop-zone.js` | Isolar | Entrada manual/drag-drop paralela ao orquestrador. |
| 3D | `assets/js/ui/part-preview.js` | Revisar | Painel certo para selecao, mas precisa trocar backend visual para viewer proprio. |
| 3D | `assets/js/ui/part-image.js` | Isolar | Miniatura/getpicture separado da estrutura e do 3D real. |
| 3D | `assets/js/ui/3dplay-viewer.js` | Remover depois | Placeholder/legado 3DPlay/2D; substituir por viewer proprio. |
| 3D | `assets/js/integration/3dplay-bridge.js` | Remover depois | 3DPlay nao e caminho de produto. |

## Primeiro corte tecnico recomendado

Ainda sem editar runtime, a auditoria aponta que a proxima implementacao deve separar claramente:

```text
UI/evento -> Orquestrador unico -> Loader API principal -> Normalizador unico -> Store E-BOM -> UI/3D
```

Fallback manual deve existir como:

```text
Fallback TSV/manual -> mesmo Normalizador unico -> Store E-BOM
```

Ou seja: o fallback pode alimentar dados, mas nao pode ter regras paralelas para raiz, metadados ou contagem.
