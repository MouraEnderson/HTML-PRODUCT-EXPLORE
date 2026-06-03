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
