# Sprint 01.10 - Diagnostico de recursao dos filhos resolvidos

Data: 2026-06-04

## Problema que a sprint resolve

A Sprint 01.9 mostrou que e possivel resolver os dois primeiros filhos por `label:"nome da instancia sem sufixo"`.

Agora precisamos validar se os IDs resolvidos podem continuar a navegacao:

```text
raiz -> EngInstance -> busca label -> EngItem filho -> EngInstance do filho
```

Sem essa prova, ainda nao ha base para implementar uma E-BOM recursiva API-first.

## Entrega

Build gerado: `bom20260606q`

O diagnostico agora:

- acumula os matches exatos encontrados pela busca de filho;
- testa ate 4 filhos resolvidos;
- chama `dseng:EngItem/{childId}`;
- chama `dseng:EngItem/{childId}/dseng:EngInstance?$skip=0&$top=5`.

## Como foi feito

- `assets/js/services/api-diagnostic.js` recebeu `probeResolvedChildEngItems`.
- `probeChildResolutionByInstanceName` passou a acumular matches exatos e testar recursao nos filhos resolvidos.
- Build atualizado para `bom20260606q`.
- Bundle versionado regenerado.

## Testes locais executados

Comandos:

```powershell
node --check assets/js/services/api-diagnostic.js
node --check assets/js/config.js
node --check assets/js/widget-boot.js
node scripts/build-bundle-node.js
rg -n "bom20260606q|RAW Resolved child recursion probes|RAW Resolved child EngInstance|probeResolvedChildEngItems" assets/js/services/api-diagnostic.js assets/js/bom-bundle.js assets/js/build-id.js assets/js/config.js assets/js/widget-boot.js widget-boot.html -S
```

Resultado:

- sintaxe validada;
- bundle `bom20260606q` gerado;
- probes novos confirmados nos arquivos fonte e no bundle.

## Teste no tenant real

Procedimento igual ao anterior:

1. Abrir o widget no 3DDashboard.
2. Confirmar build `bom20260606q`.
3. Abrir estrutura no Product Structure Explorer.
4. Usar o fluxo paliativo atual:
   - `Ctrl+A`;
   - `Ctrl+C`;
   - clicar na area de cola do widget;
   - `Ctrl+V`;
   - `Atualizar estrutura`.
5. Abrir `Avancado`.
6. Clicar `Diagnosticar API`.
7. Copiar as linhas que comecam com:

```text
RAW Resolved child recursion probes
RAW Resolved child EngItem
RAW Resolved child EngInstance
```

## Criterio para avancar

Se os filhos resolvidos retornarem `EngInstance` coerente, temos evidência para desenhar um loader recursivo:

1. resolver raiz por UQL exato;
2. listar instancias diretas;
3. resolver cada filho por `label`;
4. consultar filhos recursivamente;
5. usar cache e controle de duplicidade para escala.

Se os filhos resolvidos nao retornarem `EngInstance`, a estrategia ainda precisa ser reavaliada.

## Resultado no tenant real

Coleta recebida para build `bom20260606q`:

- `RAW Resolved child recursion probes` retornou `2 filho(s) resolvidos`.
- Filho `132FB3CE26D70E006A18D18700003187` (`01_SKA_Arm Gear of Drone_130520206`) retornou `EngItem` OK e `EngInstance member=0`.
- Filho `132FB3CE26D70E006A18D1880000319F` (`01_SKA_Gearing of Drone_130520206`) retornou `EngItem` OK e `EngInstance member=0`.

Conclusao: os dois primeiros filhos diretos sao folhas. A recursao nao foi invalidada, mas ainda nao foi provada para todos os filhos da raiz.

Proxima coleta: resolver todos os 5 filhos diretos da raiz por `label` e consultar `EngInstance` de cada um.
