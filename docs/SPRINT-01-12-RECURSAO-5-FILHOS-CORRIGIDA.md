# Sprint 01.12 - Corrigir limite da recursao para 5 filhos

Data: 2026-06-04

## Problema que a sprint resolve

A build `bom20260606r` resolveu 5 filhos diretos por `label`, mas testou recursao em apenas 4 filhos porque `probeResolvedChildEngItems` limitava candidatos com `slice(0, 4)`.

Isso deixava o quinto filho (`01_SKA_Frame_130520206`) sem verificacao de `EngInstance`.

## Entrega

Build gerado: `bom20260606s`

O diagnostico agora:

- continua resolvendo ate 5 instancias diretas por `label`;
- testa recursao nos 5 filhos resolvidos;
- registra `RAW Resolved child recursion probes` com `5 filho(s) resolvidos`, se todos forem encontrados.

## Como foi feito

- `assets/js/services/api-diagnostic.js` alterou `slice(0, 4)` para `slice(0, 5)` em `probeResolvedChildEngItems`.
- Build atualizado para `bom20260606s`.
- Bundle versionado regenerado.

## Testes locais executados

Comandos:

```powershell
node --check assets/js/services/api-diagnostic.js
node --check assets/js/config.js
node --check assets/js/widget-boot.js
node scripts/build-bundle-node.js
rg -n "bom20260606s|slice\(0, 5\)|RAW Resolved child recursion probes" assets/js/services/api-diagnostic.js assets/js/bom-bundle.js assets/js/build-id.js assets/js/config.js assets/js/widget-boot.js widget-boot.html -S
```

Resultado:

- sintaxe validada;
- bundle `bom20260606s` gerado;
- fonte e bundle confirmados com limite 5 na resolucao e na recursao.

## Teste no tenant real

Procedimento igual ao anterior:

1. Abrir o widget no 3DDashboard.
2. Confirmar build `bom20260606s`.
3. Abrir estrutura no Product Structure Explorer.
4. Usar o fluxo paliativo atual:
   - `Ctrl+A`;
   - `Ctrl+C`;
   - clicar na area de cola do widget;
   - `Ctrl+V`;
   - `Atualizar estrutura`.
5. Abrir `Avancado`.
6. Clicar `Diagnosticar API`.
7. Copiar as linhas:

```text
RAW Child resolution by instance name
RAW Child search label
RAW Resolved child recursion probes
RAW Resolved child EngItem
RAW Resolved child EngInstance
```

## Criterio para avancar

Se `RAW Resolved child recursion probes` retornar `5 filho(s) resolvidos` e todos os 5 retornarem `EngInstance member=0`, a proxima decisao tecnica sera:

- implementar loader API-first para estrutura unica raiz + 5 filhos diretos; ou
- investigar por que o Explorer/clipboard reporta 20 linhas quando `dseng:EngInstance` da raiz retorna apenas 5.

Se algum filho retornar `member>0`, a recursao API-first fica comprovada para esse caso.
