# Sprint Fecho — BOM Analytics (entrega autónoma)

Documento de execução para fechar o projeto **sem dependência de publicação admin no 3DSpace**.

**Objetivo (intenção original):**  
Dashboard analytics da E-BOM do Explorer, integrado ao fluxo do utilizador, com preview da peça no painel e carga automática/confiável das estruturas piloto no cloud.

**Tenant piloto:** `R1132100929518`  
**Build sprint:** `bom20260606a` (entregue nesta sessão)  
**Deploy:** GitHub Pages — `widget-boot.html` → `widget-v3.html?v=<BUILD>`

---

## 1. Definição de fechado (DoD)

O projeto considera-se **entregue** quando, no **3DDashboard piloto** (aba PRODUCTEXPLORE), com o widget apontando para o GitHub atual:


| #   | Critério     | Meta                                                                                                                                      |
| --- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Mont10       | **3/3** — nomes M1/M2, owners e hierarquia corretos                                                                                       |
| D2  | Drone        | **20/20**                                                                                                                                 |
| D3  | SKA          | **79/79**                                                                                                                                 |
| D4  | Fluxo        | Utilizador abre estrutura no Explorer → **Atualizar estrutura** → BOM completa **sem colar manualmente** (Ctrl+C não é passo documentado) |
| D5  | UI           | KPIs, gráficos, tabela E-BOM, filtros operacionais                                                                                        |
| D6  | Painel       | Clique na linha → metadados + **preview 2D** (thumb/getpicture quando `prd-` disponível)                                                  |
| D7  | Sync         | Ao mudar produto/estrutura no Explorer, widget **deteta e recarrega** (debounce; sem travar o dashboard)                                  |
| D8  | Deploy       | Pill/build visível (`?debug=1` ou tag fixa); sem builds antigas em cache                                                                  |
| D9  | Documentação | `SPRINT-FECHO.md` + secção README: limitações conhecidas (API/3D sem 3DSpace)                                                             |


**Fora do DoD (documentar, não prometer):** 3D interativo no painel no iframe GitHub; REST dseng 100% sem `WAFData`; widget 3DPlay separado.

---

## 2. Restrições desta sprint

- **Sem** deploy em `/enovia/webapps/` (admin).
- **Sem** pedir alterações de infraestrutura além do que o utilizador já controla (URL Additional App / Web Page Reader no dashboard).
- Código entregue via **commit + build bundle + GitHub Pages**.
- Se `WAFData` existir no runtime (Additional App trusted): usar API como **fast-path**, não como dependência única.

---

## 3. Arquitetura de entrega (autónoma)

```
Explorer (mesma aba)
       │
       ▼
ExplorerContext + product-explorer-bridge
  (poll, harvest TSV, auto-copy, catálogo prd-)
       │
       ▼
BomOrchestrator.refreshStructure
  1) TSV fast-path (preferApi: false)
  2) API dseng (só se WAFData + allow)
  3) Paste/scan (último recurso, banner amarelo)
       │
       ▼
BomSnapshot → KPIs · gráficos · tabela
       │
       ▼
part-preview + 3dplay-viewer (2D preferido)
```

---

## 4. Fases e etapas (ordem de execução)

### Fase A — Baseline e diagnóstico (agente)


| ID  | Etapa                        | Ficheiros / ação                                                     | Saída                       |
| --- | ---------------------------- | -------------------------------------------------------------------- | --------------------------- |
| A1  | Congelar build sprint        | `config.js`, `build-id.js`, `scripts/build-bundle.ps1`               | `bom20260606a`              |
| A2  | Inventário runtime dashboard | Documentar: Web Page Reader vs Additional App; F12: `typeof WAFData` | Nota em A2 no fim deste doc |
| A3  | Matriz aceite                | Mont10 / Drone / SKA: `STRUCTURE_IDS`, contagens, snapshots          | Tabela §6 abaixo            |
| A4  | Script smoke local           | `scripts/test-acceptance-sprint-fecho.js` (parse TSV + snapshots)    | Testes verdes offline       |


**Gate A:** build publicável; matriz aceite clara.

---

### Fase B — Carga automática confiável (núcleo)


| ID  | Etapa                               | Ficheiros                                           | DoD técnico                                                  |
| --- | ----------------------------------- | --------------------------------------------------- | ------------------------------------------------------------ |
| B1  | **Mont10 parser TSV**               | `file-import-service.js`, `tsv-bom-loader.js`       | Colunas title vs owner; M1/M2 corretos; 3/3                  |
| B2  | **Bridge Explorer — pequenas BOMs** | `product-explorer-bridge.js`, `config.js`           | ≤12 peças: harvest TSV sem scroll/copy agressivo             |
| B3  | **Bridge — SKA 79**                 | `product-explorer-bridge.js`, `bom-orchestrator.js` | Auto-copy/scroll limitado + validação `expectedCount`; 79/79 |
| B4  | **Bridge — Drone 20**               | idem                                                | 20/20; root name match                                       |
| B5  | **Validação root/contagem**         | `explorer-context.js`, `bom-orchestrator.js`        | Banner se `count < expected`; não silenciar falha parcial    |
| B6  | **Enrich prd- pós-import**          | `part-image.js`, bridge catálogo                    | Linhas com `prd-` quando existir no Explorer/TSV             |
| B7  | **API opcional**                    | `api-bom-loader.js`, `waf-client.js`, `config.js`   | Se `WAFData`: tentar dseng lazy/expand; fallback bridge      |


**Gate B:** D1–D4 parcial — três estruturas completas via **Atualizar** sem cola manual.

---

### Fase C — Sync Explorer + UX


| ID  | Etapa                   | Ficheiros                                    | DoD técnico                                                     |
| --- | ----------------------- | -------------------------------------------- | --------------------------------------------------------------- |
| C1  | **Sync contexto**       | `explorer-context.js`, `app.js`, `config.js` | `STRUCTURE_SYNC_DEBOUNCE_MS`; mudança root → refresh            |
| C2  | **Atualizar estrutura** | `app.js`, `bom-orchestrator.js`              | Overlay ≤28s; pequenas ≤12s; cancelável                         |
| C3  | **Build pill / cache**  | `widget-boot.html`, `app.js`, `config.js`    | `SHOW_BUILD_TAG` ou `?debug=1`; instrução hard refresh          |
| C4  | **Banners honestos**    | `app.js`                                     | Modo: API / TSV / fallback / snapshot — utilizador sabe a fonte |
| C5  | **Freeze/regressão**    | timeouts 05w/05x                             | Sem hang em Mont10, Drone, SKA                                  |


**Gate C:** D7 + D8.

---

### Fase D — Painel preview + fecho


| ID  | Etapa                       | Ficheiros                                              | DoD técnico                                         |
| --- | --------------------------- | ------------------------------------------------------ | --------------------------------------------------- |
| D1  | **Preview painel 2D**       | `part-preview.js`, `3dplay-viewer.js`, `part-image.js` | Metadados + imagem grande; `PREFER_2D_IN_PANEL`     |
| D2  | **Seleção tabela → painel** | `app.js`                                               | Clique linha atualiza painel; `prd-` quando mapeado |
| D3  | **Aceite manual checklist** | este ficheiro §6                                       | Utilizador valida D1–D8 no dashboard                |
| D4  | **README fecho**            | `README.md`                                            | Objetivo, fluxo, limitações, URL widget-boot        |
| D5  | **Bundle final**            | `bom-bundle.js`, `bom-bundle-bom20260606*.js`          | Deploy GitHub                                       |


**Gate D:** DoD §1 completo ou lista explícita de exceções assinada.

---

## 5. Backlog agente (sequência de commits sugerida)

1. `chore: sprint fecho baseline bom20260606a` — A1, A4
2. `fix(import): Mont10 TSV owner/title M1 M2` — B1
3. `fix(bridge): reliable harvest Mont10 Drone SKA counts` — B2–B5
4. `fix(prd): enrich physical ids after explorer import` — B6
5. `feat(api): optional dseng path when WAFData present` — B7 (se A2 positivo)
6. `feat(sync): explorer context debounced auto-refresh` — C1
7. `fix(ux): refresh timeouts banners build tag` — C2–C4
8. `fix(preview): 2D panel selection metadata` — D1–D2
9. `docs: sprint fecho README acceptance` — D3–D5

---

## 6. Matriz de aceite (piloto cloud)


| Estrutura | Root esperado                                      | Contagem | `prd-` raiz (config)          |
| --------- | -------------------------------------------------- | -------- | ----------------------------- |
| Mont10    | Mont10                                             | 3        | `prd-R1132100929518-00511496` |
| Drone     | `01_SKA_Drone Assembly_`*                          | 20       | `prd-R1132100929518-01172440` |
| SKA       | `01_SKA_Drone Assembly_130520208` (ou equivalente) | 79       | `prd-R1132100929518-01172440` |


**Procedimento de teste (utilizador):**

1. Mesma aba: Product Structure Explorer + widget BOM.
2. Abrir estrutura piloto no Explorer.
3. Clicar **Atualizar estrutura** (sem Ctrl+C).
4. Confirmar contagem na pill/banner e linhas na tabela.
5. Clicar linha com `prd-` → preview 2D no painel.
6. Trocar estrutura no Explorer → widget recarrega (≤ debounce + refresh).
7. Confirmar build `bom20260606`* (F12 ou `?debug=1`).

---

## 7. Riscos e mitigação


| Risco                                      | Mitigação sprint                                   |
| ------------------------------------------ | -------------------------------------------------- |
| Web Page Reader sem acesso iframe Explorer | Melhorar harvest/copy automático; validar contagem |
| Virtualização grade SKA                    | Scroll harvest limitado + TSV auto-copy            |
| Sem `WAFData`                              | Não bloquear fecho; bridge + enrich prd-           |
| getpicture 404                             | Placeholder + metadados; log silencioso            |
| Cache dashboard build antiga               | `widget-boot.html` + instrução Ctrl+Shift+R        |


---

## 8. Como pedir execução ao agente

Copiar no chat:

```
Executar SPRINT-FECHO.md — Fase B (B1–B5).
Build: bom20260606a. Sem deploy 3DSpace.
Reportar: diff, critérios D1–D4, o que falta para gate B.
```

Fases seguintes só após gate da fase anterior.

---

## 9. Estado da sprint (atualizar durante execução)


| Fase | Estado     | Notas |
| ---- | ---------- | ----- |
| A    | ⬜ pendente |       |
| B    | ⬜ pendente |       |
| C    | ⬜ pendente |       |
| D    | ⬜ pendente |       |


**A2 runtime (preencher no dashboard):**  

- Tipo widget: ⬜ Web Page Reader / x Additional App / ⬜ outro  
- `WAFData` no F12: ⬜ sim / ⬜ não  
- URL Additional App atual: [https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-v3.html?v=bom20260605x](https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-v3.html?v=bom20260605x)

---

## 10. Referências internas

- HANDOFF chat anterior (objetivo vs gap)  
- `assets/js/bom-orchestrator.js` — fluxo único  
- `assets/js/integration/product-explorer-bridge.js` — bridge Explorer  
- `SPRINT-2.5-ENTREGA.md` — arquitetura loaders (histórico)  
- Doc dseng FD02 (expand/lazy) — bonus se WAFData

---

*Sprint criada: 2026-06-02 — entrega autónoma, objetivo original, DoD mensurável.*