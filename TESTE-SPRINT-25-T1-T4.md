# Testes Sprint 2.5 — T1 a T4

**Build:** `bom20260605g`  
**Widget:** `https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-v2.html?v=bom20260605g`  
**Piloto:** LISTA 3DX — aba PRODUCTEXPLORE — tenant `R1132100929518`

---

## Execução automatizada (repo + GitHub Pages)

```powershell
node scripts/test-acceptance-sprint25.js
```

Valida snapshots Mont10/Drone, flags Sprint 2.5, UTF-8 no widget, alinhamento de build e bundle publicado.

---

## T1 — Mont10 (3 objetos)

| Critério | Automatizado | Piloto 3DDashboard |
|----------|--------------|-------------------|
| 3/3 peças | ✅ `data/mont10.json` | [ ] Confirmar após **Atualizar estrutura** |
| Mont10, M1, M2 | ✅ nomes no snapshot | [ ] Tabela E-BOM |
| Revisão 1.1 | ✅ | [ ] Coluna Revisão |
| Owner pessoa (não JSON) | ✅ Enderson Moura | [ ] Coluna Proprietário |
| Banner `TSV 3/3` ou `API 3/3` | — | [ ] `#syncBanner` |

**Roteiro piloto**

1. Abrir Mont10 no Product Structure Explorer (M1, M2 visíveis).
2. Clicar **Atualizar estrutura** (sem colar).
3. Banner deve mostrar **3/3 — sincronizado**.
4. Console: `BomOrchestrator.refreshStructure({ source: 'manual', allowAutoCopy: true })`

---

## T2 — Drone SKA (20 objetos)

| Critério | Automatizado | Piloto 3DDashboard |
|----------|--------------|-------------------|
| 20/20 peças | ⚠️ snapshot local tem **11** (fallback) | [ ] Grade Explorer com 20 linhas |
| Modo TSV ou API | ✅ loader cascade | [ ] Banner `TSV 20/20` ou `API 20/20` |
| Sem DOM primary | ✅ config | [ ] Sem banner amarelo DOM (ideal) |

**Roteiro piloto**

1. Abrir `01_SKA_Drone Assembly_130520206` no Explorer — expandir até **20** objetos na grade.
2. **Atualizar estrutura** (TSV auto-copy ≤ 500).
3. KPI total = 20; pager **20 peças**.

---

## T3 — SKA assembly grande (79 selecionados)

| Critério | Automatizado | Piloto 3DDashboard |
|----------|--------------|-------------------|
| 79/79 ou mensagem clara | ✅ política API + banner Parcial | [ ] Seleção 79 no Explorer |
| Acima FAST_TSV_MAX → API | ✅ orchestrator | [ ] Progresso lazy ou erro 406 legível |
| Truncado → aviso BOM_MAX_NODES | ✅ sync-banner | [ ] Se aplicável |

**Roteiro piloto**

1. Abrir assembly SKA com **79** peças selecionadas/contadas no Explorer.
2. **Atualizar estrutura** — esperado: **API** (não TSV).
3. Sucesso: banner **API 79/79**; falha API: mensagem acionável (não spinner infinito).

Console:

```javascript
ExplorerContext.refresh(true)
BomOrchestrator.refreshStructure({ source: 'manual', preferApi: true })
```

---

## T4 — Regressão UX

| Critério | Automatizado | Piloto / browser |
|----------|--------------|------------------|
| Build pill `bom20260605g` | ✅ | ✅ GitHub Pages |
| UTF-8 (Avançado, peças, Gráficos…) | ✅ UI_HTML | ✅ GitHub Pages |
| Sem piscar 3 s | ✅ AUTO_SYNC=0 | [ ] Observar após load |
| Gráficos legíveis | — | [ ] Saúde da Maturidade, Proprietários |
| Banner honesto por modo | ✅ código | [ ] Após cada T1–T3 |

**Demo offline (GitHub, sem Explorer)**

- Mont10 snapshot: abrir widget com `?snapshot=data/mont10.json` no Additional App ou carregar via fallback piloto.
- Verificar status **3 itens** e labels PT corretos.

---

## Resultado da última execução automatizada

**Data:** 2026-05-28 · **Comando:** `node scripts/test-acceptance-sprint25.js`

| ID | Status | Notas |
|----|--------|-------|
| T1 | ✅ PASS | Snapshot `mont10.json`: 3/3, Mont10/M1/M2, owner, rev 1.1 |
| T2 | ⚠️ WARN | Snapshot local 11/20 — aceite 20/20 só no piloto (TSV/API live) |
| T3 | ✅ PASS | Política API lazy + banner Parcial/truncada — 79/79 pendente piloto |
| T4 | ✅ PASS | Build alinhado, UTF-8 OK, GitHub Pages 200, bundle `05g` acessível |

**Browser GitHub Pages (T4 visual):** Avançado, Aprovação, Gráficos, Saúde da Maturidade, peças — sem mojibake.

---

## Aceite item 9

Registro formal em **`CHECKLIST-ACEITE-DASHBOARD.md`** — secção *Aceite Sprint 2.5 — item 9*.

| Papel | Status | Data |
|-------|--------|------|
| Aceite técnico (repo + deploy + testes auto) | ✅ Assinado | 2026-05-28 |
| Aceite operador piloto (T1–T3 live) | ⏳ Pendente | — |
