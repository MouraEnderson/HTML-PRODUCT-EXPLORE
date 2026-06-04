# Sprint 01.5 - Busca UQL exata para resolver a raiz

Data: 2026-06-04

## Problema que a sprint resolve

A Sprint 01.4 confirmou que `dseng:EngInstance` funciona com IDs de 32 caracteres, mas os candidatos retornados pela busca simples nao sao a raiz correta da estrutura aberta no Product Structure Explorer.

Precisamos parar de aceitar os primeiros resultados de busca e localizar o `VPMReference`/`EngItem` cujo `member.name` corresponda exatamente ao `physicalId` original `prd-R...`, ou cujo titulo/nome corresponda claramente a raiz aberta.

## Evidencia tecnica usada

Uma publicacao tecnica da comunidade Dassault sobre busca avancada em web services explica que o parametro `$searchStr` aceita UQL e cita exemplos como `name:prd-R...` e `label:BE*`.

Fonte consultada:

- [Dassault Systemes - Tech Tip Advanced Web Service Search UQL](https://3dswym.3dexperience.3ds.com/post/enovia-user-community/tech-tip-advanced-web-service-search-uql_6M0XxhGZQpiPcEy5Z9Z63Q)

## Entrega

Build gerado: `bom20260606l`

O diagnostico agora adiciona variantes:

- `RAW EngItem UQL label root`
- `RAW EngItem UQL name root`
- `RAW EngItem $searchStr physicalId`
- `RAW EngItem UQL name physicalId`
- `... exact matches` para cada busca que retorna `OK`

O relatorio passa a separar:

- candidatos gerais encontrados no payload;
- matches exatos contra `physicalId` e nome raiz.

## Como foi feito

- `assets/js/services/api-diagnostic.js` passou a testar `$searchStr` alem de `searchStr`.
- Foram adicionadas consultas UQL com `name:` e `label:`.
- O coletor de candidatos preserva `name`, `title` e `description`.
- Foi criado filtro de matches exatos por `id`, `name`, `title`, `description` e `type`.
- Matches exatos entram antes dos candidatos genericos na fila de teste.
- O build foi atualizado para `bom20260606l`.

## Testes locais executados

Comandos:

```powershell
node --check assets/js/services/api-diagnostic.js
node --check assets/js/config.js
node --check assets/js/widget-boot.js
node scripts/build-bundle-node.js
rg -n "bom20260606l|RAW EngItem UQL|exact matches|window.__BOM_BUILD_ID__='bom20260606l'" assets/js/bom-bundle.js assets/js/bom-bundle-bom20260606l.js assets/js/build-id.js assets/js/services/api-diagnostic.js
```

Resultado:

- sintaxe validada;
- bundle `bom20260606l` gerado;
- loader, `build-id.js` e bundle apontam para `bom20260606l`;
- novas buscas UQL e logs de matches exatos confirmados no bundle.

## Teste no tenant real

Procedimento:

1. Abrir `widget-boot.html`.
2. Abrir a estrutura no Product Structure Explorer.
3. Usar o procedimento paliativo atual:
   - `Ctrl+A`;
   - `Ctrl+C`;
   - clicar na area de cola do widget;
   - `Ctrl+V`;
   - `Atualizar estrutura`.
4. Abrir `Avancado`.
5. Clicar `Diagnosticar API`.
6. Copiar o relatorio completo.

O que observar:

- `RAW EngItem UQL name physicalId`
- `RAW EngItem UQL name physicalId exact matches`
- `RAW EngItem UQL label root`
- `RAW EngItem UQL name root`
- `RAW object candidates total`
- `RAW Candidate EngInstance ... payload`

## Criterio para avancar

A Sprint 02 pode comecar se uma busca UQL localizar um match exato da raiz e o `RAW Candidate EngInstance ... payload` desse match retornar filhos coerentes com o Explorer.

Se UQL tambem retornar candidatos errados, continuar diagnostico de contexto/seleção do Explorer antes de alterar o loader principal.
