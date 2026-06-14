import { chromium } from 'playwright';

const BUILD = 'bom20260617d';
const COMMIT = '704cc36';
const URL = `http://localhost:8080/widget-v3-08i.html?v=${BUILD}&probe=${COMMIT}`;
const ROOT = '63FC553465A62400699E0792000086AB';
const results = [];

function ok(name, pass, detail) {
  results.push({ name, pass, detail: detail || '' });
  console.log((pass ? 'OK' : 'FAIL') + ' - ' + name + (detail ? ': ' + detail : ''));
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const posts = [];
page.on('request', (req) => {
  if (req.method() === 'POST' && req.url().includes('/api/3dx/bom/')) {
    posts.push({ url: req.url(), body: req.postDataJSON() });
  }
});

try {
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(6000);

  const probe = await page.evaluate(() =>
    typeof window.__BOM_RELEASE_PROBE__ === 'function' ? window.__BOM_RELEASE_PROBE__() : null
  );
  ok('Test A: probe build 17d', probe && probe.build === BUILD, probe && probe.build);
  ok('Test A: hotfix 17d', probe && probe.hotfix === 'bom-ska-service-hotfix-20260617d.js', probe && probe.hotfix);

  const rawCtx = await page.evaluate(() =>
    window.ProductExplorerSyncProvider && window.ProductExplorerSyncProvider.getRawSelectionContext
      ? window.ProductExplorerSyncProvider.getRawSelectionContext()
      : null
  );
  ok('Test A: getRawSelectionContext exists', !!rawCtx, JSON.stringify(rawCtx && rawCtx.source));

  posts.length = 0;
  await page.click('#btnSyncExplorer');
  await page.waitForTimeout(2500);
  ok(
    'Test C: sync calls /resolve-selection',
    posts.some((p) => p.url.includes('/api/3dx/bom/resolve-selection')),
    posts.map((p) => p.url).join(' | ')
  );
  ok(
    'Test C: sync does not call /structure directly first',
    !posts.some((p) => p.url.includes('/api/3dx/bom/structure')),
    posts.map((p) => p.url).join(' | ')
  );

  posts.length = 0;
  await page.locator('summary').click();
  await page.fill('#explorerObjectId', ROOT);
  await page.fill('#skaDepthInput', '1');

  const [response] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/api/3dx/bom/structure') && r.request().method() === 'POST',
      { timeout: 60000 }
    ),
    page.click('#btnTestRootId')
  ]);
  ok('Test E: advanced uses /structure', response.status() === 200, String(response.status()));
  const payload = await response.json();
  ok('Test E: rows.length = 5', (payload.rows || []).length === 5, String((payload.rows || []).length));
  await page.waitForTimeout(2500);
  ok('Test E: table shows 5', (await page.locator('#bomTable tbody tr').count()) === 5);

  posts.length = 0;
  await page.evaluate(() => {
    window.ProductExplorerSyncProvider.getRawSelectionContext = function () {
      return {
        source: 'PlatformAPI',
        selected: { platformItem: { displayName: 'CJ MESA label only', id: 'CJ MESA' } },
        normalized: { title: 'CJ MESA label only', selectedId: 'CJ MESA', source: 'PRODUCT_EXPLORER_CONTEXT' },
        timestamp: new Date().toISOString(),
        page: '3DEXPERIENCE Web Page Reader'
      };
    };
    window.ProductExplorerSyncProvider.getContext = function () {
      return {
        title: 'CJ MESA label only',
        selectedId: 'CJ MESA',
        source: 'PRODUCT_EXPLORER_CONTEXT',
        path: 'B'
      };
    };
    window.ProductExplorerSyncProvider.refresh = function () {
      return Promise.resolve(window.ProductExplorerSyncProvider.getContext());
    };
  });
  await page.click('#btnSyncExplorer');
  await page.waitForTimeout(3000);
  ok(
    'Test D: invalid selection POSTs resolve-selection',
    posts.some((p) => p.url.includes('/resolve-selection')),
    posts.map((p) => p.url).join(' | ')
  );
  const kpi = await page.locator('#kpiGrid').textContent();
  ok('Test D: no fake KPI 1 on unresolved', !kpi || kpi.indexOf('Total linhas1') < 0, kpi);
} catch (err) {
  ok('test run', false, String(err.message || err));
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.pass);
console.log('\nSUMMARY: ' + (results.length - failed.length) + '/' + results.length + ' passed');
if (failed.length) {
  console.log('FAILED:', failed.map((f) => f.name).join(', '));
  process.exit(1);
}
