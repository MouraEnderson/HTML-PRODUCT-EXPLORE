import { chromium } from 'playwright';

const BUILD = 'bom20260617c';
const COMMIT = '646f0f4';
const URL = `http://localhost:8080/widget-v3-08i.html?v=${BUILD}&probe=${COMMIT}`;
const ROOT = '63FC553465A62400699E0792000086AB';
const results = [];

function ok(name, pass, detail) {
  results.push({ name, pass, detail: detail || '' });
  console.log((pass ? 'OK' : 'FAIL') + ' - ' + name + (detail ? ': ' + detail : ''));
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const consoleErrors = [];
const skaPosts = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => consoleErrors.push(String(err.message || err)));
page.on('request', (req) => {
  if (req.url().includes('/api/3dx/bom/structure') && req.method() === 'POST') {
    skaPosts.push(req.postDataJSON());
  }
});

try {
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(6000);

  const probe = await page.evaluate(() =>
    typeof window.__BOM_RELEASE_PROBE__ === 'function' ? window.__BOM_RELEASE_PROBE__() : null
  );
  ok('Test A: __BOM_RELEASE_PROBE__ exists', !!probe, JSON.stringify(probe));
  ok('Test A: probe.build === bom20260617c', probe && probe.build === BUILD, probe && probe.build);
  ok('Test A: probe.hotfix 17c', probe && probe.hotfix === 'bom-ska-service-hotfix-20260617c.js', probe && probe.hotfix);
  ok('Test A: probe.runtime 17c', probe && probe.runtime === 'widget-runtime-bom20260617c.js', probe && probe.runtime);

  const pill = await page.locator('.bom-build-pill').textContent();
  ok('Test A: pill shows 17c', pill && pill.trim() === '17c', pill);

  const scripts = await page.evaluate(() =>
    Array.from(document.scripts)
      .map((s) => s.src)
      .filter(Boolean)
  );
  ok('Test A: no hotfix 17b script', !scripts.some((s) => s.indexOf('bom-ska-service-hotfix-20260617b') >= 0));
  ok('Test A: runtime 17c loaded', scripts.some((s) => s.indexOf('widget-runtime-bom20260617c') >= 0));
  ok('Test A: hotfix 17c loaded', scripts.some((s) => s.indexOf('bom-ska-service-hotfix-20260617c') >= 0));

  const layoutClass = await page.locator('.bom-layout-page.bom-3dx-product-dashboard').count();
  ok('Test A: 3DX product dashboard layout class', layoutClass === 1, String(layoutClass));

  const tableRowsInitial = await page.locator('#bomTable tbody tr').count();
  const kpiInitial = await page.locator('#kpiGrid').textContent();
  const chartEmpty = await page.locator('.bom-charts-empty-state').count();
  ok('Test B: initial table empty message', tableRowsInitial >= 1, String(tableRowsInitial));
  ok('Test B: KPI no fake total 1', !kpiInitial || kpiInitial.indexOf('Total linhas0') >= 0 || kpiInitial.indexOf('—') >= 0, kpiInitial);
  ok('Test B: charts empty state class', chartEmpty >= 1, String(chartEmpty));
  const statusText = await page.locator('#explorerContextStatus').textContent();
  ok(
    'Test B: status pre-sync (not synced)',
    statusText &&
      (statusText.indexOf('Aguardando') >= 0 ||
        statusText.indexOf('Contexto indisponível') >= 0 ||
        statusText.indexOf('sem rootId') >= 0),
    statusText
  );

  skaPosts.length = 0;
  await page.evaluate(() => {
    window.ProductExplorerSyncProvider = window.ProductExplorerSyncProvider || {};
    window.ProductExplorerSyncProvider.getContext = function () {
      return {
        title: 'CJ MESA label only',
        selectedId: 'CJ MESA',
        rootId: 'CJ MESA',
        source: 'PRODUCT_EXPLORER_CONTEXT'
      };
    };
    window.ProductExplorerSyncProvider.refresh = function () {
      return Promise.resolve(window.ProductExplorerSyncProvider.getContext());
    };
  });
  await page.click('#btnSyncExplorer');
  await page.waitForTimeout(1500);
  ok('Test C: invalid context does not POST SKA', skaPosts.length === 0, String(skaPosts.length));
  const diagInvalid = await page.locator('#skaBomDiagnostics .bom-ska-diag-summary').textContent();
  ok('Test C: diagnostics shows context unavailable', diagInvalid && diagInvalid.indexOf('Contexto') >= 0, diagInvalid);
  const kpiAfterInvalid = await page.locator('#kpiGrid').textContent();
  ok('Test C: KPI not showing 1', !kpiAfterInvalid || kpiAfterInvalid.indexOf('Total linhas1') < 0, kpiAfterInvalid);
  const chartStillEmpty = await page.locator('.bom-charts-empty-state').count();
  ok('Test C: charts still empty', chartStillEmpty >= 1, String(chartStillEmpty));

  skaPosts.length = 0;
  await page.evaluate((rootId) => {
    window.renderEmptySkaState('ROOT_NOT_FOUND', {
      errorCode: 'ROOT_NOT_FOUND',
      contextMeta: {
        source: 'PlatformAPI',
        candidateRootId: rootId,
        rootIdUsed: rootId,
        validationStatus: 'VALID'
      },
      statusMessage: 'RootId não encontrado ou não acessível.',
      statusKind: 'error'
    });
  }, ROOT);
  await page.waitForTimeout(800);
  const kpiRootNotFound = await page.locator('#kpiGrid').textContent();
  const tableRootNotFound = await page.locator('#bomTable tbody tr').count();
  ok('Test D: ROOT_NOT_FOUND KPI zero', kpiRootNotFound && kpiRootNotFound.indexOf('Total linhas0') >= 0, kpiRootNotFound);
  ok('Test D: ROOT_NOT_FOUND table cleared', tableRootNotFound <= 1, String(tableRootNotFound));
  ok('Test D: ROOT_NOT_FOUND charts empty', (await page.locator('.bom-charts-empty-state').count()) >= 1);

  skaPosts.length = 0;
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

  const reqHeaders = response.request().headers();
  ok('Test E: SKA POST 200', response.status() === 200, String(response.status()));
  ok('Test E: credentials omit', !reqHeaders.cookie, reqHeaders.cookie || 'none');
  ok('Test E: no authorization header', !reqHeaders.authorization, reqHeaders.authorization || 'none');

  const payload = await response.json();
  const rows = payload.rows ? payload.rows.length : 0;
  const total = payload.counts ? payload.counts.totalRows : 0;
  ok('Test E: rows.length = 5', rows === 5, String(rows));
  ok('Test E: counts.totalRows = 5', total === 5, String(total));

  await page.waitForTimeout(3000);
  const tableRows = await page.locator('#bomTable tbody tr').count();
  ok('Test E: table shows 5', tableRows === 5, String(tableRows));
  const kpiText = await page.locator('#kpiGrid').textContent();
  ok('Test E: KPI mentions 5', kpiText && kpiText.indexOf('5') >= 0, kpiText);
  const pager = await page.locator('#tablePager').textContent();
  ok('Test E: pager shows 5', pager && pager.indexOf('5') >= 0, pager);
  ok('Test E: charts not empty state', (await page.locator('.bom-charts-empty-state').count()) === 0);

  const criticalErrors = consoleErrors.filter(
    (e) => e.indexOf('favicon') < 0 && e.indexOf('404') < 0
  );
  ok('no critical console errors', criticalErrors.length === 0, criticalErrors.join(' | '));
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
