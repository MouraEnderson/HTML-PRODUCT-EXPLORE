# Roadmap — Render BOM Service (SKA)

**Decisão:** DEC-018  
**Render:** https://bom-resolver.onrender.com  
**Repositório:** `MouraEnderson/HTML-PRODUCT-EXPLORE` (backend em `backend/`)

Este roadmap divide o trabalho em PRs pequenos. **PR 1 (este documento + inventário) não altera runtime.**

---

## Fase 0 — Backup e inventário ✅ (PR 1)

| Item | Status |
|------|--------|
| Branch `backup/main-before-render-bom-service` | Criada |
| Branch `feature/render-bom-service-architecture` | Criada |
| `docs/REPOSITORY-INVENTORY.md` | Criado |
| `docs/LEGACY-CLEANUP-PLAN.md` | Criado |
| Placeholders `.tmp` / `-2.md` removidos | PR 1 |

**Não fazer nesta fase:** alterar `widget-v3-08i.html`, `backend/src/server.js`, rotas, Render.

---

## Fase 1 — Documentação e contrato ✅ (PR 1)

| Entregável | Arquivo |
|------------|---------|
| Decisão arquitetural | `docs/DEC-018-RENDER-BOM-SERVICE-ARCHITECTURE.md` |
| Contrato API | `docs/API-CONTRACT-BOM-SERVICE.md` |
| Roadmap | `docs/ROADMAP-RENDER-BOM-SERVICE.md` (este arquivo) |
| Inventário | `docs/REPOSITORY-INVENTORY.md` |
| Plano de limpeza | `docs/LEGACY-CLEANUP-PLAN.md` |

**Gate:** revisão humana do PR 1 antes de Fase 2.

---

## Fase 2 — Backend mock (PR 2) ✅

**Branch:** `feature/backend-bom-service-contract-v1`

| Item | Status |
|------|--------|
| `GET /api/3dx/bom/health` | ✅ implementado (mock) |
| `POST /api/3dx/bom/structure` | ✅ implementado (mock) |
| `POST /api/3dx/bom/diagnostic` | ✅ implementado (mock) |
| Arquivos | `threeDxBomRoutes.js`, `threeDxBomService.js`, `threeDxBomNormalizer.js` |
| Registro | `server.js` — prefixo `/api/3dx/bom` |
| Comportamento | Valida `rootId` / `depth`; mock CJ MESA para root conhecido |
| Proibido neste PR | Chamar 3DEXPERIENCE; quebrar `/api/bom/*` |

**Testes manuais:**

```bash
curl -s https://bom-resolver.onrender.com/api/3dx/bom/health

curl -s -X POST https://bom-resolver.onrender.com/api/3dx/bom/structure \
  -H "Content-Type: application/json" \
  -d '{"rootId":"63FC553465A62400699E0792000086AB","depth":2,"includeRoot":true,"mode":"dseng-official"}'

curl -s -X POST https://bom-resolver.onrender.com/api/3dx/bom/structure \
  -H "Content-Type: application/json" \
  -d '{"depth":2}'
```

(Local: substituir base URL por `http://localhost:3000`.)

---

## Fase 3 — Backend dseng oficial (PR 3) 🚧

**Branch:** `feature/backend-dseng-structure-v1`

| Item | Status |
|------|--------|
| `GET /api/3dx/bom/health` | ✅ upstream flags + `BOM_SERVICE_MODE` |
| `POST /api/3dx/bom/structure` | ✅ dseng real v1 (GET EngItem + EngInstance) |
| `POST /api/3dx/bom/diagnostic` | ✅ diagnóstico real controlado (nível 1) |
| `BOM_SERVICE_MODE=mock` | ✅ preserva mock PR #16 |
| Env vars | `THREEDX_*`, `BOM_SERVICE_MODE` |
| Arquivos novos | `threeDxConfig.js`, `threeDxDsengClient.js` |
| Proibido | Expand Item como fonte structure; fallback silencioso mock; frontend |

**Variáveis Render (após merge):**

```
THREEDX_SPACE_URL
THREEDX_SECURITY_CONTEXT
THREEDX_USERNAME
THREEDX_PASSWORD
BOM_SERVICE_MODE=dseng
```

**Testes locais obrigatórios (PR 3):**

| # | Cenário | Esperado |
|---|---------|----------|
| 1 | Sem env dseng | HTTP 503 `UPSTREAM_NOT_CONFIGURED` |
| 2 | `BOM_SERVICE_MODE=mock` | HTTP 200 mock + warnings |
| 3 | `depth=10` | HTTP 422 `DEPTH_LIMIT_EXCEEDED` |
| 4 | Sem `rootId` | HTTP 422 `ROOT_ID_REQUIRED` |
| 5 | `depth="abc"` | HTTP 422 `INVALID_DEPTH` |
| 6 | `BOM_SERVICE_MODE=mock` + sem rootId | HTTP 422, `mode: mock`, `diagnostics.mode: mock` |
| 7 | `BOM_SERVICE_MODE=mock` + depth inválido | HTTP 422, `mode: mock` |
| 8 | `extractChildReferenceId` com `physicalid` de instância | não retorna como childId |
| 9 | `extractChildReferenceId` com `reference.id` | retorna `reference.id` |
| 10 | username/password sem `THREEDX_AUTH_MODE=basic` | HTTP 502 `UPSTREAM_AUTH_NOT_IMPLEMENTED` |
| 11 | `THREEDX_AUTH_MODE=basic` + username/password | monta Basic (sem logar segredo) |

---

## Fase 3 (legado — detalhe técnico)

| Item | Detalhe |
|------|---------|
| Integração | Reutilizar `EnoviaClient` / padrões de `bomResolver.js` |
| Fluxo | GET EngItem → GET EngInstance → resolver filhos → normalizar `rows` |
| Profundidade | `depth` controlado; `visited` anti-loop |
| Fonte principal | **EngItem + EngInstance** — não POST `/expand` na rota structure |
| Env | Documentar mapeamento env existente vs `THREEDX_*` |
| Diagnostics | `endpointsUsed`, `durationMs`, erros sanitizados |

**Produto teste:** CJ MESA 4BCS VP TOP 3DX (`63FC553465A62400699E0792000086AB`).

---

## Fase 4 — Frontend consome Render (PR 4) ✅

**Branch:** `feature/frontend-render-bom-service-v1` — mergeado PR #18

| Item | Status |
|------|--------|
| CORS/preflight | ✅ GitHub Pages + 3DEXPERIENCE IFWE |
| Script | `assets/js/bom-ska-service-hotfix-20260615a.js` |
| Widget | `widget-v3-08i.html?v=bom20260615a` |
| Endpoint | `POST https://bom-resolver.onrender.com/api/3dx/bom/structure` |
| Validado prod | CJ MESA — 5 linhas |

**Build PR 4:** `bom20260615a`

---

## Fase 4b — Fix SKA runtime UX and count (PR 19) 🚧

**Branch:** `feature/frontend-ska-runtime-ux-count-fix-v1`

| Item | Status |
|------|--------|
| Build | `bom20260616a` |
| Script | `assets/js/bom-ska-service-hotfix-20260616a.js` |
| Versionamento | Remove `bom20260614n` / aviso divergente falso; remove `bom-api-id-hotfix` do boot |
| Contagem | Fonte única `payload.counts.totalRows`; bypass `buildFromImported`/`ensureContextRoot` |
| Root duplicado | Snapshot direto via `BomSnapshot.applyPayload` (5 itens, sem root sintético) |
| UX | Diagnostics colapsável, ResizeObserver, KPI clamp, topbar responsiva |
| Debug | Toast `KpiCards.render protegido` suprimido (exceto `__BOM_DEBUG__`) |
| Labels | MutationObserver mantém **Carregar BOM via SKA Service** |
| Assert | `assertSkaCountIntegrity` — tabela/KPI/BomService = expectedTotal |

**Widget:** `widget-v3-08i.html?v=bom20260616a`

**Sem:** backend, contrato, mock, Explorer Mirror operacional, clipboard, TSV, DOM scraping.

---

## Fase 4 (legado — detalhe)

**Branch antiga:** `feature/frontend-consume-render-bom-service`

---

## Fase 5 — Limpeza controlada do legado (PR 5)

**Branch:** `cleanup/remove-deprecated-explorer-mirror`

Seguir `docs/LEGACY-CLEANUP-PLAN.md`:

- Desativar Explorer Mirror no fluxo principal.
- Remover/isolar DOM scraping, clipboard, TSV do caminho ativo.
- Manter diagnósticos úteis (Expand Item) se ainda agregarem valor técnico.
- Não deletar arquivos sem confirmação pós-inventário.

---

## Fase 6 — Validação com produto real

**Referência:** CJ MESA 4BCS VP TOP 3DX  
**RootId:** `63FC553465A62400699E0792000086AB`

| Critério | Verificação |
|----------|-------------|
| Linhas retornadas | Contagem e hierarquia coerentes com dseng |
| Níveis | `level` / `parentId` corretos até `depth` |
| Atributos | title, description, revision, owner, maturity, format, type |
| KPI | `counts.totalRows` = `rows.length` (ou regra documentada) |
| Performance | Estrutura piloto responde em tempo aceitável |
| Explorer visual | **Não** é critério de aceite de igualdade pixel-a-pixel |

---

## Mapa de PRs

| PR | Branch | Escopo |
|----|--------|--------|
| **1** | `feature/render-bom-service-architecture` | Docs + inventário |
| **2** | `feature/backend-bom-service-contract-v1` | Mock `/api/3dx/bom/*` ✅ |
| **3** | `feature/backend-dseng-structure-v1` | dseng real |
| **4** | `feature/frontend-render-bom-service-v1` | Frontend → Render (SKA BOM Service) ✅ |
| **4b** | `feature/frontend-ska-runtime-ux-count-fix-v1` | UX + contagem consistente |
| **5** | `cleanup/remove-deprecated-explorer-mirror` | Limpeza legado |

**Regra:** um PR por fase; draft até revisão; não misturar frontend + backend + docs em PR gigante.
