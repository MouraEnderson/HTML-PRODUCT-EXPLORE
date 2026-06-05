# Sprint 01.11 - Diagnostico dos 5 filhos diretos da raiz

Data: 2026-06-04

## Problema que a sprint resolve

A Sprint 01.10 testou recursao em apenas dois filhos resolvidos. Ambos eram folhas (`EngInstance member=0`).

Como a raiz do Drone retornou `EngInstance total=5` e o Explorer mostra 20 linhas, precisamos testar os 5 filhos diretos antes de concluir a estrategia de recursao.

## Entrega

Build gerado: `bom20260606r`

O diagnostico agora:

- resolve ate 5 instancias diretas por `label:"nome sem sufixo"`;
- remove as buscas `name:` e texto puro nessa etapa para reduzir ruido;
- consulta `dseng:EngItem/{childId}`;
- consulta `dseng:EngItem/{childId}/dseng:EngInstance?$skip=0&$top=5`.

## Como foi feito

- `assets/js/services/api-diagnostic.js` passou de `members.slice(0, 2)` para `members.slice(0, 5)`.
- A coleta de filho passou a usar apenas `label:"..."`, pois foi a busca que retornou match exato nos testes anteriores.
- Build atualizado para `bom20260606r`.
- Bundle versionado regenerado.

## Testes locais executados

Comandos:

```powershell
node --check assets/js/services/api-diagnostic.js
node --check assets/js/config.js
node --check assets/js/widget-boot.js
node scripts/build-bundle-node.js
rg -n "bom20260606r|members\.slice\(0, 5\)|RAW Child search name|RAW Child search plain" assets/js/services/api-diagnostic.js assets/js/bom-bundle.js assets/js/bom-bundle-bom20260606r.js assets/js/build-id.js assets/js/config.js assets/js/widget-boot.js widget-boot.html -S
```

Resultado:

- sintaxe validada;
- bundle `bom20260606r` gerado;
- fonte e bundle confirmados com `members.slice(0, 5)`;
- bundle final sem `RAW Child search name` e sem `RAW Child search plain`.

## Teste no tenant real

Procedimento igual ao anterior:

1. Abrir o widget no 3DDashboard.
2. Confirmar build `bom20260606r`.
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
RAW Child resolution by instance name
RAW Child search label
RAW Resolved child recursion probes
RAW Resolved child EngItem
RAW Resolved child EngInstance
```

## Criterio para avancar

Se algum dos 5 filhos retornar `EngInstance member>0`, a recursao esta comprovada e podemos desenhar o loader principal com cache e fila controlada.

Se todos os 5 filhos retornarem `member=0`, a diferenca entre 5 diretos e 20 linhas do Explorer provavelmente esta em outro nivel de representacao/ocorrencia ou no modo como o Explorer conta linhas visiveis.

## Resultado no tenant real

Coleta recebida para build `bom20260606r`:

- `RAW Child resolution by instance name` executou 5 buscas por `label`.
- As 5 buscas retornaram match exato para:
  - `01_SKA_Arm Gear of Drone_130520206`;
  - `01_SKA_Gearing of Drone_130520206`;
  - `01_SKA_Beater Disc_130520206`;
  - `01_SKA_Leg_130520206`;
  - `01_SKA_Frame_130520206`.
- `RAW Resolved child recursion probes` retornou `4 filho(s) resolvidos`, nao 5.
- Os 4 filhos testados retornaram `EngItem` OK e `EngInstance member=0`.

Conclusao parcial:

- Resolucao dos 5 filhos diretos por `label` funcionou.
- O diagnostico tinha limite interno de 4 filhos resolvidos na etapa de recursao.
- Ainda falta testar o quinto filho resolvido (`01_SKA_Frame_130520206`) antes de concluir que todos os filhos diretos sao folhas.

Proxima coleta: corrigir o limite de recursao para 5 filhos resolvidos.
