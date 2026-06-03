# Testes 3DX - Resultados Atuais

Data: 2026-06-03

## Ambiente

- Produto: BOM Analytics em 3DDashboard Additional App.
- Build: `bom20260606f`.
- URL de teste: `widget-boot.html`.
- Escopo atual: GitHub Pages + Additional App + WAFData + 3DSpace REST.

## Resultado - fallback manual controlado

Status: aprovado como contingencia.

Procedimento validado pelo usuario:

1. Abrir estrutura no Product Structure Explorer.
2. No Explorer: `Ctrl+A`, `Ctrl+C`.
3. No widget: abrir/clicar na area de cola.
4. No widget: `Ctrl+V`.
5. Clicar `Atualizar estrutura`.

Resultado observado:

- App carregou E-BOM por TSV/cola.
- Banner: `TSV 19/19 - sincronizado`.
- Tabela E-BOM exibiu 19 linhas.
- `getpicture` automatico nao bloqueou a importacao.
- Auto-copy/paste trap programatico foi desativado por configuracao.

Observacao:

- O Product Structure Explorer indicou 20 selecionados na barra inferior, enquanto o widget recebeu 19 linhas no TSV. Isso deve ser validado antes de considerar o caso "20 itens" como aceite pleno, pois pode ser diferenca entre item selecionado/visivel, raiz omitida no TSV ou linha nao copiada.

## Resultado - estrutura grande

Status: aprovado como contingencia, com observacao de parser.

Resultado observado pelo usuario:

- Estrutura SKA carregou via fallback manual.
- Banner: `TSV 78/78 - sincronizado`.
- Tabela E-BOM exibiu 78 linhas.
- Explorer indicava `79 de 79 selecionado`.

Observacao:

- A coluna `Proprietario` do widget estava recebendo textos de componente/descricao, enquanto o Explorer exibia `Enderson Moura`.
- Ajuste aplicado no parser TSV: nomes tecnicos de componente deixam de ser aceitos como proprietario por heuristica. Quando houver coluna `Proprietario`, ela deve prevalecer.

## Estado tecnico validado

- `PASTE_TRAP_ENABLED: false`.
- `EXPLORER_AUTO_COPY_ENABLED: false`.
- `MEDIA.AUTO_LOAD_THUMBNAILS: false`.
- `MEDIA.BUILD_GETPICTURE_URLS: false`.

Essas travas mantem o fallback manual previsivel e reduzem chamadas automaticas que geravam ruido no Network.

## Pendencias de aceite

- Validar Mont10: 3/3.
- Validar Drone/SKA pequeno: esperado 20/20 ou explicar diferenca 19/20.
- Validar estrutura grande: 79/79 ou mensagem clara de limitacao.
- Reativar objetivo principal API-first via `dseng`, sem depender de Ctrl+C/Ctrl+V.
- Separar pipeline de visualizacao 3D proprio, sem widget 3DPlay.
