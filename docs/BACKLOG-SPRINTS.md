# Backlog Inicial por Sprints

Data: 2026-06-03

## Sprint 1 - Base URL e E-BOM API-first

Objetivo: eliminar a causa raiz dos 404/406 de estrutura.

- Usar `i3DXCompassServices.getServiceUrl('3DSpace', x3dPlatformId)`.
- Parar de tratar IFWE como 3DSpace.
- Definir raiz como EngItem quando aplicavel.
- Buscar filhos por EngInstance/expand dseng com paginacao real.
- Remover cascata de endpoints incompativeis.
- Nao marcar pai como carregado com `[]` quando houve falha real.

Aceite:

- Caso 3 itens carrega completo.
- Caso 20 itens carrega completo.
- Caso 79 itens nao vira parcial silencioso.
- Console reduzido, sem cascata repetitiva de 404/406.

Status parcial em 2026-06-03:

- Configuracao alterada para nao preferir IFWE como base REST.
- `CompassServices.ensureWorkingSpaceUrl` agora usa resolucao 3DSpace via Compass/spaceHost antes de qualquer fallback.
- `WafClient` nao troca mais automaticamente URL `space` por `ifwe`.
- `EnoviaApi`, `PlatformBridge`, `ExplorerScanner` e `App` foram ajustados para usar `spaceHost`/`tenantSpaceUrl`.
- Filhos E-BOM agora preferem `dseng:EngInstance` tambem para IDs cloud `prd-`.
- Fallback para `dspfl/PhysicalProduct` foi desabilitado por padrao para evitar cascata de endpoints 404/406.
- Falha ao carregar filhos nao e mais convertida em lista vazia com pai marcado como carregado.
- Bundle `bom20260606f` regenerado.
- Teste manual no tenant real confirmou fallback Ctrl+A/Ctrl+C carregando 3/3; os erros restantes ficaram associados a preview/midia, nao a contagem E-BOM.

Pendente nesta sprint:

- Validar no tenant real se `dseng:EngInstance` retorna filhos para os quatro casos.
- Ajustar parser de membros caso o payload real use outro campo para o filho referenciado.
- Validar no 3DDashboard com os quatro casos reais.

## Sprint 2 - Fallback, thumbnails e UX de erro

Objetivo: separar carga E-BOM de miniatura e fallback manual.

- Transformar Ctrl+A/Ctrl+C em contingencia.
- Manter botao de atualizar estrutura manual como resgate.
- Isolar `getpicture`.
- Adicionar cache/limite de tentativas para imagem.
- Mostrar estado discreto quando thumbnail nao existe.
- Nao deixar erro de imagem impactar KPIs/tabela/E-BOM.

Status parcial em 2026-06-03:

- Miniaturas automaticas desligadas por padrao via `APP_CONFIG.MEDIA` para impedir chamadas `getpicture`/preview durante carga e selecao de E-BOM.

Aceite:

- Caso 1 item com 2 corpos nao gera tempestade de thumbnails.
- Falha de miniatura nao muda contagem da estrutura.
- Status do app diferencia API, fallback e thumbnail.

## Sprint 3 - Pipeline 3D proprio

Objetivo: renderizar 3D dentro da aplicacao, sem widget 3DPlay.

- Clique na linha seleciona item da E-BOM.
- Resolver objeto real: Physical Product, EngItem, EngRepInstance, 3DShape ou CAD Representation.
- Localizar representation ou derived output.
- Obter ticket/download quando permitido.
- Renderizar com Three.js.
- Criar cache por ID.
- Criar estados: vazio, carregando, renderizado, indisponivel e erro.

Aceite:

- Clique em item com corpo mostra 3D real quando arquivo/derived output estiver disponivel.
- Clique em item sem geometry mostra estado claro, nao placeholder enganoso.
- Viewer nao depende do widget 3DPlay.

## Sprint 4 - Performance e escalabilidade

Objetivo: suportar qualquer tamanho de projeto dentro dos limites reais da API/plataforma.

- Paginacao real.
- Lazy loading por nivel.
- Virtualizacao de tabela/lista.
- Controle de concorrencia nas chamadas REST.
- Cache por objeto e por relacao.
- Cancelamento/ignorar resultado obsoleto quando usuario troca selecao.

Aceite:

- Sem limite funcional fixo de itens.
- Estruturas grandes continuam navegaveis.
- UI nao trava durante carregamento.

## Sprint 5 - Publicacao e manutencao

Objetivo: deixar o projeto facil de publicar, testar e manter.

- README atualizado.
- Scripts de build coerentes com GitHub Pages.
- Testes/regressoes baseados nos quatro casos reais.
- Documentacao de troubleshooting.
- Estrutura final do repositorio limpa.
