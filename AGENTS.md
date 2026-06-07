# AGENTS.md

Guidance for cloud agents working in this repository.

## Product

Static HTML/JS **BOM Analytics** dashboard for 3DEXPERIENCE (Additional App on 3DDashboard). No backend, database, or npm dependencies in-repo.

## Cursor Cloud specific instructions

### Dependencies

- **Node.js** (v18+) — build bundle and run regression scripts in `scripts/test-*.js`
- **Python 3** — optional local static server only
- **PowerShell** — optional; Linux agents should use `node scripts/build-bundle-node.js` instead of `scripts/build-bundle.ps1`

There is no `package.json`, Docker, or lint config. Do not run `npm install`.

### Build

```bash
node scripts/build-bundle-node.js
```

Writes `assets/js/bom-bundle-<BUILD>.js`, `assets/js/bom-bundle.js`, and `assets/js/build-id.js` from `assets/js/config.js` `BUILD` value.

### Tests (regression)

```bash
node scripts/test-mont10-import.js
node scripts/test-ska-import.js
node scripts/test-starret-rows.js
node scripts/test-mont10-mixed-icon.js
node scripts/test-acceptance-sprint25.js
```

`test-acceptance-sprint25.js` also checks live GitHub Pages (network required).

### Local static server

```bash
python3 -m http.server 8765
```

- Landing: `http://localhost:8765/index.html`
- `widget-v3.html` loads **CSS, Chart.js, and bundle from GitHub Pages** (`GH` constant), not from localhost — local server is mainly for fixtures (`data/*.json`) and landing page.
- To exercise **uncommitted bundle changes** in the widget UI, deploy to GitHub Pages or temporarily point `GH` in `widget-v3.html` (not for routine agent setup).

### 3DEXPERIENCE E2E (pilot dashboard)

Pilot tab **LISTA 3DX / PRODUCTEXPLORE**:

```
https://r1132100929518-us1-ifwe.3dexperience.3ds.com/#dashboard:e9bdf50c-6377-4956-b931-b5566a8e9e97/tabId:AMzDJUOA09wQHOdVtHHY
```

- Use the browser in the VM; the user's 3DEXPERIENCE session is typically already logged in — **do not ask for credentials**.
- Widget URL on Pages: `https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-boot.html`
- Left: **Product Structure Explorer**; right: **BOM Analytics**.
- Data flow: expand structure in Explorer → ensure **Maturidade** column visible → **Atualizar estrutura** in BOM widget (API-first; paste/Ctrl+C is contingency only).
- **KPIs at 0 with no import/API data is expected**, not a layout bug.

### Deploy (maintainers)

Windows one-click: `powershell -ExecutionPolicy Bypass -File deploy.ps1`  
CI: push to `main` triggers `.github/workflows/deploy-pages.yml`.
