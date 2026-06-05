# Sprint 06 - fallback DOM controlado

Build: `bom20260606za`

## Problema tratado

No teste do projeto `CJ MESA 4BCS VP TOP 3DX`, o build `bom20260606z` melhorou a carga API de `24/50` para `37/50`, mas o painel tambem exibia:

`Importacao: DOM espelho incompleto 1/50`

Isso misturava dois assuntos diferentes:

- API `dseng` conseguiu montar parte relevante da E-BOM.
- Fallback DOM leu apenas uma linha visivel/espelhada do Explorer.

Para estrutura de 50 itens, o DOM mirror nao e confiavel como fallback corretivo.

## Ajuste feito

- Reduzido `DOM_MIRROR_MANUAL_MAX_EXPECTED` de `80` para `12`.
- Estruturas medias/grandes deixam de tentar fallback DOM apos uma API parcial.
- O fluxo continua manual: somente o botao `Atualizar estrutura` dispara carga.

## Criterio de aceite

- Caso 50 itens nao deve mais mostrar `DOM espelho incompleto 1/50` como diagnostico principal.
- Se a API continuar em `37/50`, o app deve mostrar esse parcial real de API.
- O proximo diagnostico deve focar na diferenca entre os 37 itens retornados por `dseng` e os 50 objetos exibidos pelo Product Structure Explorer.

## Proximo ponto tecnico

Investigar se os 13 itens faltantes sao:

- ocorrencias sem referencia filha exposta por `dseng:EngInstance`;
- itens filtrados por configuracao/effectivity;
- repeticoes/instancias contadas pelo Explorer mas consolidadas pela API;
- filhos que exigem outro endpoint de navegacao da instancia.
