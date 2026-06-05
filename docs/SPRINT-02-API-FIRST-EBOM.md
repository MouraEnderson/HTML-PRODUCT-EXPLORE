# Sprint 02 - API-first E-BOM

Data: 2026-06-06  
Build: `bom20260606w`

## Problema

O fluxo principal ainda dependia do paliativo `Ctrl+A`, `Ctrl+C`, foco na area de cola e `Atualizar estrutura`. Isso carregava alguns cenarios, mas nao era aceitavel como produto porque dependia de selecao manual, colunas visiveis, scroll, idioma, foco do navegador e tamanho da estrutura.

Nos testes anteriores tambem foi confirmado que chamadas diretas para:

```text
/resources/v1/modeler/dseng/dseng:EngItem/prd-...
```

retornavam `404`, porque `prd-*` nao e o identificador aceito pelo endpoint `dseng:EngItem/{id}`.

## Entrega

Esta sprint transforma o caminho API em fluxo primario:

1. O `prd-*` da estrutura e resolvido via busca UQL no `dseng`.
2. O app passa a carregar a raiz pelo ID real `dseng` retornado pela busca.
3. Os filhos `VPMInstance` sao resolvidos para o `VPMReference` real pelo nome da instancia sem sufixo de ocorrencia (`<1>` ou `.1`).
4. A cola/clipboard permanece como fallback, nao como primeira opcao quando a API esta disponivel.
5. A divergencia entre contagem do Explorer e contagem API deixa de derrubar a carga automaticamente, porque o Explorer pode contar ocorrencias/selecionados enquanto o `dseng` retorna E-BOM unica.
6. O limite artificial de `50.000` nos foi removido do config e elevado para `1.000.000` como guarda tecnica.

## Arquivos alterados

- `assets/js/integration/enovia-api.js`
  - Adicionada busca UQL `?$searchStr=`.
  - Adicionado resolvedor `prd-* -> EngItem dseng`.
  - `getProductRoot()` passa a resolver `prd-*` antes de tentar endpoint direto.

- `assets/js/services/bom-service.js`
  - `VPMInstance` nao entra mais como item falso quando falta referencia expandida.
  - Instancias sao resolvidas por `label:"<nome sem ocorrencia>"`.
  - Mantido fallback por linha marcada como instancia nao resolvida se a busca falhar.

- `assets/js/services/bom-orchestrator.js`
  - Atualizacao automatica e manual preferem API quando existe contexto valido.
  - Cola passa a ser fallback ou escolha forcada.

- `assets/js/services/api-bom-loader.js`
  - Removido bloqueio que rejeitava API quando a contagem era menor que a do Explorer.
  - Mensagem passa a sinalizar possivel diferenca entre E-BOM unica e ocorrencias/selecionados.

- `assets/js/config.js`
  - Build `bom20260606w`.
  - API passa a ser preferida no auto-sync.
  - Limite tecnico elevado para `1.000.000`.

## Hotfix bom20260606u

O build `bom20260606t` tinha o loader API implementado, mas o botao principal `Atualizar estrutura` ainda chamava o orquestrador com:

```text
preferApi: false
forceLoader: paste
```

Isso fazia o comportamento parecer igual no teste real. No `bom20260606u`, o botao principal passa a usar:

```text
preferApi: true quando o contexto permitir API
sem forceLoader paste
```

Assim a cola fica no fallback do orquestrador, nao no caminho principal do botao.

## Hotfix bom20260606v

O teste do `bom20260606u` confirmou que a API passou a ser chamada, mas o navegador bloqueou o preflight CORS:

```text
Request header field x-csrf-token is not allowed by Access-Control-Allow-Headers
```

Para GETs REST `dseng`, o cliente principal agora usa headers minimos:

```text
Accept: application/json
SecurityContext: <ctx quando disponivel>
```

O header `X-CSRF-Token` deixou de ser enviado em GET. Ele permanece reservado para chamadas mutaveis futuras.

## Hotfix bom20260606w

O teste do `bom20260606v` carregou pela API, mas mostrou `8/20` porque o modelo interno colapsava ocorrencias iguais pelo mesmo ID da referencia `dseng`.

No `bom20260606w`:

- cada `VPMInstance` vira uma linha propria na E-BOM;
- a linha usa o ID da instancia como `physicalid`;
- o item real fica em `referencePhysicalId`;
- a busca de filhos usa `bomChildrenId/referencePhysicalId`;
- `prd-*` fica em `sourcePhysicalId`;
- a coluna `Titulo` passa a mostrar o nome legivel (`title` do ENOVIA), nao o `prd-*`.

Isso prepara tambem o caminho do 3D: a selecao da linha sabe qual e a ocorrencia e qual e a referencia real.

## Como testar

1. Abrir no Additional App:

```text
https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-boot.html
```

2. Abrir uma estrutura no Product Structure Explorer ao lado do widget.
3. Sem usar `Ctrl+A`/`Ctrl+C`, clicar em `Atualizar estrutura`.
4. Resultado esperado:
   - app resolve a raiz automaticamente;
   - carrega a E-BOM pela API;
   - nao aparecem chamadas diretas `EngItem/prd-*` como caminho principal;
   - se houver diferenca de contagem, a carga nao e abortada.

## Criterio de aceite

- Estrutura com `prd-R1132100929518-01172440` deve resolver para o EngItem `132FB3CE26D70E006A18D1870000316D`.
- O primeiro nivel deve carregar filhos reais como `01_SKA_Arm Gear of Drone_130520206`, `01_SKA_Gearing of Drone_130520206`, `01_SKA_Beater Disc_130520206`, `01_SKA_Leg_130520206` e `01_SKA_Frame_130520206`.
- O fluxo manual por cola continua disponivel apenas como contingencia.

## Pendencias

- A contagem `20` do Explorer versus `6` no caminho API precisa ser tratada como modelo de ocorrencias/duplicidade, nao como erro HTTP.
- Para projetos muito grandes, o proximo gargalo sera renderizacao/virtualizacao de tabela, nao endpoint.
- O viewer 3D proprio ainda depende da proxima sprint: resolver representacoes/arquivos/derived output e renderizar com Three.js.
