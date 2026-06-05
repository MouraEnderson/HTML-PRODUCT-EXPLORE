# Sprint 03 - estabilizacao E-BOM

Build: `bom20260606x`

## Problema tratado

Os testes no 3DDashboard mostraram tres falhas principais:

- Projeto 20 itens carregava por API, mas a tabela exibia colunas e atributos ruins.
- Projeto 79 itens carregava parcialmente, mas algumas linhas vinham como instancias tecnicas (`VPMInstance`/`cadmodel`) em vez de item de E-BOM.
- Projeto 50 itens podia ficar sem linhas uteis e sem diagnostico claro.

## Entrega

- Removida a coluna `Tipo` da tabela principal E-BOM.
- Removido `Tipo` do painel lateral de detalhe para evitar destacar `VPMReference`/`VPMInstance` como informacao de produto.
- Separados campos de ocorrencia e referencia no modelo:
  - `occurrenceId`
  - `occurrenceName`
  - `occurrenceType`
  - `referenceId`
  - `referencePhysicalId`
  - `sourcePhysicalId`
- Linhas de `VPMInstance` sem referencia resolvida passam a ser marcadas como `isUnresolvedInstance` e `apiResolutionStatus = unresolved-instance`.
- O banner agora mostra diagnostico de carga API parcial: raiz, quantidade esperada, pais consultados, referencias resolvidas, instancias sem referencia e ultimo erro.
- O fluxo mantem API como caminho principal e tenta fallback controlado quando a API volta parcial demais.
- O fallback DOM manual foi ampliado para ate 80 linhas como contingencia para projetos como o caso de 50 itens.
- Adicionado enriquecimento visual a partir do Explorer quando a API preserva IDs, mas traz texto tecnico. Isso corrige apresentacao sem substituir os IDs estruturais da API.

## Testes executados

- `node --check` nos arquivos alterados de servico/UI/integracao.
- `node scripts/build-bundle-node.js`
- `node scripts/test-ska-import.js`
- `node scripts/test-mont10-import.js`
- `node scripts/test-acceptance-sprint25.js`

Resultado antes do push:

- Testes locais passaram.
- O teste de GitHub Pages falhou antes do push porque a pagina publicada ainda servia o build anterior.

## Criterio de aceite no 3DDashboard

- Projeto 20 itens: deve carregar 20 linhas e nao exibir coluna `Tipo`.
- Projeto 79 itens: deve manter IDs da API e melhorar apresentacao de titulo/proprietario quando o Explorer estiver disponivel.
- Projeto 50 itens: se nao carregar completo, deve mostrar diagnostico objetivo no banner em vez de ficar silencioso.

## Pendencias assumidas

- Resolver instancia para referencia real ainda depende de endpoint/relacao 3DX mais preciso para casos em que o nome da instancia e `cadmodel`.
- Virtualizacao/paginacao real ainda sera necessaria para estruturas muito grandes, como 300 mil itens.
- Viewer 3D proprio ainda nao foi implementado nesta sprint.
