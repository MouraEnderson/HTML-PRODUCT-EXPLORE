# Sprint 05 - resolucao dseng por contexto

Build: `bom20260606z`

## Problema tratado

No caso `CJ MESA 4BCS VP TOP 3DX`, a coleta mostrou que o `physicalId` visivel `prd-R1132100929518-01103695` retorna `404` quando usado direto em:

`/resources/v1/modeler/dseng/dseng:EngItem/{prd-id}`

Mas o mesmo objeto e encontrado por busca `dseng`:

`/resources/v1/modeler/dseng/dseng:EngItem/search?$searchStr=name:<prd-id>`

O resultado correto traz um ID interno `VPMReference` (`63FC...`), e esse ID carrega `dseng:EngInstance` com sucesso.

## Ajuste feito

- Mantido o fluxo manual: somente `Atualizar estrutura` carrega E-BOM.
- Mantida a resolucao da raiz `prd-*` para ID interno `dseng`.
- Melhorada a escolha de candidatos quando uma `VPMInstance` nao traz referencia embutida.
- A resolucao por label agora pontua candidatos usando:
  - match exato de `id`, `physicalid`, `name` ou `title`;
  - `owner`;
  - `collabspace`;
  - `organization`;
  - `revision`;
  - proximidade de data de criacao/modificacao;
  - `cestamp` da instancia quando disponivel.

## Criterio de aceite

- Projeto 20 itens deve continuar carregando 20/20.
- Projeto 79 itens deve continuar carregando sem remover raiz.
- Projeto 50 itens deve reduzir o parcial `24/50` causado por candidatos ambiguos.
- O console ainda pode mostrar 404 de recursos nativos da plataforma, mas a E-BOM nao deve depender de endpoints `dspfl`/`dsxcad` que falham nesse tenant.

## Observacao

Se ainda houver parcial no caso 50, o proximo passo e coletar o payload real de `EngInstance` em modo Avancado e validar se existe um endpoint de navegacao da instancia para a referencia filha. A documentacao e exemplos indicam uso de caminhos de instancia como:

`/dseng:EngItem/{parentId}/dseng:EngInstance/{instanceId}`

mas a coleta atual com `$expand` ainda nao retornou a referencia filha embutida.
