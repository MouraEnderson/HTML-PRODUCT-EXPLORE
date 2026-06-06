# Sprint 28 - Botao unico para leitura do Explorer

Data: 2026-06-06
Build: bom20260606zi

## Problema

O fluxo anterior ainda expunha mensagens e controles de contingencia por cola, mesmo com o produto definido como:

- abrir/expandir a estrutura no Product Structure Explorer;
- clicar em Atualizar estrutura no BOM Analytics;
- carregar a E-BOM da estrutura aberta, sem Ctrl+C/Ctrl+V como fluxo de usuario.

Nos testes reais, a build anterior tambem mostrava "Parcial 0/50" e orientacao de cola quando a leitura automatica nao obtinha as linhas do Explorer.

## Entrega

- Build atualizada para `bom20260606zi`.
- Textarea de cola removido da UI visivel do widget.
- Botao `Atualizar estrutura` agora permite a captura interna da grade do Explorer acionada pelo proprio clique.
- Auto-sync permanece desligado; nao ha tentativa empilhada em background.
- Mensagens principais foram trocadas para orientar apenas o fluxo correto: Explorer aberto/expandido + Atualizar estrutura.
- Fallback API manual ficou controlado: se a leitura do Explorer falhar, a API so e aceita quando entrega contagem compativel; se retornar parcial, o app informa isso em vez de vender como sincronizado.

## Criterio de Teste

Para validar no 3DDashboard:

1. Abrir uma estrutura no Product Structure Explorer.
2. Expandir os niveis necessarios no Explorer.
3. Clicar apenas em `Atualizar estrutura`.
4. Conferir:
   - a build exibida/deploy deve ser `bom20260606zi`;
   - nao deve haver caixa visivel para colar grade;
   - o status deve mostrar `Explorer N/N` quando a leitura bater a contagem;
   - se falhar, o erro deve informar leitura Explorer/API parcial, sem pedir Ctrl+C/Ctrl+V.

## Limite Tecnico Atual

O teste `CJ MESA 4BCS VP TOP 3DX` mostrou que:

- a API encontra a raiz por `dseng:EngItem/search?$searchStr=name:<prd-id>`;
- chamadas diretas `dseng:EngItem/<prd-id>` retornam 404;
- `dseng:EngInstance` da raiz retornou somente filhos diretos e nao a arvore completa;
- a resolucao de filhos por label e ambigua, portanto nao pode ser usada como fonte definitiva sem contrato adicional.

Por isso, a etapa entrega o botao unico e remove o paliativo visual, mas a conclusao tecnica continua: para 3DView e E-BOM ilimitada confiavel, precisamos de um contrato REST que devolva a referencia real de cada instancia, ou de um canal 3DEXPERIENCE oficial que exponha a estrutura completa selecionada.
