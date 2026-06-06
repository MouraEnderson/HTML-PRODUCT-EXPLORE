# Analise de contrato E-BOM - 2026-06-06

## Objetivo

Registrar o que os testes reais provaram sobre a leitura de estrutura E-BOM no 3DEXPERIENCE e separar fato, hipotese e decisao tecnica. Este documento congela a direcao para evitar novas tentativas por chute.

## Escopo do produto

- Repositorio correto: `MouraEnderson/HTML-PRODUCT-EXPLORE`.
- Runtime: Additional App no 3DDashboard, publicado via GitHub Pages.
- Fora do produto: Web Page Reader, deploy admin/webapps na plataforma 3DX e 3DPlay como solucao final.
- Requisito funcional: ler a estrutura aberta no Product Structure Explorer, sem limite funcional de itens, e futuramente exibir 3D proprio ao selecionar item da E-BOM.

## Evidencias das ultimas coletas

### Caso 50 itens - CJ MESA 4BCS VP TOP 3DX

- Esperado no Product Structure Explorer: `50 objetos`.
- Raiz visual: `CJ MESA 4BCS VP TOP 3DX`.
- `physicalId` visual: `prd-R1132100929518-01103695`.
- `WAFData`, `SecurityContext`, `platformId`, `Compass getServiceUrl(3DSpace)` e `CSRF` funcionaram.
- `GET dseng:EngItem/prd-R1132100929518-01103695` retornou `404`.
- Busca UQL por `name:prd-R1132100929518-01103695` encontrou o ID interno `63FC553465A62400699E0792000086AB`.
- `GET dseng:EngItem/{id32}/dseng:EngInstance` retornou somente instancias diretas.
- Mesmo com `$expand=dseng:EngItem` e `$expand=dseng:referencedObject`, o payload continuou sem o filho referenciado.
- A resolucao por label gerou ambiguidade em nomes como `Tampo`, `Queimador` e `Manipulo`.

### Caso 79 itens - SKA_ENDERSW-BES-00009887

- Esperado no Product Structure Explorer: `79 objetos`.
- Raiz visual: `SKA_ENDERSW-BES-00009887`.
- `physicalId` visual: `prd-R1132100929518-00662677`.
- `WAFData`, `SecurityContext`, `platformId`, `Compass getServiceUrl(3DSpace)` e `CSRF` funcionaram.
- `GET dseng:EngItem/prd-R1132100929518-00662677` retornou `404`.
- Busca UQL por `name:prd-R1132100929518-00662677` encontrou o ID interno `0A558407DC10060066C734B7000022CF`.
- `GET dseng:EngItem/{id32}/dseng:EngInstance` retornou ocorrencias como `SKA_ENDERxcadmodel00032170<1>(Montagem BES)`.
- Busca por label dessas ocorrencias retornou `0` candidatos.
- O payload de `EngInstance` tambem nao trouxe o filho referenciado.

## O que a documentacao e fontes externas indicam

1. `dseng` e a familia correta para Engineering Web Services em Cloud, mas o endpoint `EngItem/{ID}` trabalha com ID interno do recurso. As coletas confirmam que `prd-R...` deve ser resolvido antes por busca UQL.
2. Os exemplos publicos de custom widget usam `WAFData.authenticatedRequest` para chamadas autenticadas. Portanto, o caminho WAFData/Compass/3DSpace esta correto.
3. A documentacao e SDKs publicos citam mascara/atributos como parte do contrato. Isso significa que uma chamada pode retornar menos atributos do que o necessario se a mascara/endpoint nao incluir relacionamento.
4. A politica de mesma origem do navegador limita leitura direta de outro iframe/widget. Portanto, um widget GitHub Pages nao pode depender de inspecionar livremente a grade do Product Structure Explorer.
5. A Clipboard API tambem depende de permissao/acao do usuario. Portanto, `Ctrl+A/Ctrl+C/Ctrl+V` nao pode ser vendido como automatico invisivel.

Fontes consultadas:

- https://github.com/3ds-cpe-emed/ws3dx-dotnet
- https://github.com/3ds-cpe-emed/ds-3dx-custom-widget-samples
- https://3dswym.3dexperience.3ds.com/en/wiki/delmia-process-engineering/get-configuration-context-criteria-on-mfg-item-system-engg-item-and-resources__zekCIcKTIKkyfuexsbZ7Q
- https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy
- https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API

## Diagnostico final

O problema atual nao e base URL, CSRF, WAFData, `platformId`, clique no botao, grafico, layout ou limite simples de linhas.

O problema atual e de contrato relacional:

```text
Product Structure Explorer conhece a arvore real
dseng:EngItem/{id32}/dseng:EngInstance retorna VPMInstance
payload atual nao traz o filho referenciado
codigo tenta resolver filho por nome/label
label nao e identidade unica
resultado fica parcial ou errado
```

## Caminhos reprovados

| Caminho | Motivo da reprova |
|---|---|
| `prd-R...` direto em `dseng:EngItem/{ID}` | retorna `404`; o endpoint espera ID interno do recurso |
| Resolver filho por label da instancia | label e ambiguo ou nao existe como EngItem pesquisavel |
| DOM mirror do Explorer como fonte escalavel | outro widget/iframe e grid virtualizada nao garantem todos os itens |
| Auto-sync tentando ler enquanto o Explorer expande | gera parcial, corrida e estado antigo |
| Fallbacks em cascata alterando a mesma estrutura | mascara falhas e cria resultados inconsistentes |
| Iniciar 3DView antes de IDs estaveis | viewer precisa do objeto real/representacao, nao de linha ambigua |

## Caminhos ainda possiveis

### Caminho A - Endpoint relacional oficial

Continuar API-first somente se encontrarmos e provarmos um endpoint, mascara ou include que retorne pai real, instancia/ocorrencia, filho referenciado real, metadados do filho, paginacao e IDs estaveis para pipeline 3D.

### Caminho B - Canal oficial do dashboard/Explorer

Usar selecao, contexto ou mensagem oficial do 3DDashboard/Product Structure Explorer se existir documentacao/contrato acessivel que entregue a estrutura ou os IDs selecionados.

### Caminho C - Importacao explicita como MVP honesto

Assumir temporariamente que o usuario/exportacao transfere os dados para o app:

```text
Explorer expandido/exportado/copied data -> widget -> normalizador unico -> E-BOM
```

Esse caminho nao e o produto final desejado, mas pode entregar valor com previsibilidade enquanto o contrato API correto nao e fechado.

## Nova regra de desenvolvimento

Nenhuma alteracao de loader deve ser feita sem antes responder:

1. Qual e a fonte unica dos dados?
2. O contrato dessa fonte entrega pai, filho real, revisao, proprietario, maturidade e ID estavel?
3. O teste prova 20/20, 50/50 e 79/79?
4. O resultado substitui a estrutura anterior quando o Explorer troca de projeto?
5. Existe fallback escondido alterando a mesma estrutura?

Se uma resposta for "nao", a tarefa volta para diagnostico, nao para implementacao.

## Proximo passo recomendado

Criar um diagnostico pequeno e isolado, sem alterar a UI principal, para testar somente estes contratos:

1. resolver raiz por `name:prd-R...`;
2. buscar filhos diretos por `dseng:EngInstance`;
3. testar variantes documentadas de mask/include/expand;
4. registrar se aparece algum campo de referencia real para o filho;
5. se nao aparecer, marcar `dseng:EngInstance` como insuficiente para arvore completa neste tenant/build.

O objetivo do proximo teste nao e carregar grafico. E provar ou reprovar o contrato que sustenta a E-BOM e o futuro 3DView.
