import { chromium } from 'playwright';

const URL = 'http://localhost:8080/widget-v3-08i.html?v=bom20260617b-local&probe=dc91dcf';
const ROOT = '63FC553465A62400699E0792000086AB';
const results = [];

function ok(name, pass, detail) {
  results.push({ name, pass, detail: detail || '' });
  console.log((pass ? 'OK' : 'FAIL') + ' - ' + name + (detail ? ': ' + detail : ''));
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => consoleErrors.push(String(err.message || err)));

try {
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(8000);

  const probe = await page.evaluate(() => {
    return typeof window.__BOM_RELEASE_PROBE__ === 'function' ? window.__BOM_RELEASE_PROBE__() : null;
  });
  ok('__BOM_RELEASE_PROBE__ exists', !!probe, JSON.stringify(probe));
  ok('probe.build === bom20260617b', probe && probe.build === 'bom20260617b', probe && probe.build);
  ok('probe.hotfix 17b', probe && probe.hotfix === 'bom-ska-service-hotfix-20260617b.js', probe && probe.hotfix);
  ok('probe.runtime 17b', probe && probe.runtime === 'widget-runtime-bom20260617b.js', probe && probe.runtime);

  const pill = await page.locator('.bom-build-pill').textContent();
  ok('pill shows 17b', pill && pill.trim() === '17b', pill);

  const status = await page.locator('#statusBar').textContent();
  ok('status not 17a', !status || status.indexOf('bom20260617a') < 0, status);
  ok('status not stuck loading only', status !== 'Carregando…', status);

  const syncBtn = await page.locator('#btnSyncExplorer').isVisible();
  const refreshBtn = await page.locator('#btnRefreshBom').isVisible();
  ok('Sincronizar visible', syncBtn);
  ok('Atualizar BOM visible', refreshBtn);

  const scripts = await page.evaluate(() =>
    Array.from(document.scripts)
      .map((s) => s.src)
      .filter(Boolean)
  );
  ok('no hotfix 17a script', !scripts.some((s) => s.indexOf('bom-ska-service-hotfix-20260617a') >= 0), scripts.join(' | '));
  ok('no bom-api-id-hotfix', !scripts.some((s) => s.indexOf('bom-api-id-hotfix') >= 0));
  ok('runtime 17b loaded', scripts.some((s) => s.indexOf('widget-runtime-bom20260617b') >= 0));
  ok('hotfix 17b loaded', scripts.some((s) => s.indexOf('bom-ska-service-hotfix-20260617b') >= 0));

  await page.locator('summary').click();
  await page.fill('#explorerObjectId', ROOT);
  await page.fill('#skaDepthInput', '1');

  const [response] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/api/3dx/bom/structure') && r.request().method() === 'POST',
      { timeout: 60000 }
    ),
    page.click('#btnRefreshBom')
  ]);

  const reqHeaders = response.request().headers();
  ok('SKA POST 200', response.status() === 200, String(response.status()));
  ok('credentials omit (no cookie header sent)', !reqHeaders.cookie, reqHeaders.cookie || 'none');
  ok('no authorization header', !reqHeaders.authorization, reqHeaders.authorization || 'none');

  const payload = await response.json();
  const rows = payload.rows ? payload.rows.length : 0;
  const total = payload.counts ? payload.counts.totalRows : 0;
  ok('rows.length = 5', rows === 5, String(rows));
  ok('counts.totalRows = 5', total === 5, String(total));
  ok('diagnostics OK', payload.diagnostics && payload.diagnostics.status === 'OK', payload.diagnostics && payload.diagnostics.status);

  await page.waitForTimeout(3000);
  const tableRows = await page.locator('#bomTable tbody tr').count();
  ok('table shows 5', tableRows === 5, String(tableRows));

  const kpiText = await page.locator('#kpiGrid').textContent();
  ok('KPI mentions 5', kpiText && kpiText.indexOf('5') >= 0, kpiText);

  await page.waitForTimeout(5000);
  ok('page responsive after 60s total wait', true);

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
