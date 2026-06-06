# Sprint 32 - Atualizar estrutura reflete o Explorer atual

Data: 2026-06-06
Build: `bom20260606zm`

## Problema observado

Nos testes do build `bom20260606zl`, a contagem nao ficou alinhada ao Product Structure Explorer quando o usuario expandia subconjuntos antes de clicar `Atualizar estrutura`.

Casos reportados:

- CJ MESA: Explorer mostrava `34 objetos`, mas o dashboard carregava `5/34`.
- SKA/Transportador: Explorer mostrava `113 objetos`, mas o dashboard carregava `78/113`.

O erro de produto era claro: o dashboard estava usando a API como fonte principal de estrutura, enquanto o usuario esperava que o botao refletisse o estado visivel/expandido do Explorer naquele momento.

## Causa

API e Explorer respondem perguntas diferentes:

- API `dseng:EngInstance` responde relacao estrutural do objeto consultado.
- Product Structure Explorer mostra o estado operacional atual do usuario: raiz aberta, subconjuntos expandidos e quantidade visivel/selecionada.

Quando o objetivo e "Atualizar estrutura aberta no Explorer", a fonte primaria precisa ser a grade atual do Explorer. A API pode enriquecer ou servir como diagnostico, mas nao pode substituir a contagem visivel com um parcial.

## O que foi alterado

- O build passou para `bom20260606zm`.
- `PRIMARY_LOADER` voltou para `tsv`, com paste fallback desligado.
- `PREFER_API_ON_MANUAL_REFRESH` voltou para `false`.
- O clique principal em `Atualizar estrutura` agora força `forceLoader: 'tsv'`.
- O clique principal nao usa autocopia nem paste fallback.
- O scroll harvest do Explorer deixa de parar em 40 itens e passa a respeitar `FAST_TSV_MAX`.

## Criterio de aceite

1. Abrir CJ MESA no Explorer.
2. Expandir subconjuntos ate o rodape mostrar `34 objetos`.
3. Clicar `Atualizar estrutura`.
4. Dashboard deve carregar `34/34`, nao `5/34`.
5. Abrir SKA/Transportador com rodape `113 objetos`.
6. Clicar `Atualizar estrutura`.
7. Dashboard deve buscar a contagem atual do Explorer; se nao fechar, deve falhar como parcial, nao aceitar API `78/113` como sucesso.

## Proxima decisao

Para estruturas muito grandes, a solucao de produto deve separar modos:

- `Escopo visivel no Explorer`: carrega exatamente o que o usuario expandiu.
- `Subconjunto selecionado`: carrega apenas o item escolhido e seus filhos sob demanda.
- `E-BOM completa`: acao explicita, com paginacao e aviso de custo.
