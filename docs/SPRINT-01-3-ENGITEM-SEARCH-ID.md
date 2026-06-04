# Sprint 01.3 - Extracao de IDs do EngItem search

Data: 2026-06-04

## Problema que a sprint resolve

O teste real da Sprint 01.2 mostrou que `dseng:EngItem/search` retorna `200` com payload `object{totalItems,member,nlsLabel}`, mas o diagnostico nao encontrou candidatos porque procurava apenas IDs com prefixo `prd-R...`.

Isso deixou escondido o dado mais importante: quais IDs aparecem dentro de `member`.

## Entrega

Build gerado: `bom20260606j`

O diagnostico `Avancado > Diagnosticar API` agora:

- registra uma linha `... payload` para endpoints de resolucao que retornam `OK`;
- mostra quantidade de `member` e uma amostra curta dos primeiros registros;
- aceita IDs candidatos que nao começam com `prd-R`, desde que sejam strings plausiveis de ID;
- continua testando ate 3 candidatos alternativos em `dseng:EngItem/{id}`.

## Como foi feito

- `assets/js/services/api-diagnostic.js` passou a extrair IDs de campos como `physicalid`, `physicalId`, `objectId`, `resourceid`, `resourceId`, `pid` e `id`, sem exigir prefixo `prd-R`.
- Foi adicionada validacao simples para ignorar URLs, textos longos e valores com espacos/chaves.
- O relatorio ganhou `RAW ... payload` para revelar `member` e amostra sem depender do console.
- O build foi atualizado para `bom20260606j`.

## Testes locais executados

Comandos:

```powershell
node --check assets/js/services/api-diagnostic.js
node --check assets/js/config.js
node --check assets/js/widget-boot.js
node scripts/build-bundle-node.js
rg -n "bom20260606j|memberSummary|RAW Candidate EngItem|window.__BOM_BUILD_ID__='bom20260606j'" assets/js/bom-bundle.js assets/js/bom-bundle-bom20260606j.js assets/js/build-id.js assets/js/services/api-diagnostic.js
```

Resultado:

- sintaxe validada;
- bundle `bom20260606j` gerado;
- `build-id.js`, loader e bundle apontam para `bom20260606j`;
- novos logs de payload/candidatos confirmados no bundle.

## Teste no tenant real

Procedimento:

1. Abrir `widget-boot.html`.
2. Abrir a estrutura no Product Structure Explorer.
3. Usar o procedimento paliativo atual para garantir contexto:
   - `Ctrl+A`;
   - `Ctrl+C`;
   - clicar na area de cola do widget;
   - `Ctrl+V`;
   - `Atualizar estrutura`.
4. Abrir `Avancado`.
5. Clicar `Diagnosticar API`.
6. Copiar o relatorio completo.

O que observar:

- `RAW EngItem search payload` deve mostrar `member=N` e uma amostra.
- `RAW EngItem search candidates` deve listar IDs candidatos.
- `RAW Candidate EngItem ...` deve indicar se algum desses IDs funciona como endpoint direto.

## Criterio para avancar

A proxima etapa so deve reescrever o loader E-BOM se algum candidato do `member` funcionar em `dseng:EngItem/{id}` ou se a amostra indicar claramente qual campo deve ser usado como ID de EngItem/instancia.

## Resultado recebido - caso 20 itens / Drone

Data do teste: 2026-06-04

Caso testado:

- Estrutura: `01_SKA_Drone Assembly_130520206`
- Esperado pelo Explorer: `20`
- `physicalId`: `prd-R1132100929518-01172440`
- Build: `bom20260606j`

Resultado resumido:

```text
OK    RAW EngItem search - object{totalItems,member,nlsLabel}
OK    RAW EngItem search payload - member=10
OK    RAW EngItem search candidates - IDs de 32 caracteres, tipo VPMReference
OK    RAW Candidate EngItem B6336E575A4045608AE029CDF65900C9
OK    RAW Candidate EngItem 8EA67E9CABA9488CB7BC423D41548B3B
OK    RAW Candidate EngItem 298DB7237C65442BBC650A3B3E806438
FAIL  dseng:EngItem direto com prd-R...
FAIL  dseng:EngInstance direto com prd-R...
```

Leitura tecnica:

- O endpoint correto nao aceita o `prd-R...` do Explorer como ID direto.
- IDs de 32 caracteres retornados por `dseng:EngItem/search` funcionam em `dseng:EngItem/{id}`.
- A busca por nome retornou candidatos `VPMReference`, mas a amostra nao confirmou ainda que eles sao a raiz correta do Drone; apareceram itens como `0000001440`, `0000001441`.
- Proxima etapa: testar `dseng:EngInstance` nos candidatos funcionais e buscar tambem pelo `physicalId` original.
