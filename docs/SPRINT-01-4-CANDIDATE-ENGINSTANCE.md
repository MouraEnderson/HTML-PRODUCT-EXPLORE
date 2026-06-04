# Sprint 01.4 - Teste de EngInstance nos candidatos EngItem

Data: 2026-06-04

## Problema que a sprint resolve

A Sprint 01.3 confirmou que IDs de 32 caracteres retornados por `dseng:EngItem/search` funcionam em `dseng:EngItem/{id}`. Ainda falta saber se esses candidatos sao a raiz correta da estrutura e se o endpoint de filhos `dseng:EngInstance` funciona quando recebe esse tipo de ID.

## Entrega

Build gerado: `bom20260606k`

O diagnostico agora:

- adiciona `RAW EngItem search physicalId`, pesquisando pelo `prd-R...` original;
- para cada candidato testado em `RAW Candidate EngItem ...`, registra tambem `... payload`;
- para cada candidato funcional, testa `RAW Candidate EngInstance ...`;
- registra payload e contagem de `member`/`total` quando `EngInstance` retorna `OK`.

## Como foi feito

- `assets/js/services/api-diagnostic.js` passou a executar `dseng:EngInstance` nos IDs candidatos de 32 caracteres.
- A busca por resolucao passou a incluir `searchStr=<physicalId original>`.
- O build foi atualizado para `bom20260606k`.
- O bundle versionado foi regenerado.

## Testes locais executados

Comandos:

```powershell
node --check assets/js/services/api-diagnostic.js
node --check assets/js/config.js
node --check assets/js/widget-boot.js
node scripts/build-bundle-node.js
rg -n "bom20260606k|RAW EngItem search physicalId|RAW Candidate EngInstance|window.__BOM_BUILD_ID__='bom20260606k'" assets/js/bom-bundle.js assets/js/bom-bundle-bom20260606k.js assets/js/build-id.js assets/js/services/api-diagnostic.js
```

Resultado:

- sintaxe validada;
- bundle `bom20260606k` gerado;
- loader, `build-id.js` e bundle apontam para `bom20260606k`;
- novos passos de candidato/instancia confirmados no bundle.

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

- `RAW EngItem search physicalId`
- `RAW Candidate EngItem ... payload`
- `RAW Candidate EngInstance ...`
- `RAW Candidate EngInstance ... payload`

## Criterio para avancar

A Sprint 02 pode comecar se algum `RAW Candidate EngInstance ...` retornar filhos coerentes com a estrutura do Explorer.

Se os candidatos funcionarem como EngItem mas nao trouxerem filhos, a proxima etapa ainda deve continuar em diagnostico de endpoint/relacao, nao em reescrita do loader principal.

## Resultado recebido - caso 20 itens / Drone

Data do teste: 2026-06-04

Caso testado:

- Estrutura: `01_SKA_Drone Assembly_130520206`
- Esperado pelo Explorer: `20`
- `physicalId`: `prd-R1132100929518-01172440`
- Build: `bom20260606k`

Resultado resumido:

```text
OK    RAW EngItem search payload - member=10
OK    RAW EngItem search physicalId payload - member=10
OK    RAW Candidate EngItem ... payload - member=1
OK    RAW Candidate EngInstance B6336... - member=0
OK    RAW Candidate EngInstance 8EA6... - member=4
OK    RAW Candidate EngInstance 298D... - member=1
```

Leitura tecnica:

- `dseng:EngInstance` funciona quando recebe ID de 32 caracteres.
- Os candidatos testados nao parecem ser a raiz correta do Drone; retornaram itens como `Manípulo`, `Tampo` e estrutura de mesa.
- A busca simples por nome e por `prd-R...` retornou os mesmos candidatos, indicando que `searchStr` simples esta amplo demais ou nao esta aplicando filtro exato suficiente.
- A Sprint 02 ainda nao deve iniciar, porque ainda nao temos o ID raiz correto da estrutura aberta no Explorer.
- Proxima etapa: testar `$searchStr` com UQL, principalmente `name:<physicalId>`, e registrar matches exatos antes de aceitar candidatos.
