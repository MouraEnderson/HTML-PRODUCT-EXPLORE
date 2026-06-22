# Fase 1 - Contexto, Raiz e Contrato de Expansao

## Estado

Em validacao no Additional App autenticado. Esta fase nao altera layout, tabela,
graficos, 3DView, maturidade ou a arquitetura de bundle.

## Objetivo

Estabilizar a entrada do controller unico antes de qualquer trabalho de E-BOM
recursiva ou 3D:

1. identificar por que o contexto oficial chega vazio;
2. resolver uma raiz manual sem clipboard;
3. enviar uma expansao dseng com profundidade positiva e explicita;
4. registrar o formato da resposta sem registrar token, cookie, CSRF ou payload
   bruto.

## Evidencia autenticada anterior

No 3DDashboard autenticado em 2026-06-22, o Product Structure Explorer exibia:

- titulo: `SKA_ENDERSW-BES-00009887`;
- physical id visivel: `prd-R1132100929518-00662677`;
- contador do Explorer: `79 objects`.

Ao clicar `Atualizar estrutura`, o controller publicou
`root-resolution-failed`: o `ProductExplorerSyncProvider` devolveu selecao vazia.
O fato relevante e que a estrutura era visivel, mas a fonte oficial usada pelo
controller nao retornou raiz. Isso nao prova que a arvore dseng esta errada e
nao autoriza fallback para CJ MESA.

## Mudanca desta fase

Arquivo principal: `assets/js/bom-waf-session-controller-bom20260621e.js`.

- `probeContextSources()` registra disponibilidade de `require`, WAFData,
  ExplorerContext, frame incorporado e o retorno sanitizado do provider.
- a resolucao oficial passa pelo probe; assim uma tentativa pelo botao principal
  deixa evidencia de fonte, mesmo quando nao encontra raiz.
- `Varrer por ID` e ligado ao controller unico e aceita, no campo Avancado:
  ID interno dseng, `prd-R...` ou titulo exato.
- o fluxo manual nao consulta clipboard e nao usa registro CJ como fallback.
- `expandRootWithValidatedContract()` envia `expandDepth` positivo, com padrao
  `1`; a chamada anterior com `expandDepth: -1` foi removida do controller.
- o diagnostico de expansao registra endpoint, profundidade e somente a forma do
  payload (tipo, chaves e tamanhos de arrays).

## Limites deliberados

- O parser ainda nao foi reescrito nesta fase. A resposta real de `/expand`
  precisa ser capturada primeiro para que pai, ocorrencia e filho sejam lidos
  por campos contratuais, e nao por caminhada generica.
- `prd-R...` continua exigindo resolucao para ID interno dseng, conforme as
  evidencias em `docs/ANALISE-CONTRATO-EBOM-2026-06-06.md`.
- Esta fase nao declara que `expandDepth: 1` entrega arvore completa. Ela prova
  primeiro que o contrato autenticado responde e qual formato ele usa.

## Testes automatizados

Comando:

```powershell
node scripts/test-session-controller.js
```

Cobertura adicionada:

- alias Compass para 3DSpace continua disponivel;
- controller inicia sem erro de funcao ausente;
- identificacao de ID interno e de `prd-R...`;
- SKA nao e classificado como CJ;
- profundidade padrao e positiva;
- diagnostico de formato nao expõe conteudo de membros;
- o botao manual pertence ao controller;
- o controller nao contem `expandDepth: -1`.

## Validacao real obrigatoria

No Additional App autenticado:

1. Abrir Avancado e informar um ID interno dseng conhecido.
2. Clicar `Varrer por ID` e confirmar `manual-root-resolved` seguido de
   `expand-response` no diagnostico.
3. Repetir com um `prd-R...` conhecido.
4. Repetir com titulo exato nao ambiguo.
5. Abrir uma estrutura SKA e clicar `Atualizar estrutura`; confirmar que nao ha
   referencia nem fallback para CJ quando o contexto estiver vazio.

So depois de uma expansao real bem-sucedida sera definida a leitura especifica
do payload e a proxima fase sera aberta.

## Referencias

- `docs/ANALISE-CONTRATO-EBOM-2026-06-06.md`
- `docs/ANALISE-DOCS-DSENG-CASO-50.md`
- https://media.3ds.com/support/documentation/developer/Cloud/FD02/en/DSDoc.htm?show=CAAiamREST/CAATciamRESTToc.htm
- https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy

## Lacuna de documentacao do repositorio

O arquivo solicitado em orientacoes anteriores,
`DOCUMENTACAO-MESTRA-BOM-ANALYTICS-3DEXPERIENCE.md`, nao esta presente no
repositorio no momento desta fase. Este relatorio nao inventa seu conteudo;
ele registra apenas as evidencias e alteracoes verificadas no codigo atual.
