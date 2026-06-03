# Levantamento Atual 3DX - BOM Analytics / Product Explore

Data do levantamento: 2026-06-03

Repositorio analisado: `MouraEnderson/HTML-PRODUCT-EXPLORE`

Branch analisada: `main`

Commit analisado: `56cd59fd85fdfb571175b1bf96311e5b31be49ba`

Build atual identificado no codigo: `bom20260606f`

## Contexto Alinhado

O projeto deve funcionar como aplicacao HTML/JavaScript/CSS publicada via GitHub Pages e executada dentro do 3DDashboard como Additional App.

Escopo confirmado:

- Usar repositorio GitHub como fonte do app.
- Rodar no 3DDashboard / Additional App.
- Consumir APIs autenticadas da plataforma via contexto do widget.
- Nao usar Web Page Reader.
- Nao depender de deploy administrativo em `webapps` da plataforma 3DEXPERIENCE.
- Nao usar widget 3DPlay separado.
- Implementar visualizador 3D proprio dentro da aplicacao.

## Objetivo Aparente do Projeto

O app tenta entregar um dashboard de E-BOM integrado ao Product Structure Explorer da 3DEXPERIENCE, com:

- leitura da estrutura aberta no Explorer;
- KPIs e graficos de maturidade/proprietarios;
- tabela E-BOM;
- arvore/relacionamentos;
- filtros;
- preview ao clicar em uma linha;
- fallback por clipboard quando API nao funciona.

Hoje o fluxo real ainda depende muito do paliativo:

1. Abrir estrutura no Product Structure Explorer.
2. Selecionar itens no Explorer.
3. Usar `Ctrl+A`.
4. Usar `Ctrl+C`.
5. Clicar em `Atualizar estrutura` no app.

Esse fluxo funciona parcialmente para estruturas pequenas/medias, mas nao deve ser tratado como solucao final.

## Arquitetura Atual

### Entrada e bootstrap

Arquivos principais:

- `index.html`
- `assets/js/app.js`
- `assets/js/boot.js`
- `assets/js/config.js`

O projeto e uma aplicacao estatica, sem framework moderno e sem build obrigatorio para runtime. O bundle historico existe em varios arquivos `bom-bundle-*`, mas a base modular em `assets/js` contem a logica relevante.

### Camada de plataforma

Arquivos:

- `assets/js/platform/context.js`
- `assets/js/platform/compass.js`
- `assets/js/platform/waf-client.js`
- `assets/js/platform/waf-bootstrap.js`
- `assets/js/platform/platform-bridge.js`
- `assets/js/platform/widget-runtime.js`

Responsabilidades:

- detectar runtime dentro da 3DEXPERIENCE;
- obter contexto de seguranca;
- montar headers (`SecurityContext`, CSRF, `Accept`, `Content-Type`);
- resolver URL de servicos;
- fazer chamadas autenticadas via `WAFData.authenticatedRequest`.

### Camada de integracao ENOVIA / 3DSpace

Arquivos:

- `assets/js/integration/enovia-api.js`
- `assets/js/integration/search-api.js`
- `assets/js/integration/product-explorer-bridge.js`
- `assets/js/integration/explorer-context.js`
- `assets/js/integration/3dx-content-parser.js`

Responsabilidades:

- chamadas `dseng`, `dspfl`, `dsxcad`;
- busca por produto;
- tentativa de capturar contexto/selecao do Product Structure Explorer;
- leitura de mensagens `3DXContent`;
- montagem de catalogo nome -> `prd-R...`;
- scraping/fallback do Explorer.

### Camada de servicos

Arquivos:

- `assets/js/services/bom-orchestrator.js`
- `assets/js/services/api-bom-loader.js`
- `assets/js/services/bom-service.js`
- `assets/js/services/tsv-bom-loader.js`
- `assets/js/services/paste-bom-loader.js`
- `assets/js/services/file-import-service.js`
- `assets/js/services/explorer-scanner.js`
- `assets/js/services/bom-snapshot.js`
- `assets/js/services/attribute-service.js`
- `assets/js/services/physical-product-service.js`

Responsabilidades:

- escolher loader (`api`, `tsv`, `paste`, `dom-fallback`);
- carregar raiz e filhos da E-BOM;
- importar texto/TSV do Explorer;
- normalizar linhas;
- manter indice em memoria;
- snapshot/restore quando uma carga falha.

### Camada de UI

Arquivos:

- `assets/js/ui/data-table.js`
- `assets/js/ui/part-preview.js`
- `assets/js/ui/part-image.js`
- `assets/js/ui/3dplay-viewer.js`
- `assets/js/ui/bom-tree.js`
- `assets/js/ui/charts-manager.js`
- `assets/js/ui/kpi-cards.js`
- `assets/js/ui/filters.js`
- `assets/js/ui/sync-banner.js`

Responsabilidades:

- tabela E-BOM;
- graficos e KPIs;
- painel de preview;
- miniaturas;
- selecao de linha;
- banners de sincronizacao.

## Documentacao Oficial Consultada

Foram consultadas paginas oficiais Dassault Systemes FD02 / R2026x:

- `Web Services and Events`
  - `https://media.3ds.com/support/documentation/developer/Cloud/FD02/en/English/CAAiamREST/CAATciamRESTToc.htm`
- `About Widget and HTTP Request`
  - `https://media.3ds.com/support/documentation/developer/Cloud/FD02/en/English/CAAWebAppsJSWS/CAAWebAppsTaDataAccess.htm`
- `WAFData and onFailure Callback`
  - `https://media.3ds.com/support/documentation/developer/Cloud/FD02/en/English/CAAWebAppsJSWS/CAAWebAppsTaWAFDataOnFailure.htm`
- `About Service URL and Platform Instance`
  - `https://media.3ds.com/support/documentation/developer/Cloud/FD02/en/English/CAAWebAppsJSWS/CAAWebAppsTaServicePlatform.htm`
- `Engineering Web Services`
  - `https://media.3ds.com/support/documentation/developer/Cloud/FD02/en/English/CAAEngineeringWS/dseng_v1.htm`
- `CAD Collaboration Web Services`
  - `https://media.3ds.com/support/documentation/developer/Cloud/FD02/en/English/CAAXCADWS/dsxcad_v1.htm`
- `3D Shape Web Services`
  - `https://media.3ds.com/support/documentation/developer/Cloud/FD02/en/English/CAA3DShapeWSDoc/ds3sh_v1.htm`
- `Derived Outputs Web Services`
  - `https://media.3ds.com/support/documentation/developer/Cloud/FD02/en/English/CAADerivedOutputsWS/dsdo_v1.htm`
- `Document Web Services`
  - `https://media.3ds.com/support/documentation/developer/Cloud/FD02/en/English/CAADocumentWS/dsdoc_v1.htm`
- `Distributed File Store`
  - `https://media.3ds.com/support/documentation/developer/Cloud/FD02/en/English/CAADFSWS/dfs_v1.htm`

## Pontos Oficiais Relevantes

### WAFData

A documentacao confirma que widgets devem usar `DS/WAFData/WAFData` para requisicoes HTTP autenticadas a servicos da plataforma.

Para servicos 3DEXPERIENCE:

- `authenticatedRequest` faz chamada direta autenticada.
- CORS e autenticacao 3DPassport sao tratados pela plataforma.
- Em falha, o codigo HTTP retornado e o codigo real do backend.
- `responseType` / `type` impacta diretamente o formato de resposta em `onFailure`.

Implicacao para o projeto:

- 404 e 406 vistos no console sao sinais reais de endpoint/base/parametro incorreto.
- Usar `type: 'json'` para imagem, arquivo ou resposta nao JSON pode ocultar diagnostico util.

### Service URL / Platform Instance

A documentacao confirma que cada servico possui sua propria URL:

- `3DDashboard`
- `3DSpace`
- `3DCompass`
- `3DPlay`
- `3DSearch`
- outros

Para servicos dependentes de tenant, a URL deve ser resolvida pelo platform instance correto.

Implicacao para o projeto:

- A URL do 3DSpace deve ser obtida via `DS/i3DXCompassServices/i3DXCompassServices`, usando `getServiceUrl` ou equivalente.
- O host IFWE / 3DDashboard nao deve ser tratado automaticamente como host do 3DSpace.
- O codigo atual forca IFWE como base de 3DSpace em varios cenarios, o que e uma fonte provavel de 404/406.

### Engineering Web Services (`dseng`)

Servidor oficial:

```text
{3DSpace}/resources/v1/modeler/dseng
{APIGateway}/api/dseng/v1
```

Endpoints relevantes identificados:

- `GET /dseng:EngItem/{ID}`
- `GET /dseng:EngItem/{ID}/dseng:EngInstance`
- `POST /dseng:EngItem/{ID}/expand`
- `GET /dseng:EngItem/{ID}/dseng:EngRepInstance`
- `GET /dseng:EngItem/{PID}/dseng:EngRepInstance/{ID}`

Implicacao para o projeto:

- E-BOM deve ser carregada principalmente por `dseng:EngItem` e `dseng:EngInstance`.
- Representacoes ligadas ao item podem passar por `dseng:EngRepInstance`.
- Isso e mais aderente ao Product Structure Explorer do que tentar multiplos endpoints `dspfl` e `boM` em cascata.

### CAD Collaboration (`dsxcad`)

Servidor oficial:

```text
{3DSpace}/resources/v1/modeler/dsxcad
{APIGateway}/api/dsxcad/v1
```

Endpoints relevantes identificados:

- `GET /dsxcad:Representation/{ID}`
- `POST /dsxcad:Representation/locate`
- `POST /dsxcad:Representation/{ID}/modify`
- `GET /dsxcad:Part/{ID}`
- `POST /dsxcad:Part/{ID}/dsxcad:AuthoringFile/downloadticket`
- endpoints de attach/detach/bulkfetch/search

Implicacao para o projeto:

- Para visualizador 3D proprio, pode ser necessario resolver representacao CAD e/ou authoring file.
- O fluxo de visualizacao nao e simplesmente abrir `3DPlay`.

### 3D Shape (`ds3sh`)

Servidor oficial:

```text
{3DSpace}/resources/v1/modeler/ds3sh
{APIGateway}/api/ds3sh/v1
```

Endpoints relevantes:

- `GET /ds3sh:3DShape/search`
- `GET /ds3sh:3DShape/{ID}`
- `POST /ds3sh:3DShape/bulkfetch`

Implicacao para o projeto:

- Quando o Explorer mostra linha `3D Shape`, o app precisa preservar ou resolver esse tipo real.
- A tabela atual frequentemente transforma/assume `Physical Product`, o que atrapalha o caminho 3D.

### Derived Outputs (`dsdo`)

Servidor oficial:

```text
{3DSpace}/resources/v1/modeler/dsdo
{APIGateway}/api/dsdo/v1
```

Endpoints relevantes:

- `POST /dsdo:DerivedOutputs/Locate`
- `GET /dsdo:DerivedOutputs/{ID}`
- `POST /dsdo:DerivedOutputs/{PID}/dsdo:DerivedOutputFiles/{ID}/DownloadTicket`
- `POST /dsdo:DerivedOutputJobs`

Implicacao para o projeto:

- Se houver derived output em formato renderizavel, o visualizador proprio pode depender de localizar e baixar esse arquivo.

### Document / DFS

Documentos:

- `documents/{docId}/files`
- `DownloadTicket`
- `CheckoutTicket`

DFS:

- checkin/checkout via URLs retornadas por outros servicos.

Implicacao para o projeto:

- Download real de arquivo exige ticket e possivelmente chamada posterior ao DFS/FCS.
- WAF precisa suportar resposta binaria (`arraybuffer`/`blob`) quando o objetivo for arquivo ou geometria.

## Gaps Observados pelo Usuario

### Exemplos reais enviados

1. Estrutura com 79 itens:
   - status parcial `0/79`;
   - muitos erros 404/406 no console;
   - fallback atual nao cobre adequadamente.

2. Estrutura com 20 itens:
   - funciona por cola/TSV (`Cola 20/20`);
   - ainda gera muitos 404/406 no console.

3. Estrutura com 3 itens:
   - funciona por cola/TSV (`Cola 3/3`);
   - ainda gera muitos 404/406 no console.

4. Estrutura com 1 item e 2 corpos:
   - aparece como 2 objetos;
   - `getpicture` gera muitos 404;
   - preview mostra placeholder, nao 3D real.

### Problemas de experiencia

- Dependencia de `Ctrl+A` / `Ctrl+C`.
- Mensagens ainda orientam o usuario a paliativos.
- Erros do console geram inseguranca e dificultam diagnostico.
- Para projetos maiores, app entra em caminhos inconsistentes.
- O preview 3D nao entrega a expectativa do usuario.

## Diagnostico Tecnico

### 1. Base URL provavelmente incorreta em parte das chamadas

Arquivo principal:

- `assets/js/platform/compass.js`
- `assets/js/integration/enovia-api.js`
- `assets/js/platform/waf-client.js`

Problema:

- `CompassServices.fastConnectIfwe()` marca IFWE como URL verificada.
- `CompassServices.get3DSpaceUrl()` retorna IFWE quando dashboard esta em IFWE.
- `EnoviaApi.defaultSpaceUrl()` prefere IFWE.
- `WafClient.normalizeRequestUrl()` troca host `space` por `ifwe` em alguns cenarios.

Sintoma:

```text
https://...-ifwe.3dexperience.3ds.com/enovia/resources/...
```

Risco:

- APIs `modeler/dseng`, `modeler/dsxcad`, `modeler/ds3sh`, `modeler/dsdo` devem usar URL correta do servico 3DSpace.
- IFWE e dashboard shell nao devem ser usados como substituto automatico de 3DSpace.

### 2. Cascata de endpoints incompativeis gera 404/406

Arquivo principal:

- `assets/js/integration/enovia-api.js`

Problema:

Para filhos de `prd-R...`, o codigo tende a usar `getPhysicalProductChildren()` e tenta varias URLs:

- `/dspfl:Part`
- `/dspfl:Instance`
- `/boM`
- `$expand=dspfl:Part`
- `$expand=dspfl:Instance`
- `$expand=boM`
- `$expand=boM,dspfl:Part`

Isso gera varias chamadas falhando antes de qualquer fallback.

Direcao correta:

- Priorizar `dseng:EngItem/{ID}/dseng:EngInstance` para E-BOM.
- Usar `dseng:EngItem/{ID}/expand` quando adequado e validado.
- Remover tentativa cega de endpoints.

### 3. Comentario do codigo contradiz comportamento real

Arquivo:

- `assets/js/integration/enovia-api.js`

Comentario:

```text
Cloud FD02 - dseng EngItem primeiro; Physical Product so para resolver bomRootId.
```

Comportamento real:

- Se ID e `prd-R...`, o codigo tenta `dspfl:PhysicalProduct` antes de `dseng:EngItem`.
- Para filhos, `preferEngChildrenForParent(parentId)` retorna falso quando o parent e `prd-R...`.

Risco:

- O app nao segue a propria intencao documentada.

### 4. Falhas de API podem ser mascaradas

Arquivo:

- `assets/js/services/bom-service.js`

Problema:

`loadChildren()` tenta um endpoint, tenta outro, e se ambos falham marca o parent como `loaded` e retorna `[]`.

Risco:

- Estrutura fica parcial ou vazia.
- Usuario ve `0/79`, mas o sistema pode considerar o no carregado.
- Diagnostico fica escondido.

### 5. Limites existem e afetam comportamento

Arquivos:

- `assets/js/config.js`
- `assets/js/services/tsv-bom-loader.js`
- `assets/js/services/explorer-scanner.js`
- `assets/js/ui/data-table.js`
- `assets/js/services/bom-service.js`

Valores relevantes:

- `FAST_TSV_MAX: 500`
- `SCROLL_HARVEST_MAX_STEPS: 36`
- `DOM_MIRROR_MANUAL_MAX_EXPECTED: 25`
- scroll harvest ignora estruturas acima de 40 itens em alguns fluxos;
- `BOM_MAX_NODES: 50000`
- `DataTable.MAX_ROWS: 8000`

Nota:

Protecoes tecnicas sao aceitaveis, mas nao podem virar limite funcional do produto. A solucao final precisa suportar qualquer projeto por paginacao, lazy loading e virtualizacao.

### 6. Fallback por clipboard e bom para contingencia, mas nao para produto

Arquivos:

- `assets/js/services/tsv-bom-loader.js`
- `assets/js/services/file-import-service.js`
- `assets/js/integration/product-explorer-bridge.js`

Pontos fortes:

- O parser e relativamente robusto.
- Reconhece cabecalho, colunas, maturidade, proprietario, `prd-R`.
- Tenta reparar dados comuns do Explorer.

Riscos:

- Depende da selecao visual.
- Depende de clipboard.
- Depende de grade expandida.
- Pode perder tipo real.
- Pode inferir errado pai/filho.
- Pode inserir IDs sinteticos (`IMP_`, `grid_`).

### 7. `getpicture` gera ruido e nao deve bloquear

Arquivo:

- `assets/js/ui/part-image.js`

Problemas:

- Monta URL em IFWE primeiro.
- Usa `/enovia/resources/getpicture`.
- Faz muitas requisicoes de miniatura.
- Em fallback WAF usa `type: 'json'` para imagem.

Sintoma:

- Muitos 404 em `getpicture`.

Direcao:

- Miniatura deve ser opcional.
- Falha de miniatura nao deve poluir console nem afetar carga E-BOM.
- Para imagem/binario, usar `responseType` adequado.

### 8. Preview 3D atual nao e visualizador proprio

Arquivos:

- `assets/js/ui/part-preview.js`
- `assets/js/ui/3dplay-viewer.js`
- `assets/js/integration/3dplay-bridge.js`

Problema:

- O preview atual e baseado em 3DPlay/2D.
- O codigo tenta publicar selecao para 3DPlay ou carregar modulos 3DPlay.
- Quando embed nao funciona, mostra miniatura/placeholder.
- Nao existe pipeline de geometria proprio.
- Nao ha Three.js, glTF, tessellation ou download/render real de modelo.

Direcao:

- Remover dependencia de 3DPlay como caminho de produto.
- Criar modulo de visualizador proprio.
- Resolver geometria por APIs oficiais.

### 9. Tipo real do objeto pode se perder

Arquivos:

- `assets/js/services/file-import-service.js`
- `assets/js/integration/product-explorer-bridge.js`
- `assets/js/services/bom-service.js`

Observacao do usuario:

- Explorer mostra raiz `Physical Product` e filho `3D Shape`.
- Tabela do app mostra ambos como `Physical Product`.

Diagnostico:

- O importador reconhece `3D Shape`, mas fluxos de DOM mirror/scraping e defaults usam `Physical Product`.
- O preview 3D nao pode confiar apenas na linha importada.

Direcao:

- Preservar tipo quando o Explorer fornece.
- Resolver tipo real via API antes de carregar 3D.

## Pontos Fortes

- Projeto ja possui separacao em camadas.
- Existe orquestrador unico para refresh.
- Existe snapshot/restore para evitar perder estado em falhas.
- Parser de TSV tem varias heuristicas uteis.
- UI ja possui KPIs, filtros, tabela, preview e mensagens.
- O app ja entende o contexto de Additional App em varios pontos.
- Ha preocupacao com lazy loading e protecao de memoria.

## Riscos e Dividas Tecnicas

### Alto risco

- Base URL 3DSpace incorreta por preferencia IFWE.
- Cascata de endpoints nao suportados gerando 404/406.
- API falha e o app marca nos como carregados.
- Visualizador 3D atual nao atende requisito.

### Medio risco

- Muitos bundles historicos dificultam saber o que esta em producao.
- Muitos flags em `APP_CONFIG` criam comportamento dificil de prever.
- Hardcoded tenant/security context em configuracao.
- Fallbacks competem entre si.
- Mensagens ainda instruem paliativo como fluxo normal.

### Baixo risco

- Miniaturas `getpicture` geram ruido, mas podem ser isoladas.
- Docs antigas no repositorio mencionam caminhos que agora foram descartados.

## Hipoteses Sobre 404/406

1. Chamadas estao indo para host IFWE em vez de 3DSpace.
2. Endpoint `dspfl`/`boM` nao e suportado para os objetos/tenant usados.
3. `$expand=boM,dseng:EngInstance` pode nao ser suportado como o codigo espera.
4. `Content-Type`/`Accept`/`responseType` podem estar inadequados em chamadas nao JSON.
5. CSRF esta sendo buscado em base errada.
6. Falha de miniatura `getpicture` se mistura com falha real de E-BOM.

## Direcao de Solucao

### Etapa 1 - Fundacao correta de plataforma

Objetivo:

- Resolver `3DSpace` via Compass/i3DXCompassServices.
- Parar de usar IFWE como fallback automatico de 3DSpace.
- Registrar diagnostico claro de service URL, platformId e security context.

Entregaveis:

- `PlatformServiceResolver`.
- Log tecnico limpo.
- Tratamento separado para 3DDashboard, 3DSpace e API Gateway.

### Etapa 2 - E-BOM API-first por `dseng`

Objetivo:

- Carregar estrutura via `dseng`.
- Usar endpoints oficiais:
  - `EngItem`
  - `EngInstance`
  - `expand` quando validado.
- Remover cascata cega `dspfl/boM`.

Entregaveis:

- `EngineeringBomClient`.
- Paginacao real.
- Erro explicito quando API nao retorna filhos.
- Sem marcar no como carregado em falha silenciosa.

### Etapa 3 - Fallback Ctrl+C como contingencia

Objetivo:

- Manter fallback manual, mas nao como fluxo principal.
- Melhorar importacao preservando tipo real e IDs.
- Evitar limites funcionais.

Entregaveis:

- Parser preservando `3D Shape`.
- Mensagens de fallback mais honestas.
- Validacao por quantidade esperada.

### Etapa 4 - Limpeza de erros 404/406 no console

Objetivo:

- Reduzir chamadas especulativas.
- Separar erros de API E-BOM de erros de miniatura.
- Ajustar `responseType` por tipo de conteudo.

Entregaveis:

- Cliente WAF com `json`, `text`, `blob`, `arraybuffer`.
- Miniatura opcional e silenciosa.
- Diagnostico centralizado.

### Etapa 5 - Visualizador 3D proprio

Objetivo:

- Clicar linha E-BOM e renderizar 3D real dentro do app.
- Nao depender de widget 3DPlay.

Pipeline provavel:

1. Linha selecionada.
2. Resolver ID real e tipo real.
3. Se for EngItem, localizar representacoes:
   - `dseng:EngRepInstance`
   - `dsxcad:Representation/locate`
   - `ds3sh:3DShape`
4. Localizar arquivo ou derived output:
   - `dsdo:DerivedOutputs/Locate`
   - `dsdoc` se houver documento/arquivo associado
   - `dsxcad` authoring file quando aplicavel
5. Obter download ticket.
6. Baixar binario via DFS/FCS.
7. Renderizar com viewer proprio.

Observacao:

- Ainda precisa validar qual formato real esta disponivel no tenant: glTF, 3DXML, CGR, STEP, outro derived output.
- Se nao houver formato web-renderizavel, pode ser necessario criar job de derived output ou definir regra/formato na plataforma.

### Etapa 6 - Testes com casos reais

Casos obrigatorios:

- 79 itens.
- 20 itens.
- 3 itens.
- 1 item com 2 corpos.

Criterios de aceite:

- Sem limite funcional por quantidade de itens.
- Sem console com cascata de 404/406.
- Quantidade carregada bate com Explorer.
- Tipo real preservado.
- Clique em item tenta resolver 3D real.
- Falha 3D mostra motivo tecnico claro.

## Recomendacao de Prioridade

Alta prioridade e baixo risco relativo:

1. Corrigir resolucao de URL 3DSpace.
2. Parar cascata de endpoints `dspfl/boM`.
3. Isolar `getpicture`.
4. Remover Web Page Reader/3DPlay como caminhos ativos.
5. Melhorar diagnostico de API.

Alta prioridade e maior complexidade:

1. E-BOM API-first por `dseng` com paginacao.
2. Pipeline de visualizador 3D proprio.

## Decisoes Ja Alinhadas

- Nao usar Web Page Reader.
- Nao depender de deploy/admin em 3DX.
- Nao usar widget 3DPlay separado.
- Usar GitHub repo/GitHub Pages.
- Rodar como Additional App.
- Fallback Ctrl+C existe, mas nao e solucao final.
- Nao deve existir limite funcional de itens/projeto.

## Proxima Acao Recomendada

Antes de implementar, validar uma pequena matriz de endpoints diretamente no tenant, com WAF autenticado e base 3DSpace correta:

1. `GET {3DSpace}/resources/v1/application/CSRF`
2. `GET {3DSpace}/resources/v1/modeler/dseng/dseng:EngItem/{ID}`
3. `GET {3DSpace}/resources/v1/modeler/dseng/dseng:EngItem/{ID}/dseng:EngInstance`
4. `GET {3DSpace}/resources/v1/modeler/dseng/dseng:EngItem/{ID}/dseng:EngRepInstance`
5. `GET {3DSpace}/resources/v1/modeler/ds3sh/ds3sh:3DShape/{ID}` quando houver ID de 3D Shape
6. `POST {3DSpace}/resources/v1/modeler/dsxcad/dsxcad:Representation/locate`
7. `POST {3DSpace}/resources/v1/modeler/dsdo/dsdo:DerivedOutputs/Locate`

Essa validacao deve ser feita com poucos IDs reais dos quatro exemplos enviados pelo usuario, sem alterar dados da plataforma.
