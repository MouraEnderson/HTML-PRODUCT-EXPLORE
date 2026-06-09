/* BOM hybrid hotfix - 20260608j
 * Caminho de produção:
 * 1) tenta ler grade atual do Product Explorer;
 * 2) se a grade não entregar linhas úteis, usa API ENOVIA controlada;
 * 3) preserva dashboard/HTML existente.
 */
(function (global) {
  'use strict';
  try {
    if (typeof APP_CONFIG !== 'undefined') {
      APP_CONFIG.BUILD = 'bom20260608j';

      /* Explorer continua sendo a primeira tentativa. */
      APP_CONFIG.PRIMARY_LOADER = 'tsv';
      APP_CONFIG.PILOT_GRID_FIRST = true;
      APP_CONFIG.EXPLORER_ONLY = true;
      APP_CONFIG.EXPLORER_AUTO_COPY_ENABLED = true;
      APP_CONFIG.USE_DOM_MIRROR_PRIMARY = true;
      APP_CONFIG.DOM_MIRROR_FALLBACK = true;
      APP_CONFIG.SKIP_MIRROR_ON_TSV = false;

      /* API volta como fallback controlado, não como chute visual. */
      APP_CONFIG.CAN_USE_ENOVIA_API = true;
      APP_CONFIG.USE_API_SCAN_FIRST = false;
      APP_CONFIG.PREFER_API_ON_MANUAL_REFRESH = false;
      APP_CONFIG.MANUAL_API_FALLBACK = true;
      APP_CONFIG.API_ENG_BOM_FIRST = true;
      APP_CONFIG.ALLOW_PHYSICAL_BOM_FALLBACK = false;
      APP_CONFIG.PILOT_API_TREE_DEPTH = 2;
      APP_CONFIG.BOM_INITIAL_DEPTH = 2;
      APP_CONFIG.BOM_FAST_DEPTH = 2;
      APP_CONFIG.SKIP_PP_ENRICH = true;

      APP_CONFIG.PRESERVE_OCCURRENCE_ROWS = true;
      APP_CONFIG.BOM_MAX_NODES = Math.max(APP_CONFIG.BOM_MAX_NODES || 0, 1000000);
      APP_CONFIG.DOM_MIRROR_MANUAL_MAX_EXPECTED = Math.max(APP_CONFIG.DOM_MIRROR_MANUAL_MAX_EXPECTED || 0, 1000000);
      APP_CONFIG.SCROLL_HARVEST_MAX_STEPS = Math.max(APP_CONFIG.SCROLL_HARVEST_MAX_STEPS || 0, 240);
      APP_CONFIG.FAST_TSV_MAX = Math.max(APP_CONFIG.FAST_TSV_MAX || 0, 1000000);
      APP_CONFIG.SCAN_TIMEOUT_MS = Math.max(APP_CONFIG.SCAN_TIMEOUT_MS || 0, 120000);
    }

    function expectedExplorerCount() {
      try {
        if (typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.getExplorerObjectCount) {
          return ProductExplorerBridge.getExplorerObjectCount() || 0;
        }
      } catch (e) { /* noop */ }
      try {
        if (typeof ExplorerContext !== 'undefined' && ExplorerContext.refresh) {
          var ctx = ExplorerContext.refresh(true);
          return (ctx && ctx.expectedCount) || 0;
        }
      } catch (e2) { /* noop */ }
      return 0;
    }

    function resultCount(result) {
      if (!result) return 0;
      if (result.meta && result.meta.itemCount) return result.meta.itemCount || 0;
      if (typeof BomService !== 'undefined' && BomService.getNodeCount) return BomService.getNodeCount() || 0;
      return 0;
    }

    function isUsefulExplorerResult(result) {
      var count = resultCount(result);
      var expected = expectedExplorerCount();
      if (!count) return false;
      if (expected > 0 && count < Math.max(1, expected - 1)) return false;
      return true;
    }

    function scanByApiFallback(reason) {
      if (!ExplorerScanner || !ExplorerScanner.resolveSelection || !ExplorerScanner.scanViaApi) {
        return Promise.reject(new Error('Fallback API indisponivel.'));
      }
      if (typeof App !== 'undefined' && App.setStatus) {
        App.setStatus('Explorer não entregou linhas; usando API ENOVIA controlada…', 'info');
      }
      return ExplorerScanner.resolveSelection().then(function (sel) {
        return ExplorerScanner.scanViaApi(sel).then(function (apiResult) {
          if (apiResult) {
            apiResult.mode = 'api-fallback';
            apiResult.loaderMode = 'api-fallback';
            apiResult.fallbackReason = reason || 'explorer-grid-empty';
          }
          return apiResult;
        });
      });
    }

    if (typeof ExplorerContext !== 'undefined') {
      ExplorerContext.suggestLoaderMode = function () { return 'tsv'; };
    }

    if (typeof ExplorerScanner !== 'undefined' && !ExplorerScanner.__BOM20260608J_PATCHED__) {
      ExplorerScanner.scan = function () {
        var primary;
        if (ExplorerScanner.scanViaExplorerGrid) {
          primary = ExplorerScanner.scanViaExplorerGrid({ allowAutoCopy: true });
        } else if (ExplorerScanner.scanViaPilotGeneric) {
          primary = ExplorerScanner.scanViaPilotGeneric();
        } else {
          primary = Promise.reject(new Error('Scanner do Product Explorer indisponivel.'));
        }

        return Promise.resolve(primary).then(function (result) {
          if (isUsefulExplorerResult(result)) {
            result.mode = result.mode || 'explorer-current';
            result.loaderMode = 'explorer-current';
            return result;
          }
          return scanByApiFallback('explorer-result-empty-or-partial');
        }).catch(function (err) {
          return scanByApiFallback(err && err.message ? err.message : 'explorer-scan-error');
        });
      };
      ExplorerScanner.__BOM20260608J_PATCHED__ = true;
    }

    global.__BOM_BUILD_ID__ = 'bom20260608j';
    global.__BOM_HOTFIX_MODE__ = 'hybrid-explorer-first-api-fallback';
  } catch (e) {
    global.__BOM_HOTFIX_ERROR__ = e && e.message ? e.message : String(e);
  }
})(typeof window !== 'undefined' ? window : this);
