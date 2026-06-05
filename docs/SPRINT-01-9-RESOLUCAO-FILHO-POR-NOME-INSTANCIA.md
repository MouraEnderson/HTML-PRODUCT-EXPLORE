# Sprint 01.9 - Diagnostico de resolucao do filho por nome da instancia

Data: 2026-06-04

## Problema que a sprint resolve

A Sprint 01.8 confirmou que `dseng:EngInstance` funciona, mas nao entrega a `VPMReference` filha nem com `$expand` nem via detalhe da instancia.

Ainda precisamos descobrir se existe um caminho API-first para transformar:

```text
VPMReference pai -> VPMInstance -> VPMReference filho
```

Sem essa relacao, nao ha E-BOM recursiva confiavel.

## Evidencia externa considerada

Materiais publicos da comunidade Dassault indicam que, no modelo de dados, `VPMInstance` possui uma referencia (`Reference`) para a `VPMReference` filha. Um exemplo EKL usa `PrdInst.Reference` e `GetPhysicalId()` para obter a referencia do filho.

Isso confirma o modelo conceitual, mas nao prova que o REST `dseng:EngInstance` entregue esse campo diretamente no Additional App.

Fontes:

- 3DSwym EKL Cheat Sheet: https://3dswym.3dexperience.3ds.com/wiki/delmia-process-engineering/ekl-cheat-sheet_JkHGeWEnSNyOenawYvwGQw
- 3DSwym Effectivity examples: https://3dswym.3dexperience.3ds.com/wiki/delmia-process-engineering/unset-variant-effectivity-on-mfg-item-engg-item-systems-resources_HWaCJAzuQ5aXnB4eHB1c5Q

## Entrega

Build gerado: `bom20260606p`

O diagnostico agora testa uma hipotese limitada:

1. pegar as duas primeiras instancias retornadas por `dseng:EngInstance`;
2. remover sufixo de ocorrencia do nome:
   - `<1>`;
   - `.1`;
3. pesquisar `dseng:EngItem` usando UQL:
   - `label:"nome base"`;
   - `name:nome base`;
   - texto puro;
4. registrar candidatos e matches exatos.

## Como foi feito

- `assets/js/services/api-diagnostic.js` recebeu:
  - `stripOccurrenceSuffix`;
  - `engItemUqlUrl`;
  - `probeChildResolutionByInstanceName`.
- A coleta roda somente para duas instancias para evitar excesso de chamadas.
- Build atualizado para `bom20260606p`.
- Bundle versionado regenerado.

## Testes locais executados

Comandos:

```powershell
node --check assets/js/services/api-diagnostic.js
node --check assets/js/config.js
node --check assets/js/widget-boot.js
node scripts/build-bundle-node.js
rg -n "bom20260606p|RAW Child resolution by instance name|stripOccurrenceSuffix|RAW Child search label" assets/js/services/api-diagnostic.js assets/js/bom-bundle.js assets/js/build-id.js assets/js/config.js assets/js/widget-boot.js widget-boot.html -S
```

Resultado:

- sintaxe validada;
- bundle `bom20260606p` gerado;
- probes novos confirmados nos arquivos fonte e no bundle.

## Teste no tenant real

Procedimento igual ao anterior:

1. Abrir o widget no 3DDashboard.
2. Confirmar build `bom20260606p`.
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
RAW Child search name
RAW Child search plain
```

## Criterio para avancar

Se `label:"nome base"` retornar uma unica `VPMReference` correta para cada instancia testada, teremos uma estrategia de contingencia para resolver filhos.

Mesmo assim, antes de usar em producao, sera preciso avaliar:

- risco de nomes duplicados;
- custo em estruturas grandes;
- necessidade de cache/batch;
- se existe API REST melhor para recuperar `Reference` sem busca por nome.

Se as buscas retornarem resultados ambiguos ou incorretos, essa hipotese deve ser descartada.
