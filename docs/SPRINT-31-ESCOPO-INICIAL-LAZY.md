# Sprint 31 - Escopo inicial e lazy loading de subconjunto

Data: 2026-06-06
Build: `bom20260606zl`

## Problema resolvido

O botao `Atualizar estrutura` estava tentando montar a E-BOM completa via API. Isso fazia estruturas com subconjuntos carregarem todos os descendentes, mesmo quando o Product Structure Explorer estava mostrando apenas raiz + primeiro nivel.

Exemplo observado:

- CJ MESA mostrava `5 objetos` no Explorer: raiz, Tampo, Manipulo, Tempre, Queimador.
- O dashboard carregava `50` itens.
- Para um gestor que quer analisar apenas o subconjunto Queimador, carregar tudo piora performance e usabilidade.

## Decisao tecnica

O fluxo principal passa a ser:

1. Abrir a estrutura no Product Structure Explorer.
2. Clicar `Atualizar estrutura`.
3. O dashboard carrega a raiz e os filhos diretos via API.
4. Cada subconjunto pode ser expandido sob demanda pela tabela.
5. KPIs, graficos e preview trabalham com o escopo atualmente carregado.

O fluxo Ctrl+A/Ctrl+C/Ctrl+V nao e caminho de produto.

## O que foi alterado

- `ApiBomLoader` deixou de chamar `BomService.loadLazyFull` no refresh manual.
- `BomService.loadInitialScope` foi criado para carregar somente raiz + filhos diretos.
- `BomService.loadLazyFull` foi mantido para diagnostico/futuro modo explicito, mas nao e mais o caminho padrao do botao.
- A tabela ganhou um botao `+` em linhas de subconjunto ainda nao expandidas.
- Ao clicar `+`, o app chama `BomService.expandNode(id)` e carrega somente os filhos daquele subconjunto.
- O botao `Atualizar estrutura` agora prefere API e nao ativa autocopia/TSV como fallback escondido.

## Como testar

1. Abrir CJ MESA no Product Structure Explorer.
2. Deixar a estrutura no nivel inicial, mostrando raiz + subconjuntos.
3. Clicar `Atualizar estrutura`.
4. Esperado: dashboard nao deve carregar 50/79 itens completos automaticamente.
5. Clicar `+` no subconjunto Queimador.
6. Esperado: carregar somente os filhos do Queimador e recalcular tabela/KPIs para o escopo carregado.

## Riscos conhecidos

- Se a API `dseng:EngInstance` retornar filhos diretos incompletos para algum tipo de objeto, o erro deve aparecer no status, sem cair silenciosamente para Ctrl+C.
- A experiencia ainda precisa evoluir para um modo visual claro de "escopo atual" e, futuramente, para 3DView proprio por item selecionado.

## Proxima etapa

Sprint 32 deve conectar a selecao da E-BOM ao pipeline 3D proprio:

- resolver objeto real selecionado;
- localizar representacao/derived output;
- obter arquivo/ticket quando permitido;
- renderizar em viewer proprio, sem 3DPlay.
