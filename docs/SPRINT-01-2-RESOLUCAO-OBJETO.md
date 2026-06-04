# Sprint 01.2 - Diagnostico de resolucao do objeto real

Data: 2026-06-04

## Problema que a sprint resolve

A Sprint 01.1 provou que `WAFData`, `SecurityContext`, Compass e `3DSpace` estao corretos, mas `dseng:EngItem/{prd-R...}` e `dseng:EngInstance` retornam `404`.

Isso indica que o `physicalId` capturado do Product Structure Explorer pode nao ser o identificador aceito diretamente pelo endpoint `dseng:EngItem` nesse tenant. Antes de reescrever a carga E-BOM, precisamos descobrir qual objeto real deve ser usado:

- `dspfl:PhysicalProduct`;
- `dsxcad:VPMReference`;
- `dseng:EngItem`;
- resultado de busca por nome/titulo;
- outro ID retornado por um modeler intermediario.

## Entrega

Build gerado: `bom20260606i`

O botao `Avancado > Diagnosticar API` agora executa uma secao adicional `RAW object resolution`, ainda isolada do fluxo de E-BOM.

Novos testes adicionados:

- `RAW PhysicalProduct direct`
- `RAW VPMReference direct`
- `RAW modeler search searchStr`
- `RAW modeler search q`
- `RAW PhysicalProduct search`
- `RAW EngItem search`
- `RAW VPMReference search`
- `RAW object candidates total`
- `RAW Candidate EngItem ...`

O diagnostico coleta candidatos `prd-R...` retornados pelos endpoints e testa ate 3 candidatos alternativos em `dseng:EngItem/{id}`.

## Como foi feito

- `assets/js/services/api-diagnostic.js` passou a ter uma chamada WAF bruta que retorna tambem o payload, nao apenas a linha de log.
- Foi criado um coletor de candidatos que procura IDs `prd-R...` em objetos, arrays e strings retornadas pela API.
- Foram adicionadas buscas controladas por nome da estrutura atual, usando o nome capturado pelo `ExplorerContext`.
- O diagnostico continua sequencial para evitar tempestade de requests no tenant.
- O build foi atualizado para `bom20260606i`.
- O bundle versionado foi regenerado.

## Testes locais executados

Comandos:

```powershell
node --check assets/js/services/api-diagnostic.js
node scripts/build-bundle-node.js
rg -n "bom20260606i|RAW PhysicalProduct direct|RAW object resolution|RAW Candidate EngItem|RAW modeler search" assets/js/services/api-diagnostic.js assets/js/config.js widget-boot.html assets/js/widget-boot.js
```

Resultado:

- sintaxe validada;
- bundle `bom20260606i` gerado;
- novos passos de resolucao encontrados no codigo-fonte;
- loader e config apontam para `bom20260606i`.

## Teste no tenant real

Procedimento recomendado:

1. Abrir `widget-boot.html` no Additional App.
2. Abrir a estrutura no Product Structure Explorer.
3. Usar o procedimento paliativo atual para garantir contexto:
   - `Ctrl+A`;
   - `Ctrl+C`;
   - no widget, clicar na area de cola;
   - `Ctrl+V`;
   - clicar `Atualizar estrutura`.
4. Abrir `Avancado`.
5. Clicar `Diagnosticar API`.
6. Copiar o relatorio completo.

O que observar:

- Se `RAW PhysicalProduct direct` retornar `OK`, o caminho de resolucao pode comecar por `dspfl`.
- Se alguma busca retornar candidatos, verificar se `RAW Candidate EngItem ...` funciona.
- Se `RAW Candidate EngItem ...` retornar `OK`, esse ID vira base tecnica para a Sprint 02.
- Se todas as buscas e candidatos falharem, a proxima acao e pesquisar endpoints/permissoes especificas do tenant/release antes de mexer no carregador principal.

## Criterio para avancar

A Sprint 02 so deve iniciar quando:

- existir um endpoint que resolva o objeto real com sucesso; ou
- existir evidencia clara de que o tenant nao permite resolver via esses modelers, indicando qual documentacao/permissao/licenca precisa ser validada.

Enquanto isso, a E-BOM principal nao deve ser reescrita.
