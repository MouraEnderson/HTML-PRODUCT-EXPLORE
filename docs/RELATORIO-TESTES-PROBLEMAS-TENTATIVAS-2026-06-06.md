# Relatorio de testes, problemas e tentativas - 2026-06-06

## Objetivo

Registrar, sem nova alteracao de codigo, o que foi testado no app BOM Analytics, quais problemas permanecem, quais tentativas foram aplicadas e qual conclusao tecnica existe hoje. Este documento foi criado apos a decisao de parar implementacoes e consolidar os fatos.

## Escopo confirmado do produto

- Repositorio: `MouraEnderson/HTML-PRODUCT-EXPLORE`.
- Publicacao: GitHub Pages.
- Execucao: Additional App no 3DDashboard.
- APIs previstas: WAFData, i3DXCompassServices, 3DSpace REST.
- Fora do produto: Web Page Reader, deploy admin/webapps na plataforma 3DX e 3DPlay como solucao final.
- Fluxo esperado: usuario abre/expande a estrutura no Product Structure Explorer e clica em `Atualizar estrutura`.
- Fluxo rejeitado como produto: `Ctrl+A`, `Ctrl+C`, `Ctrl+V` e depois atualizar. Esse fluxo funcionou como contingencia em alguns testes, mas nao e aceitavel como entrega final.

## Requisitos funcionais que precisam ser preservados

1. O app nao pode ter limite funcional de itens. Deve suportar de 1 item ate estruturas muito grandes, incluindo centenas de milhares de itens, usando paginacao/streaming/virtualizacao quando necessario.
2. Ao trocar a estrutura no Product Structure Explorer, o botao `Atualizar estrutura` deve carregar a nova estrutura, substituindo a anterior.
3. A E-BOM deve mostrar raiz, pais e filhos, nao apenas filhos diretos ou folhas.
4. As colunas principais precisam refletir o Explorer: titulo, descricao quando existir, revisao, proprietario e estado de maturidade.
5. O 3DView proprio deve depender da E-BOM: ao selecionar uma linha, o app precisa resolver o objeto real e renderizar o 3D dentro do app.
6. O 3DView nao deve depender de widget 3DPlay como solucao de produto.

## Builds e commits relevantes

| Build/commit | O que tentou resolver | Resultado observado |
|---|---|---|
| `bom20260606zi` / `131e6cc` | Fazer o botao `Atualizar estrutura` varrer o Explorer sem expor cola manual. | Removeu o caminho visual de cola, mas a leitura ainda ficou parcial em casos reais. |
| `bom20260606zj` / `8af317f` | Corrigir bug de escopo `physicalId is not defined` no diagnostico/API. | Bug corrigido; a falha principal continuou: caso 50 itens ficou parcial `37/50`. |

## Testes locais executados

- Build local executado apos alteracoes anteriores.
- Validacao sintatica JavaScript executada.
- Teste de aceitacao `scripts/test-acceptance-sprint25.js` retornou `9 pass, 1 warn, 0 fail` apos a build `bom20260606zj`.

Limitacao desses testes: eles validam estrutura de arquivos, build, presenca de build publicada e regras estaticas, mas nao provam a carga real da E-BOM no tenant 3DX, porque o dado vivo depende do Product Structure Explorer, do tenant e das APIs autenticadas.

## Testes reais reportados pelo usuario

### Caso 1 item

- A carga chegou a aparecer em alguns ciclos.
- O comportamento nao foi suficiente para validar o produto porque os problemas principais aparecem em estrutura com filhos, pais e multiplos niveis.

### Caso 20 itens - `01_SKA_Drone Assembly_130520206`

- O Explorer mostrava `20 objetos`.
- O app chegou a carregar `20/20` via API em uma build posterior.
- Houve problemas anteriores de composicao da E-BOM:
  - raiz/pai descartado em alguns fluxos;
  - ordem divergente entre Explorer e E-BOM;
  - colunas de proprietario/revisao com valores inconsistentes em linhas especificas;
  - coluna `Tipo` foi considerada desnecessaria na grade principal.

### Caso 79 itens - `SKA_ENDERSW-BES-00009887`

- O Explorer mostrava `79 objetos`.
- Houve momentos em que o app carregou `78/79` ou `79/79`, dependendo do fluxo e da build.
- O fluxo manual por clipboard conseguiu bons resultados em algumas tentativas, mas foi rejeitado como produto.
- Foram observados problemas de metadados:
  - raiz com revisao/proprietario incorretos ou ausentes em alguns estados;
  - divergencia entre o que o Explorer mostra e o que a E-BOM mostra;
  - risco de resolver filho por label e pegar item errado.

### Caso 50 itens - `CJ MESA 4BCS VP TOP 3DX`

- O Explorer mostrava `50 objetos`.
- Build testada: `bom20260606zj`.
- Resultado atual do app: parcial `37/50`.
- Mensagem observada: API retornou parcial `37/50` e leitura do Explorer falhou/incompleta.
- O fluxo manual `Ctrl+A` / `Ctrl+V` chegou a carregar `50/50`, mas esse fluxo nao esta em cogitacao como produto.
- A leitura por botao ainda nao entrega a estrutura completa.

## Diagnostico da coleta anexada - caso 50 itens

Evidencias positivas:

- `WAFData.authenticatedRequest` disponivel.
- `SecurityContext` resolvido: `ctx::VPLMProjectLeader.Company Name.CS_IMPLANTACAO`.
- `platformId` resolvido: `R1132100929518`.
- `i3DXCompassServices.getServiceUrl('3DSpace')` retornou 3DSpace correto:
  `https://r1132100929518-us1-space.3dexperience.3ds.com/enovia`.
- CSRF URL correta e token recebido.
- Estrutura identificada:
  - titulo: `CJ MESA 4BCS VP TOP 3DX`;
  - esperado: `50`;
  - physicalId visual: `prd-R1132100929518-01103695`.

Evidencias negativas:

- `GET /resources/v1/modeler/dseng/dseng:EngItem/prd-R1132100929518-01103695` retornou `404`.
- `GET /resources/v1/modeler/dseng/dseng:EngItem/prd-R1132100929518-01103695/dseng:EngInstance` retornou `404`.
- `dspfl:PhysicalProduct/prd-R...` retornou `404`.
- `dsxcad:VPMReference/prd-R...` retornou `404`.
- `modeler/search` generico retornou `404`.

O que funcionou:

- `dseng:EngItem/search?$searchStr=label:"CJ MESA 4BCS VP TOP 3DX"` encontrou a raiz exata:
  - ID interno: `63FC553465A62400699E0792000086AB`;
  - name: `prd-R1132100929518-01103695`;
  - type: `VPMReference`.
- `dseng:EngItem/search?$searchStr=name:prd-R1132100929518-01103695` tambem encontrou a raiz exata.
- `GET dseng:EngItem/63FC553465A62400699E0792000086AB` funcionou.
- `GET dseng:EngItem/63FC553465A62400699E0792000086AB/dseng:EngInstance?$skip=0&$top=5` funcionou, mas retornou somente filhos diretos.

Ponto critico do contrato:

- As instancias retornadas sao `VPMInstance`.
- Variantes com `$expand=dseng:EngItem` e `$expand=dseng:referencedObject` nao trouxeram um campo confiavel com o filho referenciado.
- O diagnostico registrou `refFields=nenhum`.
- Resolver filhos por label nao e seguro:
  - `Queimador` retornou 3 candidatos exatos;
  - `Tampo` retornou 3 candidatos exatos;
  - alguns labels nao retornam o objeto esperado;
  - labels nao representam identidade unica.

## Problemas encontrados

1. O `prd-R...` visivel no Explorer nao e aceito como ID direto em `dseng:EngItem/{ID}`. Ele precisa ser resolvido para ID interno de 32 caracteres.
2. A API `dseng:EngInstance` esta retornando instancia/ocorrencia, mas nao o filho referenciado necessario para montar a arvore completa com seguranca.
3. O app ainda mistura caminhos de carga: API, leitura do Explorer/DOM, historico de TSV/clipboard e fallback. Isso aumenta chance de parcial parecer sucesso.
4. A leitura do Explorer por DOM e limitada por iframe, mesma origem, virtualizacao da grade e tempo de expansao da arvore.
5. Auto leitura em background foi fonte de corrida: tentava ler antes do Explorer terminar de expandir.
6. Mesmo com auto-sync desligado, a leitura por botao ainda depende de um contrato incompleto para fechar `50/50`.
7. As colunas da E-BOM ainda nao estao confiaveis em todos os cenarios, especialmente proprietario, revisao e maturidade quando a linha veio de instancia ou fallback.
8. O 3DView nao pode ser implementado corretamente enquanto a linha da E-BOM nao tiver identidade estavel do objeto real.
9. Os 404 de recursos de plataforma no console geram ruido, mas nem todos sao causa do problema. A falha principal e o contrato incompleto da estrutura.

## Tentativas aplicadas para corrigir

- Troca de base URL para `i3DXCompassServices.getServiceUrl('3DSpace', platformId)`.
- Remocao do uso indevido de IFWE como se fosse 3DSpace.
- Diagnosticos de WAFData, SecurityContext, platformId, 3DSpace e CSRF.
- Teste de chamadas diretas `dseng:EngItem/{prd-R...}`.
- Teste de chamadas diretas `dspfl:PhysicalProduct/{prd-R...}`.
- Teste de chamadas diretas `dsxcad:VPMReference/{prd-R...}`.
- Busca `dseng:EngItem/search` por texto livre.
- Busca UQL por `label:"..."`.
- Busca UQL por `name:prd-R...`.
- Chamada `dseng:EngItem/{id32}` apos resolver ID interno.
- Chamada `dseng:EngItem/{id32}/dseng:EngInstance` com paginacao.
- Variantes com `$expand=dseng:EngItem`.
- Variantes com `$expand=dseng:referencedObject`.
- Provas de resolucao de filhos por label.
- Tentativa de recursao com filhos resolvidos.
- Desligamento do auto-sync para evitar tentativa empilhada.
- Transformacao do botao `Atualizar estrutura` em fonte unica de acao do usuario.
- Ocultacao da UI visivel de cola manual.
- Correção do bug `physicalId is not defined` no diagnostico/API.

## O que as tentativas provaram

- Autenticacao, SecurityContext, platformId, CSRF e URL 3DSpace nao sao o bloqueio principal.
- O contrato REST atual consegue encontrar a raiz correta quando se usa UQL por `name:prd-R...`.
- `dseng:EngInstance` retorna filhos diretos como instancias, mas nao entrega a referencia real do filho no payload testado.
- Resolver por label e tecnicamente errado para produto, porque label e ambiguo.
- DOM/Explorer pode servir para diagnostico, mas nao e fonte confiavel para estrutura grande e automatica no modelo atual.
- O app ainda nao tem uma fonte unica, comprovada e escalavel para E-BOM completa.

## Estado atual

- Codigo nao foi alterado neste relatorio.
- Ultima build conhecida: `bom20260606zj`.
- Melhor resultado atual no caso 50 itens: parcial `37/50`.
- Fluxo manual por clipboard pode carregar `50/50`, mas esta explicitamente fora da entrega final.
- Produto ainda nao esta pronto para iniciar 3DView com confianca, pois a identidade do item da E-BOM ainda nao esta estavel em todos os cenarios.

## Conclusao tecnica

O projeto nao esta parado por grafico, layout ou por falta de clique no botao. O bloqueio real e obter, de forma confiavel e escalavel, a estrutura completa com pai, instancia, filho real e metadados corretos.

O contrato atualmente testado entrega:

```text
+ raiz resolvida por busca UQL
+ metadados basicos da raiz
+ lista de VPMInstance diretas
-- referencia real do filho dentro da instancia
-- arvore completa garantida
-- identidade segura para 3DView
```

Sem resolver esse contrato, qualquer nova tentativa tende a repetir paliativos: parcial, label ambiguo, DOM incompleto ou clipboard.

## Recomendacao para proxima retomada

Antes de qualquer nova implementacao, validar um unico contrato de dados que responda objetivamente:

1. Qual endpoint/mask/include devolve `VPMInstance -> VPMReference/EngItem filho`?
2. Como paginar a estrutura completa sem depender da grade visual?
3. Como diferenciar pai, instancia e representacao CAD/3DShape?
4. Como mapear cada linha da E-BOM para objeto real do 3DView?
5. Como provar `20/20`, `50/50`, `79/79` e `1 item com 2 corpos` sem clipboard?

Se esse contrato nao existir no cliente Additional App/GitHub Pages por limite da plataforma, a decisao tecnica deve mudar para uma destas opcoes:

- backend/proxy autorizado;
- widget/servico nativo dentro da plataforma 3DX;
- exportacao oficial/controlada como MVP temporario;
- acesso a documentacao/contrato Dassault especifico para expandir estrutura configurada.

## Criterios de aceite futuros

- Caso 20: carregar `20/20`, raiz incluida, pais e filhos corretos, colunas coerentes com Explorer.
- Caso 50: carregar `50/50` apenas pelo botao, sem clipboard.
- Caso 79: carregar `79/79` apenas pelo botao/API, sem perda da raiz.
- Caso 1 item com 2 corpos: identificar item e representacoes/corpos necessarios para o 3DView.
- Troca de projeto no Explorer: clicar `Atualizar estrutura` substitui a estrutura anterior pela nova.
- Nenhum sucesso parcial pode ser exibido como sincronizado.
- 3DView so inicia depois que a linha da E-BOM tiver ID real e tipo de objeto resolvido.
