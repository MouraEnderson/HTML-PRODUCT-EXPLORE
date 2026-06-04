# Sprint 01 - Diagnostico API Isolado

Data: 2026-06-04

## Problema que a sprint resolve

Os erros de estrutura `404`, `406` e `CORS` estavam misturados com fallback manual, DOM mirror, paste, miniatura `getpicture` e tentativa de 3DPlay. Sem diagnostico isolado, qualquer ajuste na carga E-BOM vira tentativa.

Esta sprint cria uma forma de testar a plataforma em etapas, sem carregar a estrutura pelo fluxo principal e sem esconder falha de endpoint com fallback.

## Entrega

Build gerado: `bom20260606g`

Arquivos alterados:

- `assets/js/services/api-diagnostic.js`
- `assets/js/integration/enovia-api.js`
- `assets/js/platform/waf-client.js`
- `assets/js/config.js`
- `assets/js/widget-boot.js`
- `widget-boot.html`
- `scripts/build-bundle-node.js`
- `assets/js/bom-bundle.js`
- `assets/js/bom-bundle-bom20260606g.js`
- `assets/js/build-id.js`

O diagnostico agora registra separadamente:

1. disponibilidade de `WAFData.authenticatedRequest`;
2. `SecurityContext`;
3. `platformId`;
4. URL retornada por `i3DXCompassServices.getServiceUrl('3DSpace')`;
5. URL de `3DSpace` verificada;
6. alerta se a URL verificada apontar para IFWE;
7. endpoint CSRF;
8. contexto do Product Structure Explorer;
9. `physicalId` resolvido;
10. endpoint `dseng:EngItem`;
11. primeira pagina de `dseng:EngInstance` com `$skip=0` e `$top=5`;
12. tentativa separada de `dspfl:PhysicalProduct` apenas como resolutor de EngItem para IDs `prd-`, sem virar fallback silencioso.

## Como foi feito

- `api-diagnostic.js` foi reescrito para ter passos independentes e relatorio textual no painel Avancado.
- `enovia-api.js` passou a expor construtores de URL para o diagnostico mostrar exatamente o endpoint testado.
- `waf-client.js` passou a preservar a mensagem original quando reclassifica erro de `dseng:EngItem`, para nao perder status HTTP no relatorio.
- `scripts/build-bundle-node.js` agora inclui `assets/js/services/api-diagnostic.js` no bundle gerado.
- `config.js`, `widget-boot.html`, `widget-boot.js` e `build-id.js` foram atualizados para o build `bom20260606g`.

## Testes locais executados

Comandos executados:

```powershell
node --check assets/js/services/api-diagnostic.js
node --check assets/js/platform/waf-client.js
node --check assets/js/integration/enovia-api.js
node --check assets/js/config.js
node --check scripts/build-bundle-node.js
node scripts/build-bundle-node.js
rg -n "services/api-diagnostic|Diagnostico isolado|bom20260606g|EngInstance page 0" assets/js/bom-bundle.js assets/js/bom-bundle-bom20260606g.js assets/js/build-id.js widget-boot.html assets/js/widget-boot.js
```

Resultado:

- sintaxe JavaScript validada;
- bundle regenerado com sucesso;
- `ApiDiagnostic` confirmado dentro de `assets/js/bom-bundle.js`;
- bundle versionado `assets/js/bom-bundle-bom20260606g.js` criado;
- `assets/js/build-id.js` aponta para `bom20260606g`.

## Teste no tenant real

Este teste ainda depende do 3DDashboard autenticado.

Procedimento:

1. Abrir `widget-boot.html` como Additional App.
2. Abrir o Product Structure Explorer ao lado.
3. Abrir um dos quatro casos reais.
4. No widget, abrir `Avancado`.
5. Clicar `Diagnosticar API`.
6. Copiar o texto do relatorio.
7. Repetir para:
   - 1 item com 2 corpos;
   - 3 itens;
   - 20 itens;
   - 79 itens.

Para cada caso, registrar:

- raiz detectada;
- `physicalId` resolvido;
- URL de 3DSpace;
- status do CSRF;
- status do `dseng:EngItem`;
- status e quantidade do `dseng:EngInstance page 0`;
- se apareceu URL IFWE como 3DSpace;
- erros `404`, `406`, `CORS` ou timeout.

### Resultado recebido - caso 20 itens / Drone

Data do teste: 2026-06-04

Caso testado:

- Estrutura: `01_SKA_Drone Assembly_130520206`
- Esperado pelo Explorer: `20`
- `physicalId`: `prd-R1132100929518-01172440`
- Build: `bom20260606g`

Procedimento executado pelo usuario:

1. Abrir a estrutura no Product Structure Explorer.
2. Executar `Ctrl+A`.
3. Executar `Ctrl+C`.
4. Clicar `Atualizar estrutura`.
5. Abrir `Avancado`.
6. Clicar `Diagnosticar API`.

Relatorio resumido:

```text
OK    WAFData - authenticatedRequest disponivel
OK    SecurityContext - ctx::VPLMProjectLeader.Company Name.CS_IMPLANTACAO
OK    platformId - R1132100929518
OK    Compass getServiceUrl(3DSpace) - https://r1132100929518-us1-space.3dexperience.3ds.com/enovia
OK    3DSpace verificado - https://r1132100929518-us1-space.3dexperience.3ds.com/enovia
OK    CSRF URL - https://r1132100929518-us1-space.3dexperience.3ds.com/enovia/resources/v1/application/CSRF
FAIL  CSRF GET - sem token (status 200)
OK    Estrutura - 01_SKA_Drone Assembly_130520206 - expected 20 - physicalId prd-R1132100929518-01172440
OK    physicalId - prd-R1132100929518-01172440
FAIL  dseng:EngItem GET - Rede bloqueou *-space
FAIL  dseng:EngInstance page 0 GET - Rede bloqueou *-space
FAIL  dspfl:PhysicalProduct resolver GET - Rede bloqueou *-space
```

Leitura tecnica:

- O Additional App esta com `WAFData` disponivel.
- O `SecurityContext` foi resolvido.
- O `platformId` foi resolvido.
- `i3DXCompassServices.getServiceUrl('3DSpace')` retornou o host correto `*-space`.
- O diagnostico nao caiu em IFWE como 3DSpace.
- O endpoint CSRF respondeu `200`, mas sem token extraido. Para GET isso nao bloqueia obrigatoriamente, mas deve ser mantido no diagnostico.
- A falha real comeca nos recursos `modeler`: `dseng:EngItem`, `dseng:EngInstance` e `dspfl:PhysicalProduct`.
- A Sprint 02 nao pode iniciar ainda, porque nao ha evidencia de endpoint de raiz/filhos funcionando.
- O contexto do teste foi preparado pelo fluxo paliativo `Ctrl+A/Ctrl+C + Atualizar estrutura`; portanto este teste diagnostica a API com a estrutura ja aberta e conhecida, mas nao valida carga automatica sem clipboard.

Conclusao:

O problema atual nao e mais "base URL errada". A base `3DSpace` esta correta. O proximo passo deve investigar por que chamadas `modeler` via `WAFData.authenticatedRequest` para `*-space` falham como bloqueio/rede no Additional App.

Hipoteses abertas:

- headers/opcoes do `WAFData.authenticatedRequest` podem estar inadequados para recursos `modeler`;
- o retorno real pode nao estar sendo capturado pelo diagnostico atual;
- pode haver exigencia especifica de rota, permissao, role/licenca ou formato para `dseng` no tenant;
- pode haver diferenca entre endpoint documentado e endpoint aceito neste FD/tenant;
- `SecurityContext` pode estar valido para dashboard, mas insuficiente para o modeler testado.

Acao recomendada antes da Sprint 02:

- ampliar o diagnostico para testar variantes controladas de request, sem alterar o fluxo principal:
  - headers minimos versus headers completos;
  - resposta `json` versus `text`;
  - GET de recurso `modeler` simples;
  - captura da mensagem bruta de `WAFData.onFailure`;
  - registrar se a falha e HTTP real, CORS, timeout ou `ResponseCode 0`.

## Criterio para avancar para Sprint 02

A Sprint 02 so deve iniciar quando houver evidencia para uma destas situacoes:

- `dseng:EngItem` e `dseng:EngInstance` funcionam para os casos reais; ou
- `dseng:EngItem` falha, mas `dspfl:PhysicalProduct` resolve um EngItem real e este EngItem permite `dseng:EngInstance`; ou
- a documentacao/tenant mostra outro endpoint correto para raiz/filhos, com erro atual explicado.

Sem essa evidencia, qualquer carga API-first seria chute.

## Referencias consultadas

- Link oficial informado pelo usuario: `https://media.3ds.com/support/documentation/developer/Cloud/FD02/en/DSDoc.htm?show=CAAiamREST/CAATciamRESTToc.htm`
- Portal Dassault Systemes de suporte cloud/documentacao.
- Referencia CAA/Widget sobre `WAFData.authenticatedRequest` e `i3DXCompassServices.getServiceUrl`.

Observacao: o link FD02 pode exigir login/permissao. O teste final deve validar no tenant real.
