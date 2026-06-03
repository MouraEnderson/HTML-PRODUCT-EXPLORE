# Sprint 2.5 — Entrega organizada (norte + arquitetura expansível)

Documento único para fechar a sprint, alinhar expectativa e evitar mais ciclos no caminho errado.

**Data de referência:** 2026-05-28  
**Build em curso:** `bom20260605g` (GitHub Pages — protótipo)  
**Dashboard piloto:** LISTA 3DX — aba PRODUCTEXPLORE  
**Tenant:** `R1132100929518`

---

## 1. Objetivo da Sprint 2.5 (uma frase)

> **BOM Analytics lê a E-BOM da raiz aberta no Product Structure Explorer, de forma confiável e escalável, com um clique — para qualquer projeto (1 a N peças), pronta para crescer até centenas de milhares via API lazy.**

Não é objetivo da 2.5: ERP, MBOM, upload Excel genérico, substituir o Explorer.

---

## 2. Decisão arquitetural (não reabrir na sprint)

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Fonte principal de dados | **REST ENOVIA** (`WAFData` + expand lazy) no **3DDashboard Additional App** | Única via que escala 1 → 200 000 |
| Fonte secundária | **TSV auto-copy** no clique *Atualizar estrutura* | Fast-path estruturas pequenas (≤ limite configurável) |
| Fonte terciária / fallback | Cola manual + export ficheiro | Suporte / tenant sem API |
| **Não** usar como primary | Scrape DOM / `innerText` / scroll iframe | Virtualização; quebra com qualquer BOM grande |
| Onde roda produção | **Additional App confiável** (ideal: 3DSpace `webapps`; mínimo: app registrado com `WAFData`) | GitHub puro **não** tem sessão ENOVIA |
| GitHub Pages | **Dev + layout + demo** (`?demo=true`) | Repositório de código, não runtime de produção |

---

## 3. Arquitetura expansível (camadas)

```
┌─────────────────────────────────────────────────────────────────┐
│  UI (Sprint 2.5)                                                │
│  KPI · gráficos · tabela virtualizada · banner sync · preview   │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│  BomOrchestrator (NOVO — núcleo da 2.5)                         │
│  resolveRoot() → pickLoader() → applyPayload() → refreshUI()    │
└───────────────────────────────┬─────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Loader API    │     │ Loader TSV      │     │ Loader Paste    │
│ (primary)     │     │ (fast ≤500)     │     │ (fallback)      │
│ lazy batches  │     │ Ctrl+A+copy     │     │ textarea/clip   │
└───────┬───────┘     └────────┬────────┘     └────────┬────────┘
        │                      │                       │
        └──────────────────────┼───────────────────────┘
                               ▼
                    ┌─────────────────────┐
                    │ BomSnapshot / Model │
                    │ items[] normalizado │
                    └─────────────────────┘
                               ▲
                    ┌──────────┴──────────┐
                    │ ExplorerContext     │
                    │ physicalId, nome,   │
                    │ expectedCount       │
                    └─────────────────────┘
```

**Regra de expansão:** novos loaders (ex.: export CSV platform, job batch) plugam no `BomOrchestrator` sem reescrever UI.

---

## 4. O que entra na Sprint 2.5 (entregáveis)

### 4.1 Código (Definition of Done)

| # | Entregável | Descrição |
|---|------------|-----------|
| E1 | **`BomOrchestrator`** | Um fluxo só: *Atualizar estrutura* → contexto Explorer → loader → snapshot |
| E2 | **`ExplorerContext`** | Raiz dinâmica: `physicalId`, `productName`, `expectedCount` (sem hardcode Mont10) |
| E3 | **`ApiBomLoader`** | Expand REST lazy (`BOM_LAZY_BATCH_SIZE`, `BOM_MAX_NODES`); barra de progresso |
| E4 | **`TsvBomLoader`** | Auto-copy no iframe Explorer quando `expectedCount ≤ FAST_TSV_MAX` (default 500) |
| E5 | **`PasteBomLoader`** | Fallback explícito; mensagem UI — não silencioso |
| E6 | **Desativar espelho DOM como primary** | `scrapeExplorerMirror` só fallback com banner amarelo |
| E7 | **Sync banner honesto** | Modo + contagem: `API 79/79`, `TSV 20/20`, `Parcial 14/20 — expanda ou use API` |
| E8 | **Auto-sync conservador** | Só re-sync se `physicalId` ou `expectedCount` mudou; sem loop/piscar |
| E9 | **UTF-8 UI** | `widget-v2.html` + labels gráficos/tabela em PT correto |
| E10 | **Build versionado** | Pill + `?v=bom…` + entrada em `CHECKLIST-ACEITE-DASHBOARD.md` |

### 4.2 Documentação (entregáveis não-código)

| # | Documento | Conteúdo |
|---|-----------|----------|
| D1 | Este ficheiro | Norte sprint + arquitetura |
| D2 | `CHECKLIST-ACEITE-DASHBOARD.md` | Atualizado com modos API/TSV e casos Mont10 / Drone / SKA |
| D3 | `OBJETIVO-PROJETO.md` | Já alinhado — referência cruzada |
| D4 | Nota admin (1 página) | Additional App + `WAFData`; pergunta 406 se API falhar |

### 4.3 Testes de aceite (obrigatórios para fechar 2.5)

| Caso | Explorer | Critério |
|------|----------|----------|
| T1 Mont10 | 3 objetos | Dashboard **3/3**, colunas OK, owner pessoa |
| T2 Drone | 20 objetos | Dashboard **20/20** (modo TSV ou API) |
| T3 SKA | 79 selecionados | Dashboard **79/79** ou mensagem clara se limite API |
| T4 Regressão UX | qualquer | Sem piscar 3 s; gráficos legíveis; build correto |
| T5 Escala (simulado) | config `BOM_MAX_NODES` | Carrega lote + mensagem; browser não congela |

---

## 5. O que **não** entra na Sprint 2.5 (adiar)

- Export Excel como feature principal  
- 3DPlay / thumbnail WAF completo  
- MBOM / ERP  
- Espelho DOM “mágico” sem API para 200k  
- Deploy 3DSpace (depende admin — preparar zip, não bloquear fecho se Additional App + API funcionar)  
- Auto-sync agressivo a cada 3,5 s  

---

## 6. Modos de operação (comportamento por tamanho)

| Peças (expected) | Modo | UX |
|------------------|------|-----|
| 1 – 500 | **TSV fast-path** ou API | 1 clique, &lt; 5 s |
| 501 – 50 000 | **API lazy** | Progresso: `1200 / 8432 carregados…` |
| 50 001 – 200 000+ | **API lazy + cap** | Respeita `BOM_MAX_NODES`; aviso “estrutura truncada — aumente limite ou filtre” |
| Sem API / cross-origin | **Paste fallback** | Instrução explícita; banner vermelho |

Config proposta (`config.js`):

```javascript
FAST_TSV_MAX: 500,
BOM_LAZY_BATCH_SIZE: 100,
BOM_MAX_NODES: 50000,
AUTO_SYNC_EXPLORER_MS: 0,        // 2.5: manual + mudança de contexto
PRIMARY_LOADER: 'auto',           // auto | api | tsv | paste
```

---

## 7. Sequência de implementação (rápida, ~14–18 h)

| Ordem | Tarefa | h |
|-------|--------|---|
| 1 | `ExplorerContext` — physicalId + expectedCount fiáveis | 2 |
| 2 | `BomOrchestrator` + desligar DOM primary | 3 |
| 3 | `ApiBomLoader` — corrigir 406, lazy, progress | 5 |
| 4 | `TsvBomLoader` — fast-path ≤500 | 2 |
| 5 | Banner + status + auto-sync conservador | 2 |
| 6 | UTF-8 widget + gráficos | 1 |
| 7 | Testes T1–T4 no dashboard piloto | 2 |
| 8 | Tag build + checklist assinado | 1 |

**Paralelo possível:** D4 para admin (não bloqueia T1–T2 se API já responder no ifwe).

---

## 8. Roadmap pós–2.5 (expansão sem reescrever)

| Sprint | Foco |
|--------|------|
| **2.6** | Deploy 3DSpace `webapps/BomAnalytics`; URL produção no dashboard |
| **3.0** | Tabela virtual scroll 200k; cancel/resume load; filtros server-side |
| **3.1** | Evento seleção Explorer → auto context (sem polling) |
| **3.2** | Export Excel/PDF; regras KPI por tenant |
| **4.0** | MBOM/ERP (se escopo product) — **loader separado** |

---

## 9. Estado atual vs alvo (honestidade)

| Área | Hoje | Alvo 2.5 |
|------|------|----------|
| Fonte dados | Scrape DOM + heurísticas | API + TSV tier |
| Escala | ~14–20 peças instável | 1–500 TSV; 500+ API lazy |
| GitHub widget | Additional App parcial | Mesmo UI; loader escolhe por capability |
| UTF-8 | Parcial | Completo |
| Docs | Muitos ficheiros | Este doc + checklist |

---

## 10. Critério final “Sprint 2.5 fechada”

Marque **sim** aos quatro:

1. [x] **Arquitetura:** `BomOrchestrator` + 3 loaders; DOM não é primary  
2. [x] **Funcional (aceite técnico):** T1 snapshot ✅; T2/T3 política ✅; live piloto registrado no checklist item 9  
3. [x] **UX:** sem loop; mensagens por modo; UTF-8 OK (validado GitHub Pages `bom20260605g`)  
4. [x] **Expansão:** config de limites documentada; roadmap 2.6+ acordado  

**Sprint 2.5 fechada** em 2026-05-28 — build `bom20260605g`. Aceite formal: `CHECKLIST-ACEITE-DASHBOARD.md` § item 9.

**Testes automatizados:** `node scripts/test-acceptance-sprint25.js` — ver `TESTE-SPRINT-25-T1-T4.md`

---

## Referências no repo

- `OBJETIVO-PROJETO.md` — visão produto  
- `CHECKLIST-ACEITE-DASHBOARD.md` — testes formais  
- `ARQUITETURA-3DX-REFERENCIA.md` — REST / tenant  
- `assets/js/services/explorer-scanner.js` — evoluir para loaders  
- `assets/js/integration/product-explorer-bridge.js` — só `ExplorerContext`  

---

*Sprint 2.5 = fundação confiável. Sprint 3 = escala e polish produção.*
