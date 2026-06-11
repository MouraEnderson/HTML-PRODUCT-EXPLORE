/**
 * Tentativa de validação __expandItemProbe no 3DDashboard piloto.
 * Requer sessão 3DEXPERIENCE autenticada no contexto do browser.
 */
import { chromium } from 'playwright';

const DASHBOARD_URL =
  'https://r1132100929518-us1-ifwe.3dexperience.3ds.com/#dashboard:e9bdf50c-6377-4956-b931-b5566a8e9e97/tabId:AMzDJUOA09wQHOdVtHHY';
const WIDGET_URL =
  'https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-v3-08i.html?v=bom20260614a';
const LEVELS = [1, 2, 99];

async function collectConsole(page) {
  const logs = [];
  page.on('console', (msg) => {
    const t = msg.text();
    if (t.includes('[ExpandItemProvider]')) logs.push(t);
  });
  return logs;
}

async function runProbeInFrame(frame, levels) {
  return frame.evaluate(async (lv) => {
    if (typeof window.__expandItemProbe !== 'function') {
      return { error: '__expandItemProbe indisponível' };
    }
    try {
      const result = await window.__expandItemProbe(lv);
      const rows = window.__lastExpandItemRows;
      return {
        levels: lv,
        rootId: result && result.rootId,
        rawMemberCount: result && result.payload && result.payload.member && result.payload.member.length,
        pathCount: rows && rows.stats && rows.stats.pathCount,
        normalizedRows: rows && rows.rows && rows.rows.length,
        firstPath: rows && rows.rows && rows.rows[0],
        hasPayload: !!window.__lastExpandItemPayload,
        hasRows: !!(rows && rows.rows && rows.rows.length)
      };
    } catch (e) {
      return { error: String(e && e.message ? e.message : e), levels: lv };
    }
  }, levels);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const expandLogs = await collectConsole(page);

  console.log('=== Direct widget probe (sem auth 3DX) ===');
  await page.goto(WIDGET_URL, { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForTimeout(8000);
  const direct = await runProbeInFrame(page.mainFrame(), 2);
  console.log(JSON.stringify(direct, null, 2));
  console.log('ExpandItemProvider logs:', expandLogs.slice(-20));

  console.log('\n=== 3DDashboard (requer sessão) ===');
  expandLogs.length = 0;
  await page.goto(DASHBOARD_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(15000);

  const title = await page.title();
  const url = page.url();
  console.log('title:', title);
  console.log('url:', url);

  const frames = page.frames();
  console.log('frames:', frames.length);

  let widgetFrame = null;
  for (const f of frames) {
    const u = f.url();
    if (u.includes('widget-v3-08i') || u.includes('HTML-PRODUCT-EXPLORE')) {
      widgetFrame = f;
      console.log('widget frame:', u.slice(0, 120));
      break;
    }
  }

  const results = [];
  if (!widgetFrame) {
    console.log('BLOCKER: widget BOM não encontrado (login ou dashboard não carregou)');
    await browser.close();
    process.exit(2);
  }

  await widgetFrame.waitForFunction(() => typeof window.__expandItemProbe === 'function', {
    timeout: 90000
  }).catch(() => null);

  for (const lv of LEVELS) {
    expandLogs.length = 0;
    const r = await runProbeInFrame(widgetFrame, lv);
    results.push(r);
    console.log('\n--- probe(' + lv + ') ---');
    console.log(JSON.stringify(r, null, 2));
    console.log('logs:', expandLogs);
    await page.waitForTimeout(2000);
  }

  await browser.close();
  const ok = results.every((r) => !r.error && r.pathCount > 0 && r.normalizedRows > 0);
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
