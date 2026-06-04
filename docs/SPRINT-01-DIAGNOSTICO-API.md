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
