/**
 * Prova automatizada: runtime wafdata-session carregado (sem root-stability hijack).
 * Uso: node scripts/waf-ebom-runtime-proof.mjs
 *      WIDGET_URL=http://127.0.0.1:8765/widget-v3-08i.html node scripts/waf-ebom-runtime-proof.mjs
 */
import { chromium } from 'playwright';

const EXPECTED_CACHE = 'waf3dx20260620g';
const DEFAULT_URL =
  'https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/widget-v3-08i.html?v=bom20260617d&c=' +
  EXPECTED_CACHE;
const WIDGET_URL = process.env.WIDGET_URL || DEFAULT_URL;

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(WIDGET_URL, { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForTimeout(12000);

  const state = await page.evaluate(async (expectedCache) => {
    const advanced = document.querySelector('.bom-topbar-more');
    if (advanced && advanced.open !== undefined) advanced.open = true;
    if (window.__bomSkaServiceInstall) window.__bomSkaServiceInstall();
    await new Promise((r) => setTimeout(r, 800));

    const scripts = Array.from(document.querySelectorAll('script[src]'))
      .map((s) => s.src)
      .filter((u) => /widget-runtime|hotfix|root-stability|waf3dx/.test(u));

    const assertFn = window.__BOM_ASSERT_WAF_EBOM__ ? window.__BOM_ASSERT_WAF_EBOM__() : null;
    const pill = document.querySelector('.bom-build-pill');
    const proof = document.getElementById('wafEbomRuntimeProof');

    return {
      releaseCommit: window.__BOM_RELEASE_COMMIT__ || '',
      dataSource: window.__BOM_DATA_SOURCE__ || '',
      scripts,
      hasRootStabilityScript: scripts.some((u) => /bom-root-stability/.test(u)),
      assertFn,
      pillTitle: pill ? pill.title : '',
      proofText: proof ? proof.textContent : '',
      loadViaOk: assertFn ? assertFn.loadViaExplorerSync === true : false,
      defaultSpaceOk: assertFn ? assertFn.defaultSpaceUrlDefined === true : false
    };
  }, EXPECTED_CACHE);

  console.log(JSON.stringify(state, null, 2));

  const pass =
    state.releaseCommit === EXPECTED_CACHE &&
    state.dataSource === 'wafdata-session' &&
    !state.hasRootStabilityScript &&
    state.loadViaOk &&
    state.defaultSpaceOk &&
    (state.proofText || '').indexOf('wafdata-session') >= 0;

  console.log('\nPASS waf-ebom-runtime:', pass);
  await browser.close();
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
