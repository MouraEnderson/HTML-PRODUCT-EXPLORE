# Sprint 01.6 - Prioridade para match exato da raiz

Data: 2026-06-04

## Problema que a sprint resolve

A Sprint 01.5 encontrou a raiz correta via UQL, mas o diagnostico ainda testava os primeiros candidatos genericos antes do match exato.

Isso impedia confirmar se `dseng:EngInstance` retorna filhos para a raiz real:

- `physicalId`: `prd-R1132100929518-01172440`
- `id dseng`: `132FB3CE26D70E006A18D1870000316D`

## Entrega

Build gerado: `bom20260606m`

O diagnostico agora:

- acumula matches exatos em lista separada;
- registra `RAW object exact candidates total`;
- registra `RAW object prioritized candidates`;
- testa candidatos priorizados com matches exatos antes dos genericos.

## Como foi feito

- `assets/js/services/api-diagnostic.js` passou a manter `exactCandidates` e `candidates` separados.
- A fila final usa `exactCandidates` primeiro e depois completa com candidatos gerais sem duplicar IDs.
- O build foi atualizado para `bom20260606m`.
- O bundle versionado foi regenerado.

## Testes locais executados

Comandos:

```powershell
node --check assets/js/services/api-diagnostic.js
node --check assets/js/config.js
node --check assets/js/widget-boot.js
node scripts/build-bundle-node.js
rg -n "bom20260606m|RAW object exact candidates total|RAW object prioritized candidates|window.__BOM_BUILD_ID__='bom20260606m'" assets/js/bom-bundle.js assets/js/bom-bundle-bom20260606m.js assets/js/build-id.js assets/js/services/api-diagnostic.js
```

Resultado:

- sintaxe validada;
- bundle `bom20260606m` gerado;
- loader, `build-id.js` e bundle apontam para `bom20260606m`;
- novas linhas de priorizacao confirmadas no bundle.

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

- `RAW object exact candidates total`
- `RAW object prioritized candidates`
- `RAW Candidate EngItem 132FB3CE26D70E006A18D1870000316D`
- `RAW Candidate EngInstance 132FB3CE26D70E006A18D1870000316D`
- `RAW Candidate EngInstance 132FB3CE26D70E006A18D1870000316D payload`

## Criterio para avancar

A Sprint 02 pode comecar se o `RAW Candidate EngInstance 132FB3CE26D70E006A18D1870000316D payload` retornar filhos coerentes com a estrutura Drone no Explorer.

Se retornar `member=0` ou filhos incoerentes, continuar diagnostico de relacionamento/endpoint antes de alterar o loader principal.
