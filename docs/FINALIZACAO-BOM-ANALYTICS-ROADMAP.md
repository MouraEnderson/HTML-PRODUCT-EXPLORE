# Finalizacao BOM Analytics

## Release oficial

- Link unico: `https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-v3.html`
- Entrypoint: `widget-v3.html`
- Build: definido exclusivamente por `assets/js/build-id.js`
- Controller: `assets/js/bom-waf-session-controller-bom20260621e.js`

O parametro `cacheBust` ou `v` apenas invalida cache. Ele nao escolhe outro
arquivo de bundle. O arquivo carregado sempre e
`assets/js/bom-bundle-<build-id>.js`.

## Contratos entregues

### Root

1. Contexto oficial por PlatformAPI/DSSelection.
2. ID dseng valido, ou `prd` resolvido para EngItem, ou busca UQL exata.
3. Registry CJ apenas com contexto CJ confirmado.
4. Falha de root deixa a tabela vazia e mostra diagnostico; nao troca para CJ.

### E-BOM

- WAFData autenticado, SecurityContext e CSRF.
- Expand dseng oficial.
- Estado unico com ocorrencia, referencia, instancia, pai, nivel, caminho e
  propriedades.
- Sem TSV, clipboard, snapshot, Render CAS ou espelho DOM no bundle oficial.
- Renderizacao incremental para estruturas grandes, sem descarte no estado.

### Selecao

- A linha selecionada exibe Reference ID, Instance ID, revisao, owner,
  maturidade, path e nivel quando recebidos no payload.
- 3DView: bloqueado ate existir geometry resolver, ticket/FCS e formato
  renderizavel reais.
- Maturidade write: bloqueada ate existir endpoint de transicao e releitura.

## Validacao obrigatoria no Additional App

1. Recentes: sincronizar deve informar ausencia de montagem ativa e nao usar CJ.
2. SKA: sincronizar deve manter titulo/root SKA e nao usar registry CJ.
3. CJ: pode usar registry somente quando CJ for a montagem aberta.
4. Troca CJ -> SKA -> CJ: cada sincronizacao deve limpar estado anterior.
5. Linha filha: conferir IDs, owner, revisao, maturidade, path e nivel.

## Validacao publica da release

Verificar HTTP 200 para:

```text
/assets/js/build-id.js
/assets/js/bom-bundle-<build-id>.js
/widget-v3.html
```

Depois, no runtime autenticado:

```js
window.__bomWafSessionController.getState()
```

Deve retornar controller, `activeEntrypoint`, `activeBuild`, `bundleLoaded` e
`legacyOperationalHandlers: 0`.
