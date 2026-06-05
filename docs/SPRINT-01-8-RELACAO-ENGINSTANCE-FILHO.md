# Sprint 01.8 - Diagnostico da relacao VPMInstance -> referencia filha

Data: 2026-06-04

## Problema que a sprint resolve

A coleta da build `bom20260606n` confirmou que o endpoint:

```text
dseng:EngItem/{rootId}/dseng:EngInstance?$skip=0&$top=5
```

retorna `VPMInstance`, mas nao retorna no payload da lista a `VPMReference` filha.

Isso impede transformar a arvore em E-BOM API-first, porque o app sabe quem e a instancia, mas ainda nao sabe qual e o objeto filho real para continuar a recursao.

## Entrega

Build gerado: `bom20260606o`

O diagnostico avancado agora testa, de forma controlada, somente no primeiro candidato priorizado:

- lista `dseng:EngInstance` com `$expand=dseng:EngItem`;
- lista `dseng:EngInstance` com `$expand=dseng:referencedObject`;
- detalhe das duas primeiras instancias;
- detalhe das duas primeiras instancias com `$expand=dseng:EngItem`;
- detalhe das duas primeiras instancias com `$expand=dseng:referencedObject`.

## Como foi feito

- `assets/js/integration/enovia-api.js` passou a montar:
  - `engInstanceChildrenUrl(parentId, skip, top, expand)`;
  - `engInstanceDetailUrl(parentId, instanceId, expand)`.
- `assets/js/services/api-diagnostic.js` recebeu `probeEngInstanceRelationship`.
- A coleta roda apenas para o primeiro candidato priorizado para evitar tempestade de chamadas.
- Build atualizado para `bom20260606o`.
- Bundle versionado regenerado.

## Testes locais executados

Comandos:

```powershell
node --check assets/js/integration/enovia-api.js
node --check assets/js/services/api-diagnostic.js
node --check assets/js/config.js
node --check assets/js/widget-boot.js
node scripts/build-bundle-node.js
rg -n "bom20260606o|RAW EngInstance relationship probes|engInstanceDetailUrl|list expand dseng:EngItem" assets/js/integration/enovia-api.js assets/js/services/api-diagnostic.js assets/js/bom-bundle.js assets/js/build-id.js assets/js/config.js assets/js/widget-boot.js widget-boot.html -S
```

Resultado:

- sintaxe validada;
- bundle `bom20260606o` gerado;
- probes novos confirmados nos arquivos fonte e no bundle.

## Teste no tenant real

Procedimento:

1. Abrir o widget no 3DDashboard.
2. Confirmar build `bom20260606o`.
3. Abrir a estrutura no Product Structure Explorer.
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
RAW EngInstance relationship probes
RAW EngInstance list expand dseng:EngItem
RAW EngInstance list expand referencedObject
RAW EngInstance detail
RAW EngInstance detail expand dseng:EngItem
RAW EngInstance detail expand referencedObject
```

## Criterio para avancar

Podemos iniciar a Sprint 02 do loader API-first se uma dessas rotas revelar a referencia filha real da instancia.

Se todas falharem ou continuarem sem referencia filha, ainda nao devemos alterar o loader principal. O proximo diagnostico deve investigar outro contrato REST para relacao/ocorrencia, antes de implementar a E-BOM recursiva.
