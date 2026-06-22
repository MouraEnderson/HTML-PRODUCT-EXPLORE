/**
 * WAFData probe no 3DDashboard piloto — requer sessão 3DEXPERIENCE autenticada.
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DASHBOARD_URL =
  'https://r1132100929518-us1-ifwe.3dexperience.3ds.com/#dashboard:e9bdf50c-6377-4956-b931-b5566a8e9e97/tabId:AMzDJUOA09wQHOdVtHHY';
const WIDGET_URL =
  'https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-v3-08i.html?v=bom20260617d';
const PROBE_LOCAL = path.join(__dirname, '../assets/js/wafdata-probe-bom20260617d.js');
const PROBE_GH =
  'https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/assets/js/wafdata-probe-bom20260617d.js?v=bom20260617d';

async function findWidgetFrame(page, timeoutMs = 120000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    for (const frame of page.frames()) {
      const u = frame.url();
      if (u.includes('widget-v3-08i') || u.includes('HTML-PRODUCT-EXPLORE')) {
        return frame;
      }
    }
    await page.waitForTimeout(2000);
  }
  return null;
}

async function injectProbe(frame) {
  const hasProbe = await frame.evaluate(() => typeof window.__bomWafProbe !== 'undefined');
  if (hasProbe) return 'already-loaded';
  let source = '';
  try {
    source = readFileSync(PROBE_LOCAL, 'utf8');
  } catch {
    const res = await fetch(PROBE_GH);
    if (!res.ok) throw new Error('Probe script not on GitHub Pages yet: ' + res.status);
    source = await res.text();
  }
  await frame.evaluate((code) => {
    // eslint-disable-next-line no-eval
    eval(code);
  }, source);
  return 'injected';
}

async function runWafProbe(frame) {
  await frame.waitForFunction(
    () => typeof window.__bomWafProbe !== 'undefined' && typeof window.__bomWafProbe.runAll === 'function',
    { timeout: 60000 }
  );
  return frame.evaluate(async () => {
    try {
      return await window.__bomWafProbe.runAll();
    } catch (e) {
      return { pass: false, error: String(e && e.message ? e.message : e) };
    }
  });
}

async function main() {
  const mode = process.env.WAF_PROBE_MODE || 'dashboard';
  let page;
  let closeFn = async () => {};

  const userDataDir = process.env.CHROME_USER_DATA_DIR || '';
  if (userDataDir) {
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      channel: 'chrome',
      args: ['--disable-blink-features=AutomationControlled']
    });
    page = context.pages()[0] || (await context.newPage());
    closeFn = () => context.close();
  } else {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    page = await context.newPage();
    closeFn = () => browser.close();
  }

  const consoleLogs = [];
  page.on('console', (msg) => {
    const t = msg.text();
    if (t.includes('__bomWafProbe') || t.includes('WAFData') || t.includes('WAF')) {
      consoleLogs.push(t);
    }
  });

  let report = null;
  let widgetFrame = null;

  if (mode === 'widget-only') {
    console.log('=== Widget direto (sem sessão 3DX — WAFData esperado FAIL) ===');
    await page.goto(WIDGET_URL, { waitUntil: 'networkidle', timeout: 120000 });
    await page.waitForTimeout(12000);
    widgetFrame = page.mainFrame();
  } else {
    console.log('=== 3DDashboard piloto ===');
    await page.goto(DASHBOARD_URL, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.waitForTimeout(20000);
    console.log('title:', await page.title());
    console.log('url:', page.url());
    console.log('frames:', page.frames().length);
    widgetFrame = await findWidgetFrame(page);
    if (!widgetFrame) {
      console.log(JSON.stringify({
        pass: false,
        blocker: 'widget frame not found — login required or dashboard not loaded',
        title: await page.title(),
        url: page.url(),
        frameUrls: page.frames().map((f) => f.url().slice(0, 120))
      }, null, 2));
      await closeFn();
      process.exit(2);
    }
    console.log('widget frame:', widgetFrame.url().slice(0, 140));
    await page.waitForTimeout(8000);
  }

  const injectStatus = await injectProbe(widgetFrame);
  console.log('probe inject:', injectStatus);

  report = await runWafProbe(widgetFrame);
  console.log('\n=== WAFData probe report ===');
  console.log(JSON.stringify(report, null, 2));
  if (consoleLogs.length) {
    console.log('\n=== console (__bomWafProbe) ===');
    consoleLogs.forEach((l) => console.log(l));
  }

  await closeFn();
  process.exit(report && report.pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
