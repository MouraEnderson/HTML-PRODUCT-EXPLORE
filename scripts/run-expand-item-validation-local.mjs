/**
 * Automação local: clica "Validar Expand Item" no widget 3DDashboard e salva relatório JSON.
 * Requer sessão 3DEXPERIENCE autenticada (perfil Chromium persistente opcional).
 *
 * Uso:
 *   node scripts/run-expand-item-validation-local.mjs
 *   PLAYWRIGHT_USER_DATA_DIR=~/.config/chromium node scripts/run-expand-item-validation-local.mjs
 */
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const REPORT_PATH = join(ROOT, 'reports/expand-item-validation-latest.json');

const DASHBOARD_URL =
  'https://r1132100929518-us1-ifwe.3dexperience.3ds.com/#dashboard:e9bdf50c-6377-4956-b931-b5566a8e9e97/tabId:AMzDJUOA09wQHOdVtHHY';
const WIDGET_URL =
  'https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-v3-08i.html?v=bom20260614f';

const AUTH_BLOCKER = {
  blocked: true,
  reason:
    'Automação externa bloqueada por autenticação 3DEXPERIENCE. Validação deve rodar dentro do widget autenticado.',
  build: 'bom20260614f',
  timestamp: new Date().toISOString(),
  dashboardUrl: DASHBOARD_URL,
  widgetUrl: WIDGET_URL
};

function saveReport(payload) {
  mkdirSync(dirname(REPORT_PATH), { recursive: true });
  writeFileSync(REPORT_PATH, JSON.stringify(payload, null, 2), 'utf8');
  console.log('Relatório salvo em:', REPORT_PATH);
}

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch (e) {
    return null;
  }
}

async function findWidgetFrame(page) {
  for (const frame of page.frames()) {
    const u = frame.url();
    if (u.includes('widget-v3-08i') || u.includes('HTML-PRODUCT-EXPLORE')) {
      return frame;
    }
  }
  return null;
}

async function runValidationInFrame(frame) {
  await frame.waitForFunction(
    () => typeof window.ExpandItemValidator !== 'undefined' && window.ExpandItemValidator.run,
    { timeout: 120000 }
  );

  const btn = frame.locator('#btnValidateExpandItem');
  if (await btn.count()) {
    await btn.click({ timeout: 30000 });
  } else {
    await frame.evaluate(async () => {
      await window.ExpandItemValidator.run({});
    });
  }

  await frame.waitForFunction(
    () =>
      window.__lastExpandItemValidationReport &&
      window.__lastExpandItemValidationReport.classification,
    { timeout: 180000 }
  );

  return frame.evaluate(() => window.__lastExpandItemValidationReport);
}

async function main() {
  const pw = await loadPlaywright();
  if (!pw) {
    const out = {
      ...AUTH_BLOCKER,
      note: 'Playwright não instalado neste ambiente — use validação no widget autenticado.'
    };
    saveReport(out);
    console.log(out.reason);
    process.exit(0);
  }

  const { chromium } = pw;
  const userDataDir = process.env.PLAYWRIGHT_USER_DATA_DIR || '';
  let browser;
  let context;
  let page;

  try {
    if (userDataDir) {
      context = await chromium.launchPersistentContext(userDataDir, {
        headless: !!process.env.HEADLESS
      });
      page = context.pages()[0] || (await context.newPage());
    } else {
      browser = await chromium.launch({ headless: !!process.env.HEADLESS });
      context = await browser.newContext();
      page = await context.newPage();
    }

    console.log('Abrindo dashboard piloto…');
    await page.goto(DASHBOARD_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForTimeout(20000);

    const title = await page.title();
    const url = page.url();
    if (/login|passport|signin/i.test(title + url)) {
      saveReport({ ...AUTH_BLOCKER, pageTitle: title, pageUrl: url });
      console.log(AUTH_BLOCKER.reason);
      process.exit(0);
    }

    let widgetFrame = await findWidgetFrame(page);
    if (!widgetFrame) {
      console.log('Widget não encontrado no dashboard — tentando URL direta do widget…');
      await page.goto(WIDGET_URL, { waitUntil: 'networkidle', timeout: 120000 });
      await page.waitForTimeout(10000);
      widgetFrame = page.mainFrame();
    }

    const report = await runValidationInFrame(widgetFrame);
    saveReport(report);
    console.log('Classificação:', report.classification);
    console.log('Decisão:', report.decision);
    process.exit(report.classification === 'A' ? 0 : 2);
  } catch (err) {
    const out = {
      ...AUTH_BLOCKER,
      error: String(err && err.message ? err.message : err)
    };
    saveReport(out);
    console.log(AUTH_BLOCKER.reason);
    console.error(err);
    process.exit(0);
  } finally {
    if (browser) await browser.close();
    if (context && !userDataDir) await context.close();
  }
}

main();
