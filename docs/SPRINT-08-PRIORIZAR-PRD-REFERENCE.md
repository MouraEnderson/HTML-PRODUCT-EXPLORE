# Sprint 08 - priorizar referencia prd-R na resolucao dseng

Build: `bom20260606zc`

## Problema tratado

O teste real do build `bom20260606zb` manteve o caso `CJ MESA 4BCS VP TOP 3DX` em `API 37/50`.

A coleta mostrou que a API retorna varios candidatos `VPMReference` para o mesmo label. Alguns candidatos usam `name` tecnico sequencial, como `0000001440`, enquanto outros usam o identificador cloud real do Product Structure Explorer, como `prd-R1132100929518-...`.

O ranking anterior dava peso alto demais ao `cestamp`. Isso podia selecionar uma variante/sellable item com label correto, mas nao a referencia cloud exibida no Explorer.

## Ajuste feito

- A resolucao de `VPMInstance` por label agora prioriza candidatos cujo `name` comeca com `prd-`.
- Candidatos com `name` numerico sequencial recebem uma pequena penalidade.
- `cestamp` foi mantido como sinal util, mas com peso menor para nao superar o identificador cloud real.
- Novo build publicado: `bom20260606zc`.

## Criterio de aceite

- Caso 50 itens deve sair de `37/50` se os faltantes vinham de escolha incorreta de candidato `VPMReference`.
- Caso 20 itens deve continuar carregando `20/20`.
- Caso 79 itens deve continuar carregando sem regressao.
- A tabela principal deve permanecer sem coluna `Tipo`.

## Observacao

Se o caso 50 continuar parcial, a proxima investigacao nao deve insistir em duplicatas ou DOM fallback. O proximo passo sera comparar a arvore completa de cada candidato raiz retornado pela API e escolher a raiz/caminho que reproduz a contagem do Product Structure Explorer.
