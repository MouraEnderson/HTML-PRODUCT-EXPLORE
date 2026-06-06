# Sprint 26 - Fonte unica no botao Atualizar estrutura

Data: 2026-06-06

Build: `bom20260606zg`

## Problema

O botao `Atualizar estrutura` ainda podia cair em caminhos concorrentes:

- API parcial por `dseng`;
- TSV/auto-copy;
- DOM mirror;
- fallback em cascata.

Isso gerava resultados aparentemente carregados, mas errados, como `37/50`, `78/79`, colunas divergentes e troca de estrutura com dados antigos.

## Decisao

O botao `Atualizar estrutura` passa a usar uma fonte unica:

```text
TSV completo copiado/colado do Product Structure Explorer -> parser -> normalizador -> E-BOM
```

O botao nao tenta mais corrigir falha com API, DOM mirror ou fallback escondido.

## Implementacao

- `assets/js/config.js`
  - build atualizado para `bom20260606zg`;
  - `DOM_MIRROR_FALLBACK: false`;
  - `PASTE_TRAP_ENABLED: true`;
  - `SKIP_CLIPBOARD_READ: false`.
- `assets/js/app.js`
  - botao manual chama `BomOrchestrator.refreshStructure` com:
    - `forceLoader: 'paste'`;
    - `allowAutoCopy: false`;
    - `allowPartial: false`;
    - `allowFallback: false`.
- `assets/js/services/bom-orchestrator.js`
  - refresh manual usa `paste` como fonte unica;
  - fallback manual so roda se `allowFallback === true`.
- `assets/js/services/paste-bom-loader.js`
  - reescrito para validar antes de aplicar;
  - rejeita TSV parcial quando a contagem do Explorer esta disponivel;
  - aplica somente via `BomSnapshot.applyPayload`.

## Como testar no 3DDashboard

1. Abrir uma estrutura no Product Structure Explorer.
2. Expandir todos os niveis que devem entrar na E-BOM.
3. Selecionar a grade inteira do Explorer.
4. `Ctrl+A`.
5. `Ctrl+C`.
6. Clicar no widget BOM Analytics.
7. Clicar `Atualizar estrutura`.

Resultado esperado:

- Se o TSV tiver a mesma contagem do Explorer, carrega a E-BOM.
- Se o TSV estiver parcial, o app mostra erro `TSV incompleto X/Y` e nao aprova parcial como sucesso.
- Se trocar a estrutura no Explorer, repetir o procedimento deve limpar a anterior e carregar a nova.

## Criterios de aceite

- Caso 20 itens: precisa carregar `20/20`.
- Caso 50 itens: precisa carregar `50/50`.
- Caso 79 itens: precisa carregar `79/79`.
- Se copiar apenas linhas visiveis/virtuais, o app deve falhar claramente, nao mostrar parcial como OK.
- Console nao deve ter cascata nova de `dseng` ou DOM mirror causada pelo botao.

## Limitacao assumida

Esta sprint nao resolve leitura automatica sem transferencia de dados pelo usuario. Isso permanece bloqueado ate encontrarmos contrato oficial que entregue a relacao pai -> instancia -> filho real, conforme `docs/ANALISE-CONTRATO-EBOM-2026-06-06.md`.

## Proximo passo

Executar diagnostico relacional isolado para procurar endpoint/mask/include que entregue o filho real de cada `EngInstance`.
