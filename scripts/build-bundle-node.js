'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const files = [
  'assets/js/embed-query.js',
  'assets/js/config.js',
  'assets/js/platform/widget-runtime.js',
  'assets/js/platform/platform-bridge.js',
  'assets/js/platform/context.js',
  'assets/js/platform/compass.js',
  'assets/js/platform/waf-bootstrap.js',
  'assets/js/platform/waf-client.js',
  'assets/js/integration/3dx-content-parser.js',
  'assets/js/integration/enovia-api.js',
  'assets/js/integration/product-explorer-sync-provider.js',
  'assets/js/services/attribute-service.js',
  'assets/js/processing/metrics-engine.js',
  'assets/js/ui/kpi-cards.js',
  'assets/js/ui/charts-manager.js',
  'assets/js/ui/data-table.js',
  'assets/js/bom-waf-session-controller-bom20260621e.js'
];
const parts = ['/* BOM Analytics bundle snapshot */'];
for (const f of files) {
  parts.push(';/* --- ' + f + ' --- */');
  parts.push(fs.readFileSync(path.join(root, f), 'utf8'));
}
const content = parts.join('\n');
const m = content.match(/BUILD:\s*'([^']+)'/);
const build = m ? m[1] : 'bom-unknown';
const out = path.join(root, 'assets/js/bom-bundle.js');
const versioned = path.join(root, 'assets/js/bom-bundle-' + build + '.js');
fs.writeFileSync(out, content, 'utf8');
fs.writeFileSync(versioned, content, 'utf8');
fs.writeFileSync(path.join(root, 'assets/js/build-id.js'), "window.__BOM_BUILD_ID__='" + build + "';", 'utf8');
console.log('OK', build, content.length, 'bytes');
