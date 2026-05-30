# Sprint Fase 2 — prioridade (sem clipboard)

Ordem recomendada: **critério 6 primeiro**, porque sem API estável o critério 2 vira só cola de novo.

---

## Sprint 1 — API ENOVIA + raiz dinâmica + pai/filho (critérios 6 + 3 + 4)

**Objetivo:** um clique em **Varrer** carrega a **estrutura aberta no Explorer** (qualquer assembly), hierarquia pai→filho, sem Ctrl+C. Mont10 = só teste.

| # | Entrega | Aceite |
|---|---------|--------|
| 1 | `WAFData` + `SecurityContext` no Additional App sem crash | Console sem `getSecurityContext`; headers nas chamadas |
| 2 | Resolver **physicalId** da **raiz atual** no Explorer | Seleção/hash/API — não nome fixo Mont10 |
| 3 | `loadRoot` + expand **lazy** (pai/filho) | **Varredura concluída: N itens — &lt;raiz&gt;**; N = tamanho real da estrutura (ou limite + aviso) |
| 4 | Timeout 10–15 s + botão destrava | Nunca “Varrendo…” infinito |
| 5 | UI: cola azul **oculta** ou “Modo avançado (cola)” | Fluxo principal = só Varrer |

**Não fazer nesta sprint:** gráficos novos, Excel, deploy 3DSpace.

**Teste único:** Mont10 no Explorer → Varrer **sem colar** → tabela Mont10, M1, M2, 3 aprovados.

---

## Sprint 2 — Seleção automática (critérios 2 + 7)

**Objetivo:** reduzir até o clique em Varrer.

| # | Entrega | Aceite |
|---|---------|--------|
| 1 | Ponte seleção Explorer → `physicalId` | Mudar linha no Explorer atualiza rótulo “Estrutura: …” |
| 2 | Opcional: varredura ao mudar seleção (debounce 1–2 s) | Sem loop/travamento |
| 3 | Mensagens só Explorer + Varrer | Remover “cole na caixa” do fluxo principal |

**Depende de:** Sprint 1 (API já OK).

---

## Sprint 3 — KPIs e maturidade (critério 5)

**Objetivo:** números batem com Explorer.

| # | Entrega | Aceite |
|---|---------|--------|
| 1 | Mapear **Aprovado** → released/approved nos KPIs | 3 aprovados para Mont10+M1+M2 |
| 2 | Gráficos com dados da API (não import cola) | Barras não vazias |
| 3 | Regressão: trocar assembly → KPIs mudam | Mesmo teste M2 só |

---

## Fallback (sempre por último)

- Caixa cola + parse TSV/JSON — **só** se API falhar, com aviso amarelo:  
  *“API indisponível — modo cola (não use em produção).”*

---

## Decisão de arquitetura (fixa)

```
[Varrer] → physicalId Mont10? → WAFData → REST dseng expand → KPIs + tabela
                ↓ falha
         mensagem clara (não cola silenciosa)
                ↓ admin
         fallback cola (opcional)
```

---

## Perguntas a fechar no dia 1 da Sprint 1

1. **physicalId** fixo de Mont10 no `config` (temporário) para destravar API enquanto seleção não vem?
2. Varredura **só no clique** ou auto ao abrir Mont10?
3. Build único no Additional App: `widget-v2.html` ou voltar `widget-bom.html` quando API estiver estável?

---

*Alinhado a `CHECKLIST-ACEITE-DASHBOARD.md` e `OBJETIVO-PROJETO.md`.*
