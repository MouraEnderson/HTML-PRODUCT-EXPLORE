/**
 * Testa UI Diagnóstico 3DX + boot do widget (GitHub Pages ou servidor local).
 * Uso:
 *   node scripts/widget-diagnostic-ui-playwright.mjs
 *   WIDGET_URL=http://127.0.0.1:8765/widget-v3-08i.html node scripts/widget-diagnostic-ui-playwright.mjs
 */
import { chromium } from 'playwright';

const DEFAULT_URL =
  'https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-v3-08i.html?v=bom20260617d&c=waf3dx20260620g';
const WIDGET_URL = process.env.WIDGET_URL || DEFAULT_URL;

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push('console: ' + msg.text());
  });

  console.log('Loading', WIDGET_URL);
  await page.goto(WIDGET_URL, { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForTimeout(15000);

  const state = await page.evaluate(async () => {
    const out = {
      title: document.title,
      hasDiagBtn: !!document.getElementById('btnWaf3dxDiagToggle'),
      hasModal: !!document.getElementById('waf3dxDiagnosticModal'),
      hasDrawer: !!document.getElementById('waf3dxDiagnosticDrawer'),
      drawerCount: document.querySelectorAll('#waf3dxDiagnosticDrawer').length,
      hasAdvanced: !!document.querySelector('.bom-topbar-more'),
      hasExecutorPanel: !!document.getElementById('waf3dxExecutorPanel'),
      hasRunFullValidationBtn: !!document.getElementById('btnWaf3dxRunFullValidation'),
      hasExportReportBtn: !!document.getElementById('btnWaf3dxExportReport'),
      hasWafClient: typeof window.__waf3dxClient !== 'undefined',
      hasRunFullValidation: typeof window.__waf3dxClient !== 'undefined' && typeof window.__waf3dxClient.runFullValidation === 'function',
      hasExportSanitizedReport: typeof window.__waf3dxClient !== 'undefined' && typeof window.__waf3dxClient.exportSanitizedReport === 'function',
      hasOpenDiagnostic: typeof window.__bomOpen3dxDiagnostic === 'function',
      bootCompleted: !!(window.__BOM_WIDGET_BOOT_STATE__ && window.__BOM_WIDGET_BOOT_STATE__.completed),
      uiReady: !!document.getElementById('waf3dxDiagnosticUiReady'),
      statusBar: (document.getElementById('statusBar') || {}).textContent || '',
      scriptUrls: Array.from(document.querySelectorAll('script[src]'))
        .map((s) => s.src)
        .filter((u) => /waf3dx|widget-runtime|hotfix/.test(u))
    };

    if (window.__waf3dxClient && window.__waf3dxClient.installExecutorUi) {
      window.__waf3dxClient.installExecutorUi();
    }
    if (window.__waf3dxClient && window.__waf3dxClient.installDiagnosticUi) {
      window.__waf3dxClient.installDiagnosticUi();
    }

    const advanced = document.querySelector('.bom-topbar-more');
    if (advanced && advanced.open !== undefined) advanced.open = true;
    await new Promise((r) => setTimeout(r, 400));

    out.hasExecutorPanelAfterOpen = !!document.getElementById('waf3dxExecutorPanel');
    out.hasRunFullValidationBtnAfterOpen = !!document.getElementById('btnWaf3dxRunFullValidation');

    const btn = document.getElementById('btnWaf3dxDiagToggle');
    if (btn) {
      btn.click();
      await new Promise((r) => setTimeout(r, 800));
    }

    const modal = document.getElementById('waf3dxDiagnosticModal');
    const drawer = document.getElementById('waf3dxDiagnosticDrawer');
    out.modalHiddenAfterClick = modal ? modal.classList.contains('bom-hidden') : null;
    out.modalDisplay = modal ? getComputedStyle(modal).display : null;
    out.modalRect = modal ? modal.getBoundingClientRect() : null;
    out.drawerInnerLen = drawer ? drawer.innerHTML.length : 0;
    out.hasTestSessionBtn = !!document.getElementById('btnWaf3dxTestSession');
    out.hasTestEbomBtn = !!document.getElementById('btnWaf3dxTestEbom');
    out.hasDiagnosticPanel = !!document.getElementById('waf3dxDiagnosticPanel');

    if (window.__waf3dxClient && window.__waf3dxClient.detectWafData) {
      out.wafDetect = await window.__waf3dxClient.detectWafData();
    }
    return out;
  });

  console.log('\n=== Widget UI probe ===');
  console.log(JSON.stringify(state, null, 2));
  if (errors.length) {
    console.log('\n=== Errors ===');
    errors.slice(0, 20).forEach((e) => console.log(e));
  }

  const pass =
    state.hasDiagBtn &&
    state.hasWafClient &&
    state.hasRunFullValidation &&
    state.hasExportSanitizedReport &&
    state.hasOpenDiagnostic &&
    state.bootCompleted &&
    state.modalHiddenAfterClick === false &&
    state.hasTestSessionBtn &&
    state.hasDiagnosticPanel &&
    state.drawerInnerLen > 100 &&
    state.hasExecutorPanelAfterOpen &&
    state.hasRunFullValidationBtnAfterOpen;

  await browser.close();
  console.log('\nPASS UI open:', pass);
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
