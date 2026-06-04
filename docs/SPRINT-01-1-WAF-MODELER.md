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

### Resultado recebido - caso 20 itens / Drone

Data do teste: 2026-06-04

Caso testado:

- Estrutura: `01_SKA_Drone Assembly_130520206`
- Esperado pelo Explorer: `20`
- `physicalId`: `prd-R1132100929518-01172440`
- Build: `bom20260606h`

Procedimento executado:

1. Abrir estrutura no Product Structure Explorer.
2. `Ctrl+A`.
3. `Ctrl+C`.
4. `Atualizar estrutura`.
5. Abrir `Avancado`.
6. `Diagnosticar API`.

Resultado resumido:

```text
OK    WAFData
OK    SecurityContext
OK    platformId
OK    Compass getServiceUrl(3DSpace)
OK    3DSpace verificado em *-space
FAIL  CSRF GET - sem token
OK    RAW CSRF json minimal - OK object{success,statusCode,csrf,data,masks,definitions}
OK    RAW CSRF text minimal - OK string(154)
FAIL  RAW EngItem json minimal - ResponseCode 404
FAIL  RAW EngItem json full headers - ResponseCode 0
FAIL  RAW EngItem text minimal - ResponseCode 404
FAIL  RAW EngInstance json minimal - ResponseCode 404
FAIL  RAW EngInstance text minimal - ResponseCode 404
```

Leitura tecnica:

- `WAFData.authenticatedRequest` funciona.
- A URL `3DSpace` resolvida por Compass esta correta e responde.
- O endpoint CSRF retorna dados quando chamado via WAF bruto.
- A falha do CSRF no wrapper e problema de extracao/forma do payload, nao bloqueio de rede.
- `dseng:EngItem/{prd-R...}` retorna `404` mesmo com WAF bruto, headers minimos e retorno text.
- `dseng:EngInstance` abaixo desse mesmo `prd-R...` tambem retorna `404`.
- Headers completos pioram um caso para `ResponseCode 0`, entao o proximo ajuste deve evitar headers desnecessarios em GET de diagnostico.
- O problema principal nao e `json` versus `text` e nao parece ser o `WafClient`; o ID `prd-R...` provavelmente nao e o ID aceito por `dseng:EngItem` nesse tenant/endpont.

Conclusao:

A Sprint 02 continua bloqueada. O proximo passo deve ser uma Sprint 01.2 para resolver o objeto real antes da carga E-BOM:

- testar `dspfl:PhysicalProduct` via WAF bruto;
- testar endpoints de busca por nome/titulo;
- procurar resposta que contenha EngItem, VPMReference ou outro ID aceito por `dseng:EngItem`;
- somente depois testar `dseng:EngInstance` no ID resolvido.

## Criterio para avancar

A Sprint 02 so deve iniciar quando o relatorio RAW indicar pelo menos um caminho de request modeler funcional, ou quando a falha estiver suficientemente classificada para pesquisar endpoint/permissao correta sem alterar o fluxo principal.
