/* BOM Explorer-first hotfix - 20260608h
 * Estratégia correta: Product Explorer é a fonte da verdade.
 * A API ENOVIA deixa de ser fonte principal para reconstruir BOM.
 */
(function (global) {
  'use strict';
  try {
    if (typeof APP_CONFIG !== 'undefined') {
      APP_CONFIG.BUILD = 'bom20260608h';

      /* Fonte principal: estrutura visível/carregada no Product Explorer. */
      APP_CONFIG.PRIMARY_LOADER = 'tsv';
      APP_CONFIG.PILOT_GRID_FIRST = true;
      APP_CONFIG.USE_API_SCAN_FIRST = false;
      APP_CONFIG.PREFER_API_ON_MANUAL_REFRESH = false;
      APP_CONFIG.MANUAL_API_FALLBACK = false;
      APP_CONFIG.AUTO_SYNC_PREFER_API = false;
      APP_CONFIG.CAN_USE_ENOVIA_API = false;

      /* Habilita captura do Explorer atual. */
      APP_CONFIG.EXPLORER_ONLY = true;
      APP_CONFIG.EXPLORER_AUTO_COPY_ENABLED = true;
      APP_CONFIG.SKIP_CLIPBOARD_READ = true;
      APP_CONFIG.PASTE_TRAP_ENABLED = false;
      APP_CONFIG.USE_DOM_MIRROR_PRIMARY = true;
      APP_CONFIG.DOM_MIRROR_FALLBACK = true;
      APP_CONFIG.SKIP_MIRROR_ON_TSV = false;
      APP_CONFIG.EXPLORER_MIRROR_AUTO_SYNC = false;
      APP_CONFIG.EXPLORER_MIRROR_BLOCK_PASTE = true;

      /* Estrutura pode ser grande; preservar ocorrências e evitar consolidação indevida. */
      APP_CONFIG.PRESERVE_OCCURRENCE_ROWS = true;
      APP_CONFIG.BOM_MAX_NODES = Math.max(APP_CONFIG.BOM_MAX_NODES || 0, 1000000);
      APP_CONFIG.DOM_MIRROR_MANUAL_MAX_EXPECTED = Math.max(APP_CONFIG.DOM_MIRROR_MANUAL_MAX_EXPECTED || 0, 1000000);
      APP_CONFIG.SCROLL_HARVEST_MAX_STEPS = Math.max(APP_CONFIG.SCROLL_HARVEST_MAX_STEPS || 0, 240);
      APP_CONFIG.FAST_TSV_MAX = Math.max(APP_CONFIG.FAST_TSV_MAX || 0, 1000000);

      /* API pode enriquecer depois, mas não decide quantidade/hierarquia. */
      APP_CONFIG.API_ENG_BOM_FIRST = false;
      APP_CONFIG.ALLOW_PHYSICAL_BOM_FALLBACK = false;
      APP_CONFIG.SKIP_PP_ENRICH = true;
    }

    if (typeof ExplorerContext !== 'undefined') {
      ExplorerContext.suggestLoaderMode = function () {
        return 'tsv';
      };
    }

    if (typeof BomService !== 'undefined' && BomService.__BOM20260608G_PATCHED__) {
      delete BomService.__BOM20260608G_PATCHED__;
    }

    global.__BOM_BUILD_ID__ = 'bom20260608h';
    global.__BOM_HOTFIX_MODE__ = 'product-explorer-visible-structure-first';
  } catch (e) {
    global.__BOM_HOTFIX_ERROR__ = e && e.message ? e.message : String(e);
  }
})(typeof window !== 'undefined' ? window : this);
