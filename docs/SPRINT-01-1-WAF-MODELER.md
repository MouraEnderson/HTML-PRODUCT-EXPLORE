# Sprint 01.1 - Diagnostico WAF/modeler

Data: 2026-06-04

## Problema que a sprint resolve

O primeiro diagnostico confirmou `WAFData`, `SecurityContext`, `platformId` e `3DSpace` corretos, mas as chamadas `modeler` para `dseng`/`dspfl` falharam como bloqueio/rede no host `*-space`.

Antes de iniciar a Sprint 02, precisamos descobrir se a falha esta:

- no endpoint;
- nos headers;
- no tipo de resposta (`json` versus `text`);
- no wrapper `WafClient`;
- na permissao/role/licenca;
- ou na propria disponibilidade dos recursos `modeler` para o Additional App.

## Entrega

Build gerado: `bom20260606h`

O botao `Avancado > Diagnosticar API` agora executa tambem uma secao `RAW WAF variants`, sem alterar a E-BOM.

Variantes adicionadas:

- `RAW CSRF json minimal`
- `RAW CSRF text minimal`
- `RAW EngItem json minimal`
- `RAW EngItem json full headers`
- `RAW EngItem text minimal`
- `RAW EngInstance json minimal`
- `RAW EngInstance text minimal`

Essas chamadas usam `WAFData.authenticatedRequest` diretamente, sem passar pelo `WafClient`, para comparar o comportamento bruto com o wrapper atual.

## Como foi feito

- `assets/js/services/api-diagnostic.js` ganhou chamadas brutas sequenciais de WAF.
- As chamadas registram:
  - endpoint;
  - status quando disponivel;
  - `type`;
  - `responseType`;
  - formato do payload retornado;
  - amostra curta do retorno/falha.
- O build foi atualizado para `bom20260606h`.
- O bundle versionado foi regenerado.

## Testes locais executados

Comandos:

```powershell
node --check assets/js/services/api-diagnostic.js
node --check assets/js/config.js
node --check assets/js/widget-boot.js
node scripts/build-bundle-node.js
rg -n "bom20260606h|RAW EngItem|RAW EngInstance|RAW WAF variants|window.__BOM_BUILD_ID__='bom20260606h'" assets/js/bom-bundle.js assets/js/bom-bundle-bom20260606h.js assets/js/build-id.js widget-boot.html assets/js/widget-boot.js
```

Resultado:

- sintaxe validada;
- bundle `bom20260606h` gerado;
- `build-id.js` aponta para `bom20260606h`;
- variantes RAW confirmadas dentro do bundle publicado.

## Teste no tenant real

Procedimento:

1. Abrir `widget-boot.html`.
2. Abrir a estrutura no Product Structure Explorer.
3. Repetir o mesmo procedimento usado no teste anterior:
   - `Ctrl+A`;
   - `Ctrl+C`;
   - `Atualizar estrutura`;
   - abrir `Avancado`;
   - clicar `Diagnosticar API`.
4. Copiar o relatorio completo.

O que observar:

- Se `RAW EngItem json minimal` funcionar, o problema esta provavelmente em headers/opcoes do `WafClient`.
- Se `RAW EngItem text minimal` funcionar e `json` falhar, o problema esta no formato de resposta ou parse JSON.
- Se todas as variantes `RAW EngItem` e `RAW EngInstance` falharem, o problema esta provavelmente no endpoint/permissao/recurso modeler, nao no wrapper.
- Se CSRF `text` retornar token e CSRF `json` nao, ajustar extração de CSRF.

## Criterio para avancar

A Sprint 02 so deve iniciar quando o relatorio RAW indicar pelo menos um caminho de request modeler funcional, ou quando a falha estiver suficientemente classificada para pesquisar endpoint/permissao correta sem alterar o fluxo principal.
