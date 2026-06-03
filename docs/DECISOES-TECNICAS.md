# Decisoes Tecnicas

Data: 2026-06-03

## DEC-001 - Runtime do produto

Decisao: o produto roda como Additional App no 3DDashboard, publicado via GitHub Pages.

Motivo: evita dependencia de deploy admin na plataforma 3DX e preserva o caminho que ja esta sendo usado pelo usuario.

Consequencia: qualquer integracao com ENOVIA deve funcionar dentro das restricoes de iframe/dashboard, WAFData e contexto autenticado.

## DEC-002 - Acesso a dados ENOVIA

Decisao: usar WAFData para chamadas autenticadas e resolver 3DSpace via i3DXCompassServices.

Motivo: a documentacao oficial indica que a URL de servico deve vir da plataforma. O host IFWE nao deve ser tratado como 3DSpace.

Consequencia: a Sprint 1 deve corrigir a resolucao de base URL antes de reescrever ou ampliar carga E-BOM.

Atualizacao em 2026-06-03: IFWE deixou de ser tratado como base REST 3DSpace. A aplicacao deve resolver 3DSpace via Compass Services ou `spaceHost` configurado.

## DEC-003 - Carga E-BOM

Decisao: a carga principal deve ser API-first por 3DSpace REST/dseng.

Motivo: Ctrl+A/Ctrl+C funciona como contingencia, mas nao e fluxo confiavel nem escalavel para qualquer projeto.

Consequencia: fallback manual permanece como resgate, mas nao deve determinar arquitetura do produto.

## DEC-004 - Web Page Reader

Decisao: Web Page Reader esta fora do produto.

Motivo: o usuario confirmou que essa opcao nao sera usada.

Consequencia: documentacao e codigo ligados a esse caminho devem ser marcados como legado e removidos do fluxo principal.

## DEC-005 - Deploy admin/webapps

Decisao: deploy admin em `webapps/BomAnalytics` esta fora do produto.

Motivo: o usuario confirmou que nao sera usado nada que dependa de deploy na plataforma ou admin 3DX.

Consequencia: `webapps/BomAnalytics` e scripts/docs associados viram candidatos a legado.

## DEC-006 - Visualizacao 3D

Decisao: nao usar widget 3DPlay como solucao final. O produto precisa de viewer 3D proprio dentro da aplicacao.

Motivo: o requisito e clicar em um item da E-BOM e visualizar o 3D dentro do app.

Consequencia: sera criado pipeline proprio para resolver objeto real, localizar representation/derived output, baixar conteudo permitido e renderizar com Three.js.

## DEC-007 - Miniaturas

Decisao: miniatura e carga de estrutura sao pipelines separados.

Motivo: `getpicture` atualmente gera muitos 404 e nao pode derrubar nem poluir a carga E-BOM.

Consequencia: erros de imagem devem ser tratados como estado visual secundario.

## DEC-008 - Escalabilidade

Decisao: nao deve existir limite funcional de itens como criterio de produto.

Motivo: o usuario precisa que qualquer projeto funcione, inclusive estruturas maiores que os exemplos atuais.

Consequencia: a implementacao deve usar paginacao, lazy loading, virtualizacao e controle de concorrencia.
