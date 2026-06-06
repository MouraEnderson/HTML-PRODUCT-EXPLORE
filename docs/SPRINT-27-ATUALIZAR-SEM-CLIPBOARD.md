# Sprint 27 - Atualizar estrutura sem clipboard

Data: 2026-06-06
Build: `bom20260606zh`

## Problema

O botao principal `Atualizar estrutura` ainda tratava o fluxo de cola/clipboard como caminho de produto. Isso fazia o app parecer funcional apenas quando o usuario usava `Ctrl+A`, `Ctrl+C`, `Ctrl+V`, o que nao atende ao objetivo do projeto.

## Decisao

O fluxo principal do produto passa a ser:

1. usuario abre/expande a estrutura no Product Structure Explorer;
2. usuario clica `Atualizar estrutura`;
3. o app tenta ler a grade/espelho/scroll do Explorer;
4. se a leitura nao fechar com a contagem do Explorer, o app falha de forma clara;
5. clipboard/paste fica desativado como caminho principal.

## Alteracoes

- `ALLOW_PASTE_FALLBACK: false`
- `PASTE_TRAP_ENABLED: false`
- `SKIP_CLIPBOARD_READ: true`
- `USE_DOM_MIRROR_PRIMARY: true`
- `DOM_MIRROR_FALLBACK: true`
- `Atualizar estrutura` nao envia mais `forceLoader: 'paste'`
- loader automatico segue `mirror -> scroll harvest`, sem buscar clipboard
- scroll harvest escolhe melhor scroller do Explorer e tolera mais passos antes de concluir
- teste de aceite falha se o fluxo principal voltar a forcar paste

## Testes locais

Comando:

```powershell
node scripts\build-bundle-node.js
node -e "const fs=require('fs'); new Function(fs.readFileSync('assets/js/bom-bundle.js','utf8')); new Function(fs.readFileSync('assets/js/bom-bundle-bom20260606zh.js','utf8')); console.log('syntax ok')"
node scripts\test-acceptance-sprint25.js
```

Resultado antes do push:

- bundle gerado: OK
- sintaxe JavaScript: OK
- aceite local de politica sem paste: OK
- GitHub Pages: pendente ate publicar o commit

## Criterio de aceite no 3DX

O teste correto agora e:

1. abrir uma estrutura no Product Structure Explorer;
2. expandir os niveis desejados;
3. clicar `Atualizar estrutura`;
4. validar se o app carrega a contagem esperada sem `Ctrl+C`, sem `Ctrl+V` e sem caixa de cola.

Se a grade virtualizada do Explorer nao entregar todas as linhas ao scroll automatico, o app deve mostrar parcial/erro. Esse caso deixa de ser tratado como sucesso.
