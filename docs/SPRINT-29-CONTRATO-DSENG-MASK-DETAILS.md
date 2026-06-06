# Sprint 29 - Contrato dseng com EngInstanceMask.Details

Data: 2026-06-06
Build: `bom20260606zk`

## Problema atacado

O app estava tentando montar a E-BOM a partir de `dseng:EngInstance` sem receber o objeto filho real. Isso gerava:

- listas parciais em estruturas maiores;
- colunas inconsistentes contra o Product Structure Explorer;
- heuristica por label/nome para descobrir filho;
- erro conceitual ao misturar varredura DOM, TSV e API como caminhos concorrentes.

## Evidencia usada

O SDK `ws3dx-dotnet` da 3DS CPE EMED define a leitura de instancias com:

- endpoint: `GET /resources/v1/modeler/dseng/dseng:EngItem/{ID}/dseng:EngInstance`
- parametros: `$mva=true`, `$skip`, `$top`
- mascara: `$mask=dsmveng:EngInstanceMask.Details`
- campo adicional: `$fields=dsmvcfg:attribute.hasConfiguredInstance`

A interface `IEngInstanceDetailMask` expõe `referencedObject`, que e o contrato correto para descobrir o filho da instancia. Esse `referencedObject` e um identificador tipado, entao o app tambem precisa enriquecer metadados por ID quando nome/revisao/proprietario nao vierem completos.

## Alteracoes aplicadas

- `EnoviaApi.engInstanceChildrenUrl` agora usa `$mva=true`, `$mask=dsmveng:EngInstanceMask.Details` e `$fields=dsmvcfg:attribute.hasConfiguredInstance`.
- `EnoviaApi.engInstanceDetailUrl` usa o mesmo contrato.
- Criado helper `EngItem /expand` para diagnostico do endpoint oficial `POST dseng:EngItem/{ID}/expand`.
- `BomService` passou a enriquecer `referencedObject` fino por ID real com cache por referencia.
- O diagnostico avancado passa a registrar:
  - `RAW EngInstance list mask details`;
  - `RAW EngItem expand all levels`;
  - payload e scan de contrato para confirmar se `referencedObject` apareceu.

## Como validar

1. Abrir uma estrutura no Product Structure Explorer e expandir os niveis necessarios.
2. Clicar somente em `Atualizar estrutura`.
3. Verificar se a E-BOM carrega raiz + pais + filhos.
4. Abrir `Avancado` e confirmar:
   - `RAW EngInstance list mask details` OK;
   - o payload contem `referencedObject`;
   - contagem final bate com o Explorer.

## Criterio para proxima etapa

Se `referencedObject` vier no payload e a contagem ainda for parcial, o problema restante esta no algoritmo de expansao/paginacao. Se `referencedObject` nao vier, o tenant/release exige outro mask/schema ou o endpoint `expand` deve virar o caminho principal.

