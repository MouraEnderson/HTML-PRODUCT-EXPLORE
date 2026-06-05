# Sprint 04 - carga manual controlada

Build: `bom20260606y`

## Problema tratado

O reconhecimento automatico ficava tentando carregar a estrutura enquanto o Product Structure Explorer ainda estava abrindo ou expandindo a arvore. Isso gerava leituras parciais, como `0/50`, e registrava estado incompleto antes do usuario concluir a navegacao no Explorer.

## Decisao

O botao `Atualizar estrutura` passa a ser o unico gatilho de carga real da E-BOM.

## Entrega

- Desligado `AUTO_SYNC_EXPLORER_MS`.
- Desligado `AUTO_REFRESH_ON_STRUCTURE_CHANGE`.
- Desligado `EXPLORER_MIRROR_AUTO_SYNC`.
- Desligados gatilhos automaticos de copy/sync.
- Removida carga automatica no bootstrap/watchdog.
- Removida carga automatica apos paste.
- Mantida observacao leve de contexto para atualizar nome/status da estrutura sem carregar E-BOM.

## Fluxo esperado

1. Abrir a estrutura no Product Structure Explorer.
2. Expandir os niveis necessarios.
3. Clicar `Atualizar estrutura`.
4. O app tenta API e, se necessario, fallback controlado.

## Criterio de aceite

- Ao abrir estrutura, o app nao deve iniciar carga E-BOM sozinho.
- Ao colar dados, o app nao deve importar sozinho.
- A carga acontece somente apos clique no botao `Atualizar estrutura`.
- O caso 50 itens nao deve entrar em tentativas empilhadas antes da estrutura estar expandida.
