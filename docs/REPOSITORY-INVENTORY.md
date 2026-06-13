# Repository Inventory — BOM Analytics / SKA BOM Service

**Data:** 2026-06-11  
**Branch referência:** `main` (pré DEC-018 implementação)  
**Build frontend ativo:** `bom20260617b` (`widget-v3-08i.html`)

Inventário para suportar DEC-018 e `LEGACY-CLEANUP-PLAN.md`.  
**Legenda status:** `active` | `diagnostic` | `deprecated` | `unknown`

---

## 1. Frontend ativo

### 1.1 Entry point produção

| Arquivo | Status | Descrição |
|---------|--------|-----------|
| `widget-v3-08i.html` | **active** | Widget principal Additional App; boot, paint UI, cadeia de scripts |
| `assets/css/dashboard.css` | **active** | Estilos dashboard |
| `assets/vendor/chart.umd.min.js` | **active** | Chart.js |

### 1.2 Cadeia de scripts (`widget-v3-08i.html` → runtime → `startBundle`)

| Ordem | Arquivo | Status | Função |
|-------|---------|--------|--------|
| loader | `widget-v3-08i.html` | **active** | Loader mínimo XHTML/CDATA |
| 0 | `assets/js/widget-runtime-bom20260617b.js` | **active** | PR #21: paint, boot idempotente, manifest |
| 1 | `assets/vendor/chart.umd.min.js` | **active** | Chart.js |
| 2 | `assets/js/bom-bundle-bom20260607a.js` | **active** | Bundle base |
| 3 | `assets/js/integration/product-explorer-sync-provider.js` | **active** | Contexto PSE CAMINHO B |
| 4 | `assets/js/bom-ska-service-hotfix-20260617b.js` | **active** | SKA sync + UX ES5 |

**Histórico (não carregar em produção):**

| Arquivo | Status |
|---------|--------|
| `bom-ska-service-hotfix-20260617a.js` | **deprecated** — continha async/await |
| `bom-ska-service-hotfix-20260616a.js` | **deprecated** |
| `bom-api-id-hotfix-20260608a.js` | **deprecated** — causava pill n14 |

### 1.3 Config e build

| Arquivo | Status | Notas |
|---------|--------|-------|
| `assets/js/config.js` | **active** | `APP_CONFIG`, `BUILD`, flags Additional App |
| `assets/js/build-id.js` | **active** | `__BOM_BUILD_ID__` |
| `assets/js/bom-bundle.js` | **unknown** | Cópia/latest bundle; produção usa `bom-bundle-bom20260607a.js` |
| `assets/js/bom-bundle-bom20260607a.js` | **active** | Bundle pinado pelo widget 08i |
| `assets/js/bom-bundle-bom202606*.js` (histórico) | **deprecated** | Builds antigos; manter até limpeza Fase 5 |

### 1.4 UI e serviços (dentro do bundle + módulos soltos)

| Arquivo | Status | Motivo |
|---------|--------|--------|
| `assets/js/app.js` | **active** | Bootstrap App, status, botões |
| `assets/js/ui/sync-banner.js` | **active** | Banner sync (mensagens mirror — a repointar DEC-018) |
| `assets/js/ui/kpi-cards.js` | **active** | KPIs |
| `assets/js/services/bom-service.js` | **active** | Estado da árvore / nós |
| `assets/js/services/metrics-engine.js` | **active** | Métricas |
| `assets/js/services/api-diagnostic.js` | **diagnostic** | Diagnóstico API WAF/dseng |
| `assets/js/services/bom-orchestrator.js` | **active** | Orquestração carga (legado multi-fonte) |
| `assets/js/integration/enovia-api.js` | **active** | Cliente REST browser (WAFData) |
| `assets/js/platform/waf-client.js` | **active** | WAFData helper |
| `assets/js/platform/compass.js` | **active** | Compass services |

### 1.5 Legado suspeito (frontend)

| Arquivo | Status | Risco remoção | Recomendação |
|---------|--------|---------------|--------------|
| `assets/js/integration/product-explorer-bridge.js` | **deprecated** | Alto — muito acoplado | Fase 5: remover do load chain; manter arquivo até PR5 |
| `assets/js/integration/explorer-mirror-provider.js` | **deprecated** | Médio | Remover do widget após PR4 estável |
| `assets/js/ui/snapshot-panel.js` | **deprecated** | Médio | Clipboard Ctrl+C — já patcheado no hotfix |
| `assets/js/services/paste-bom-loader.js` | **deprecated** | Baixo | Não usar em fluxo principal |
| `assets/js/services/tsv-bom-loader.js` | **deprecated** | Baixo | Idem |
| `assets/js/services/file-import-service.js` | **deprecated** | Médio | Import TSV/Excel legado |
| `assets/js/services/explorer-scanner.js` | **deprecated** | Alto | DOM scrape / varredura Explorer |
| `assets/js/ui/drop-zone.js` | **deprecated** | Baixo | Drag Excel legado |
| `assets/js/ui/explorer-sync-panel.js` | **deprecated** | Médio | Sync Explorer UI legado |
| `assets/js/integration/explorer-context.js` | **unknown** | Baixo | Avaliar uso após PR4 |
| `assets/js/platform/platform-bridge.js` | **diagnostic** | Baixo | postMessage / InterCom |

### 1.6 Outros widgets HTML (não produção 08i)

| Arquivo | Status |
|---------|--------|
| `widget-v3.html`, `widget-v2.html`, `widget-boot.html`, `index.html` | **unknown** / legado |

---

## 2. Backend ativo (`backend/`)

### 2.1 Pacote

| Arquivo | Status |
|---------|--------|
| `backend/package.json` | **active** — `html-product-explore-bom-resolver` v0.1.0, Node ≥20 |
| `backend/src/server.js` | **active** — Express, CORS, rotas |

### 2.2 Rotas registradas (`server.js`)

| Método | Rota | Handler | Status |
|--------|------|---------|--------|
| GET | `/health` | inline | **active** |
| POST | `/api/bom/resolve` | `resolveBom` | **active** — legado server-auth |
| POST | `/api/bom/browser/start` | `startBrowserBomJob` | **active** — browser-auth bridge |
| POST | `/api/bom/browser/continue` | `continueBrowserBomJob` | **active** |
| POST | `/api/bom/expand-item/start` | `startExpandItemJob` | **diagnostic** |

### 2.3 Serviços

| Arquivo | Status | Função |
|---------|--------|--------|
| `backend/src/services/bomResolver.js` | **active** | Crawl BOM EngItem/EngInstance; `resolveBom` |
| `backend/src/services/enoviaClient.js` | **active** | Cliente HTTP ENOVIA (GET, CSRF, search, EngInstance) |
| `backend/src/services/browserAuthJobs.js` | **active** | Jobs browser-auth para widget |
| `backend/src/services/expandItemJobs.js` | **diagnostic** | Expand Item assíncrono |

### 2.4 Variáveis de ambiente (backend)

| Variável | Uso |
|----------|-----|
| `PORT` | Porta Express |
| `CORS_ORIGIN` | Origens CORS explícitas |
| `SPACE_URL` | Base 3DSpace |
| `ENO_CSRF_TOKEN` | CSRF |
| `SECURITY_CONTEXT` | Header SecurityContext |
| `ENOVIA_COOKIE` | Cookie sessão |
| `ENOVIA_BEARER_TOKEN` | Bearer opcional |
| `AUTO_CSRF` | Buscar CSRF automaticamente |
| `BOM_MAX_ITEMS`, `BOM_PAGE_SIZE`, `BOM_MAX_DEPTH` | Limites crawl |

### 2.5 Futuro (não existente no PR 1)

| Arquivo planejado | PR |
|------------------|-----|
| `backend/src/services/threeDxConfig.js` | 3 |
| `backend/src/services/threeDxDsengClient.js` | 3 |
| `backend/src/routes/threeDxBomRoutes.js` | 2–3 |
| `backend/src/services/threeDxBomService.js` | 2–3 |
| `backend/src/services/threeDxBomNormalizer.js` | 2–3 |

---

## 3. Documentação relevante

| Arquivo | Status |
|---------|--------|
| `docs/DEC-017-*.md` | **active** — gate mirror |
| `docs/DEC-016-*.md` | **deprecated** — direção mirror encerrada |
| `docs/DEC-015-*.md` | **diagnostic** — Expand Item |
| `docs/DEC-018-*.md` | **active** — nova arquitetura |
| `docs/DECISOES-TECNICAS.md` | **active** — histórico decisões |

---

## 4. Scripts e deploy

| Arquivo | Status |
|---------|--------|
| `scripts/deploy.ps1` | **active** — GitHub Pages |
| `scripts/build-bundle.ps1` | **active** |
| `render.yaml` / Render config | **unknown** — verificar no repo se existir |

---

## 5. Resumo executivo

| Camada | Ativo hoje | Alvo DEC-018 |
|--------|------------|--------------|
| Fonte dados frontend | Explorer Mirror (vazio) + WAF/bridge legado | **Render `/api/3dx/bom/structure`** |
| Backend Render | `/api/bom/*` legado | **+ SKA routes** sem quebrar legado |
| Legado alto risco | `product-explorer-bridge`, `explorer-scanner`, mirror | **Isolar Fase 5** |

**Próximo passo:** PR 5 — limpeza legado Explorer Mirror / clipboard (após merge PR 4).
