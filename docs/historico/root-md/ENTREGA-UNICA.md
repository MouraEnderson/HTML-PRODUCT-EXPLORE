# BOM Analytics — Explorer aberto (Fase 2)

## URL Additional App

```
https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-v2.html?v=bom20260602a
```

**Build:** `bom20260602a` — lê o título do **Product Structure Explorer** no dashboard e carrega a BOM via API (sem depender de Mont10 fixo).

## Comportamento

1. Abra qualquer assembly no Explorer (Mont10, Drone, etc.).
2. O BOM detecta o nome no título do widget Explorer.
3. Carrega automaticamente (debounce ~2s) — **não precisa Varrer**.
4. **Varrer** = forçar atualização manual.

## O que você deve ver

- **Estrutura:** nome igual ao Explorer (ex. `01_SKA_Drone Assembly_…` ou `Mont10`)
- KPIs e tabela com a contagem real (ex. Drone ~19+, Mont10 = 3)
- Status: `Carregado: … — N itens` ou mensagem de varredura

## Se API retornar 403/0

- Confirme build **bom20260602a** na faixa azul.
- **Ctrl+Shift+R** no dashboard.
- A API ENOVIA precisa responder no tenant (`*-space` ou `*-ifwe`); o widget tenta ambos.

## Snapshot offline (opcional)

Só com parâmetro explícito:

```
?snapshot=data/mont10.json
```

## Atualizar STRUCTURE_IDS (opcional)

Explorer → raiz → Propriedades → ID físico → adicione em `assets/js/config.js` em `STRUCTURE_IDS` para busca mais rápida.
