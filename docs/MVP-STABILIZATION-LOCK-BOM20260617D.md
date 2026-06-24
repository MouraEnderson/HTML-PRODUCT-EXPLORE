# MVP Stabilization Lock — BOM Analytics 3DEXPERIENCE

Status: **LOCKED FOR MVP**  
Official entrypoint: `widget-v3.html`  
Official MVP build: `bom20260617d`  
Date: 2026-06-24

## Goal

Recover and stabilize the pilot MVP without reintroducing experimental loaders, parsers or UI rewrites.

The MVP flow is:

```text
3DDashboard authenticated
→ Product Structure Explorer open
→ user clicks Sync/Atualizar/Sincronizar with Product Explorer
→ ProductExplorerSyncProvider captures context
→ documented SKA BOM Service / PR23 path resolves selection
→ service returns rows/counts/diagnostics
→ dashboard renders E-BOM, KPIs, maturity, owners
→ row click shows real IDs
→ 3D and maturity write stay blocked until later phases
```

## Official active chain

The official `widget-v3.html` must load only the approved MVP runtime chain:

```text
widget-v3.html
→ assets/css/dashboard.css
→ assets/js/widget-runtime-bom20260617d.js
→ assets/vendor/three.min.js
→ assets/vendor/GLTFLoader.js
→ assets/vendor/OBJLoader.js
→ assets/vendor/STLLoader.js
→ assets/js/ui/bom-3d-viewer.js
→ assets/vendor/chart.umd.min.js
→ assets/js/bom-bundle-bom20260607a.js
→ assets/js/integration/product-explorer-sync-provider.js
→ assets/js/integration/expand-item-provider.js
→ assets/js/bom-ska-service-hotfix-20260617d.js
→ assets/js/waf3dx-client-bom20260617d.js
→ assets/js/wafdata-probe-bom20260617d.js
```

## Explicitly excluded from the official MVP path

The official entrypoint must not load these experimental files:

```text
assets/js/bom-bundle-bom20260623h.js
assets/js/services/expand-path-parser-bom20260623h.js
assets/js/services/attribute-enrichment-bom20260623f.js
assets/js/bom-bundle-bom20260623f.js
assets/js/bom-bundle-bom20260623g.js
```

These files may remain in the repository as historical experiments, but they are not part of the MVP runtime.

## Why they are excluded

`bom20260623h` introduced a front-end Path parser that changed count semantics and produced a dashboard count different from the agreed MVP flow.

`attribute-enrichment-bom20260623f` performed generic deep extraction and allowed function objects to be stringified into E-BOM fields, corrupting `revision`, `owner` and `maturity` columns.

The MVP must render a stable `rows[]` contract from the documented service/hotfix path. It must not infer E-BOM properties through generic front-end enrichment.

## MVP acceptance criteria

### UX

- Layout matches the approved 17d dashboard style.
- Charts, E-BOM and preview panels stay aligned.
- Advanced controls are compact and not the primary user workflow.
- No inline experimental layout replaces `dashboard.css`.

### Data flow

- Product Explorer is the context source.
- Sync/Atualizar/Sincronizar is the only operational load path for MVP.
- No manual root input is presented as the product workflow.
- No DOM scraping, clipboard, TSV, or `window.top.document` dependency.
- No CJ fallback when the active context is SKA or another product.

### E-BOM

- E-BOM rows come from the documented SKA BOM Service / PR23 path.
- Table columns must not show JavaScript function source text.
- Required fields: title, revision, owner, maturity/state, description when available, ids.
- Row click must expose real reference/physical ID and instance ID when available.

### 3D and maturity

- 3D is not considered done in this MVP lock.
- 3DPlay/iframe/postMessage is not success.
- Geometry success requires a later Geometry Resolver with real downloadable/renderable geometry.
- Maturity write requires later reread verification with `stateAfter != stateBefore`.

## Rules for future PRs

1. Do not change `widget-v3.html` to load an experimental bundle without an explicit MVP-unlock decision.
2. Do not add front-end generic attribute enrichment to the official entrypoint.
3. Do not add another finalizer/hotfix that owns the same Sync/Atualizar button.
4. Do not start PR3 or PR4 until PR1/PR2 acceptance is stable for CJ and SKA.
5. Any parser experiment must run behind a non-official test entrypoint, never on `widget-v3.html`.

## Current official files

```text
widget-v3.html
assets/js/build-id.js
assets/js/widget-runtime-bom20260617d.js
assets/js/bom-ska-service-hotfix-20260617d.js
assets/js/integration/product-explorer-sync-provider.js
```
