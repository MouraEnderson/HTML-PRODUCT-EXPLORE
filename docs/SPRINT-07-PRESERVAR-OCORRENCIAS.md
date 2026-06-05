# Sprint 07 - preservar ocorrencias da E-BOM

Build: `bom20260606zb`

## Problema tratado

No caso `CJ MESA 4BCS VP TOP 3DX`, o build `bom20260606za` estabilizou a leitura em `API 37/50` e removeu a contaminacao por DOM fallback incompleto.

A diferenca restante pode vir de consolidacao de IDs repetidos: o Product Structure Explorer conta ocorrencias/linhas, enquanto o codigo podia somar quantidade e manter apenas uma linha quando o mesmo ID ja existia no indice.

## Ajuste feito

- Adicionado `PRESERVE_OCCURRENCE_ROWS: true`.
- Quando uma linha recebida pela API tem ID ja existente e possui pai, o app cria uma nova ocorrencia interna em vez de consolidar silenciosamente.
- O ID original fica registrado em `duplicateOf` e `referencePhysicalId`.
- `bomChildrenId` continua apontando para a referencia real, para manter lazy loading dos filhos.
- O banner de diagnostico passa a exibir `ocorrencias preservadas`.

## Criterio de aceite

- Caso 50 itens deve aumentar se a diferenca era causada por IDs repetidos consolidados.
- Se continuar `37/50` e `ocorrencias preservadas: 0`, entao os 13 faltantes nao sao duplicatas consolidadas; a investigacao deve ir para representacoes/instancias que `dseng:EngInstance` nao esta retornando como filho navegavel.

## Observacao

Essa mudanca favorece a leitura como o usuario ve no Product Structure Explorer: linhas e ocorrencias importam mais que consolidacao de referencias.
