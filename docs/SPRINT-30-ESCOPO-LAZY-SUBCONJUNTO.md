# Sprint 30 - Escopo de analise por subconjunto

Data: 2026-06-06
Build observado: `bom20260606zk`

## Teste realizado

Foram validadas estruturas reais no 3DDashboard com o fluxo:

1. abrir estrutura no Product Structure Explorer;
2. clicar em `Atualizar estrutura` no BOM Analytics;
3. comparar a contagem exibida no Explorer com a E-BOM carregada no dashboard;
4. observar comportamento quando a estrutura tem subconjuntos.

## Resultado dos testes

### Estrutura 20 itens

Resultado: contagem OK.

O contrato `dseng:EngInstance` com `dsmveng:EngInstanceMask.Details` conseguiu resolver a estrutura e carregar os itens esperados.

### Estrutura 50 itens - CJ MESA 4BCS VP TOP 3DX

Resultado: contagem OK para E-BOM completa.

Observacao importante: quando o Explorer mostra apenas a raiz e alguns subconjuntos visiveis, por exemplo `5 objetos`, o dashboard ainda pode carregar `50` itens porque a API percorre os filhos internos dos subconjuntos.

Isso nao e necessariamente erro de contagem. E uma diferenca de escopo:

- Explorer visivel: somente nos abertos/visiveis naquele momento.
- Dashboard atual: E-BOM completa abaixo da raiz selecionada.

### Estrutura 79 itens - SKA_ENDERSW-BES-00009887

Resultado: o teste revelou risco de interpretacao e arquitetura.

A estrutura possui subconjuntos. O app tende a ler a estrutura completa pela API, mesmo quando o Explorer nao esta planificado visualmente. Isso pode ser correto para uma visao de E-BOM completa, mas nao atende bem quando o usuario quer analisar apenas um subconjunto.

## Problema encontrado

O app ainda esta orientado a carregar a estrutura completa ao clicar em `Atualizar estrutura`.

Esse comportamento e aceitavel para estruturas pequenas e para uma visao geral, mas nao escala bem para o uso real:

- em uma estrutura de 10 mil itens, o gestor pode querer analisar apenas `CJ MESA > Queimador`;
- carregar tudo antes de permitir foco no subconjunto desperdica tempo de API, memoria e renderizacao;
- graficos e tabela ficam poluidos com dados fora do contexto que o usuario quer avaliar;
- a diferenca entre "Explorer visivel" e "E-BOM completa" fica confusa na interface.

## Conclusao de produto

O Product Structure Explorer deve servir para identificar a estrutura raiz e o contexto aberto, mas o BOM Analytics precisa oferecer navegacao por escopo.

O objetivo correto nao e sempre "carregar tudo". O objetivo correto e:

- carregar raiz e filhos diretos rapidamente;
- permitir selecionar um subconjunto;
- carregar filhos do subconjunto sob demanda;
- atualizar tabela, KPIs, graficos e preview para o escopo selecionado;
- oferecer uma acao explicita para carregar/varrer a E-BOM completa quando o usuario realmente quiser.

## Solucao a seguir

Criar uma arquitetura de E-BOM lazy/on-demand:

1. `Atualizar estrutura` carrega somente raiz + primeiro nivel.
2. Cada linha de subconjunto vira expansivel.
3. Ao expandir ou selecionar um subconjunto, o app chama `dseng:EngInstance` apenas para aquele item.
4. A tabela e os graficos passam a ter modo de escopo:
   - `Subconjunto selecionado`;
   - `Filhos diretos`;
   - `E-BOM completa` sob comando explicito.
5. O painel deve comunicar claramente:
   - `Explorer visivel`;
   - `Itens carregados no dashboard`;
   - `Escopo analisado`.
6. A futura 3DView deve usar o item selecionado na E-BOM, nao a estrutura inteira.

## Criterios de aceite da proxima implementacao

- Em `CJ MESA`, clicar em `Atualizar estrutura` nao deve obrigar carregamento completo dos 50 itens.
- O usuario deve conseguir selecionar `Queimador` e carregar somente o subconjunto dele.
- A tela deve deixar claro se os graficos representam a raiz completa ou o subconjunto selecionado.
- A solucao deve continuar suportando 1, 20, 50, 79 e estruturas muito grandes sem limite artificial.
