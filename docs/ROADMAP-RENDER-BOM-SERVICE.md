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

## Fase 3 — Backend dseng oficial (PR 3)

**Branch:** `feature/backend-dseng-structure-v1`

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

## Fase 4 — Frontend consome Render (PR 4)

**Branch:** `feature/frontend-consume-render-bom-service`

| Item | Detalhe |
|------|---------|
| Feature flag | `BOM_DATA_SOURCE = "render-bom-service"` |
| Botão | **Atualizar estrutura** → `POST …/api/3dx/bom/structure` |
| UI | Tabela ← `response.rows`; KPI ← `counts.totalRows` |
| Banner | `Fonte: Render BOM Service / dseng-official` |
| Mensagem | Honesta (não é grade visual do Explorer) |
| Rollback | Flag desliga novo fluxo |

**Build:** novo bump após merge PR 3.

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
| **4** | `feature/frontend-consume-render-bom-service` | Frontend → Render |
| **5** | `cleanup/remove-deprecated-explorer-mirror` | Limpeza legado |

**Regra:** um PR por fase; draft até revisão; não misturar frontend + backend + docs em PR gigante.
