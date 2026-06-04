# Sprint 01.7 - Coleta ampliada do payload EngInstance

Data: 2026-06-04

## Problema que a sprint resolve

A coleta da Sprint 01.6 provou que a raiz real do Drone e o endpoint `dseng:EngInstance` funcionam, mas o relatorio cortava o JSON em 220 caracteres.

Com isso, ainda nao dava para confirmar se cada `VPMInstance` traz no payload:

- `referencedObject`;
- `reference`;
- `relativePath`;
- `dseng:EngItem`;
- ou outro campo necessario para resolver a `VPMReference` filha.

Sem essa prova, qualquer mudanca no loader principal seria tentativa.

## Entrega

Build gerado: `bom20260606n`

O diagnostico avancado agora aumenta o limite do resumo somente no payload:

```text
RAW Candidate EngInstance {id} payload
```

Esse item passa a mostrar ate 5000 caracteres da amostra, mantendo os demais resumos curtos.

## Como foi feito

- `assets/js/services/api-diagnostic.js` recebeu `jsonSnippet(value, limit)`.
- `memberSummary(data, sampleLimit)` passou a aceitar limite customizado.
- O payload de `RAW Candidate EngInstance ... payload` usa `memberSummary(childResult.data, 5000)`.
- Build atualizado para `bom20260606n`.
- Bundle versionado regenerado.

## Testes locais executados

Comandos:

```powershell
node --check assets/js/services/api-diagnostic.js
node --check assets/js/config.js
node --check assets/js/widget-boot.js
node scripts/build-bundle-node.js
rg -n "bom20260606n|memberSummary\(childResult\.data, 5000\)|function jsonSnippet" assets/js/services/api-diagnostic.js assets/js/bom-bundle.js assets/js/build-id.js assets/js/config.js assets/js/widget-boot.js widget-boot.html -S
```

Resultado:

- sintaxe validada;
- bundle `bom20260606n` gerado;
- `widget-boot.html`, `widget-boot.js`, `build-id.js`, `config.js`, `bom-bundle.js` e bundle versionado apontam para `bom20260606n`;
- diagnostico ampliado confirmado no bundle.

## Teste no tenant real

Procedimento:

1. Abrir o widget no 3DDashboard.
2. Confirmar que a build carregada e `bom20260606n`.
3. Abrir a estrutura no Product Structure Explorer.
4. Usar o procedimento paliativo atual:
   - `Ctrl+A`;
   - `Ctrl+C`;
   - clicar na area de cola do widget;
   - `Ctrl+V`;
   - `Atualizar estrutura`.
5. Abrir `Avancado`.
6. Clicar `Diagnosticar API`.
7. Copiar principalmente a linha:

```text
RAW Candidate EngInstance 132FB3CE26D70E006A18D1870000316D payload
```

## Criterio para avancar

A Sprint 02 so deve iniciar quando essa linha revelar como a instância aponta para a referencia filha.

Se o payload nao mostrar a referencia filha, a proxima etapa ainda e diagnostico, testando detalhe da instancia:

```text
dseng:EngItem/{parentId}/dseng:EngInstance/{instanceId}
```

ou variacoes com `$expand`, antes de alterar o loader principal.
