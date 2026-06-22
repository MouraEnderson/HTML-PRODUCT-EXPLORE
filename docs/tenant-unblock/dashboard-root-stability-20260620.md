# BOM Analytics — Dashboard root stability fix (2026-06-20)

## Scope

This note documents the root/E-BOM stability correction for `widget-v3-08i.html` / build `bom20260617d`.

The fix is intentionally limited to E-BOM root resolution and frontend state preservation. It does not change 3DView, lifecycle/maturity, Derived Outputs, or layout/CSS.

## Problem observed

Inside 3DEXPERIENCE Web Page Reader, Product Structure Explorer displays the assembly:

- `CJ MESA 4BCS VP TOP 3DX`
- 5 visible objects
- root + children visible in the native Product Structure Explorer

But BOM Analytics showed:

- `Contexto sem rootId dseng válido`
- `source: ExplorerContext`
- `item: CJ MESA 4BCS VP TOP 3DX`
- `linhas: 0`
- `seleção PSE não disponível por API oficial`
- E-BOM empty / `0 peças`

## Root cause

Product Structure Explorer may expose only a partial context to a Web Page Reader widget. In that situation the dashboard can see the visible title (`CJ MESA 4BCS VP TOP 3DX`) but not the official dseng EngItem root id.

The correct dseng root id for the validation structure is:

```txt
63FC553465A62400699E0792000086AB
```

The code must not treat a partial PSE context as a final failure when a known or previously successful root exists.

## Fix applied

A stability overlay was hardened:

```txt
assets/js/bom-root-stability-bom20260617d.js
```

Widget cache was bumped in:

```txt
widget-v3-08i.html
RELEASE_COMMIT = rootfix20260620a
```

## Correct load order

The runtime still loads:

```txt
widget-v3-08i.html
→ assets/js/widget-runtime-bom20260617d.js
→ base bundle/provider/hotfix
→ assets/js/bom-root-stability-bom20260617d.js
```

## Root resolution strategy

The overlay resolves the root in this order:

1. Explicit dseng root id from Product Explorer context, if available.
2. Last successful root saved in localStorage.
3. Backend `/resolve-selection` from Product Explorer title/candidates.
4. Known validation root bootstrap for `CJ MESA 4BCS VP TOP 3DX` in tenant `r1132100929518-us1`.
5. Error only if no root can be resolved.

## Persistent key

The persisted key is:

```txt
bomAnalytics:lastGoodContext:bom20260617d
```

Only safe context values are stored:

```json
{
  "build": "bom20260617d",
  "tenant": "r1132100929518-us1",
  "spaceUrl": "https://r1132100929518-us1-space.3dexperience.3ds.com/enovia",
  "rootId": "63FC553465A62400699E0792000086AB",
  "rootTitle": "CJ MESA 4BCS VP TOP 3DX",
  "rootName": "prd-R1132100929518-01103695",
  "mode": "dseng-official",
  "expandStrategy": "expand-item",
  "depth": 1,
  "expandDepth": 1,
  "includeRoot": true,
  "lastSuccessAt": "ISO_DATE"
}
```

No cookies, tokens, bearer values, CSRF values, passwords, JSESSIONIDs, or authorization headers are persisted.

## Anti-regression rules

The dashboard must not:

- clear a previously valid E-BOM because Product Explorer only supplied a title;
- persist `rows = 0` as the last good context;
- overwrite valid context with `RESOLVE_PENDING`, `SELECTION_NOT_RESOLVED`, auth errors, or empty rows;
- clear the UI before a new `/structure` call returns a valid payload.

## Validation checklist

Run backend validation:

```bash
curl -s https://bom-resolver.onrender.com/api/3dx/bom/health
curl -s https://bom-resolver.onrender.com/api/3dx/bom/health/authcheck
curl -s -X POST https://bom-resolver.onrender.com/api/3dx/bom/structure \
  -H "Content-Type: application/json" \
  -d '{
    "rootId":"63FC553465A62400699E0792000086AB",
    "depth":1,
    "expandDepth":1,
    "includeRoot":true,
    "mode":"dseng-official",
    "expandStrategy":"expand-item"
  }'
```

Expected:

```txt
rows.length = 5
counts.totalRows = 5
```

Run frontend validation:

1. Open the Web Page Reader widget.
2. Confirm `window.__BOM_ROOT_STABILITY_REV__ === "rootfix20260620a"`.
3. Confirm `window.__BOM_ROOT_STABILITY_KEY__ === "bomAnalytics:lastGoodContext:bom20260617d"`.
4. If localStorage is empty, open Product Structure Explorer with `CJ MESA 4BCS VP TOP 3DX` and wait for boot fallback or click Atualizar.
5. Confirm E-BOM renders 5 rows.
6. Close and reopen browser.
7. Confirm E-BOM is recoverable from `lastGoodContext`.

## Remaining work outside this fix

3DView and maturity are not solved by this change.

3DView still requires:

- dsdo Derived Outputs to return GLB/glTF/OBJ/STL;
- DownloadTicket/FCS download to be available;
- tenant Derived Format configuration.

Maturity still requires:

- official lifecycle/direct transition endpoint and payload;
- real transition list;
- stateAfter verification after change.
