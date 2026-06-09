/* BOM Explorer-first hotfix - 20260608i */
(function (global) {
  'use strict';
  try {
    if (typeof APP_CONFIG !== 'undefined') {
      APP_CONFIG.BUILD = 'bom20260608i';
      APP_CONFIG.PRIMARY_LOADER = 'tsv';
      APP_CONFIG.PILOT_GRID_FIRST = true;
      APP_CONFIG.USE_API_SCAN_FIRST = false;
      APP_CONFIG.PREFER_API_ON_MANUAL_REFRESH = false;
      APP_CONFIG.MANUAL_API_FALLBACK = false;
      APP_CONFIG.AUTO_SYNC_PREFER_API = false;
      APP_CONFIG.CAN_USE_ENOVIA_API = false;
      APP_CONFIG.API_ENG_BOM_FIRST = false;
      APP_CONFIG.ALLOW_PHYSICAL_BOM_FALLBACK = false;
      APP_CONFIG.SKIP_PP_ENRICH = true;
      APP_CONFIG.EXPLORER_ONLY = true;
      APP_CONFIG.EXPLORER_AUTO_COPY_ENABLED = true;
      APP_CONFIG.USE_DOM_MIRROR_PRIMARY = true;
      APP_CONFIG.DOM_MIRROR_FALLBACK = true;
      APP_CONFIG.SKIP_MIRROR_ON_TSV = false;
      APP_CONFIG.PRESERVE_OCCURRENCE_ROWS = true;
      APP_CONFIG.BOM_MAX_NODES = Math.max(APP_CONFIG.BOM_MAX_NODES || 0, 1000000);
      APP_CONFIG.DOM_MIRROR_MANUAL_MAX_EXPECTED = Math.max(APP_CONFIG.DOM_MIRROR_MANUAL_MAX_EXPECTED || 0, 1000000);
      APP_CONFIG.SCROLL_HARVEST_MAX_STEPS = Math.max(APP_CONFIG.SCROLL_HARVEST_MAX_STEPS || 0, 240);
      APP_CONFIG.FAST_TSV_MAX = Math.max(APP_CONFIG.FAST_TSV_MAX || 0, 1000000);
    }

    if (typeof ExplorerContext !== 'undefined') {
      ExplorerContext.suggestLoaderMode = function () { return 'tsv'; };
    }

    if (typeof ExplorerScanner !== 'undefined' && !ExplorerScanner.__BOM20260608I_PATCHED__) {
      var originalScan = ExplorerScanner.scan;
      ExplorerScanner.scan = function () {
        var scanPromise;
        if (ExplorerScanner.scanViaPilotGeneric) {
          scanPromise = ExplorerScanner.scanViaPilotGeneric();
        } else if (ExplorerScanner.scanViaExplorerGrid) {
          scanPromise = ExplorerScanner.scanViaExplorerGrid({ allowAutoCopy: true });
        } else if (originalScan) {
          scanPromise = originalScan.call(ExplorerScanner);
        } else {
          scanPromise = Promise.reject(new Error('Scanner do Product Explorer indisponivel.'));
        }
        return Promise.resolve(scanPromise).then(function (result) {
          if (result) {
            result.mode = result.mode || 'explorer-current';
            result.loaderMode = 'explorer-current';
          }
          return result;
        });
      };
      ExplorerScanner.__BOM20260608I_PATCHED__ = true;
    }

    global.__BOM_BUILD_ID__ = 'bom20260608i';
    global.__BOM_HOTFIX_MODE__ = 'force-product-explorer-current-scan';
  } catch (e) {
    global.__BOM_HOTFIX_ERROR__ = e && e.message ? e.message : String(e);
  }
})(typeof window !== 'undefined' ? window : this);
