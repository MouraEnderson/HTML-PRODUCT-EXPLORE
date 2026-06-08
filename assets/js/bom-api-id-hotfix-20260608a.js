/* BOM API safe hotfix - 20260608a
 * Não sobrescreve funções críticas/diagnóstico.
 * O bundle bom20260607a já contém resolução dseng/UQL mais completa.
 * Este arquivo só força flags seguras para o carregamento por API.
 */
(function (global) {
  'use strict';
  try {
    if (typeof APP_CONFIG !== 'undefined') {
      APP_CONFIG.BUILD = 'bom20260608a';
      APP_CONFIG.API_ENG_BOM_FIRST = true;
      APP_CONFIG.ALLOW_PHYSICAL_BOM_FALLBACK = false;
      APP_CONFIG.PRIMARY_LOADER = 'api';
      APP_CONFIG.PREFER_API_ON_MANUAL_REFRESH = true;
      APP_CONFIG.SKIP_PP_ENRICH = true;
      APP_CONFIG.PILOT_API_TREE_DEPTH = Math.max(APP_CONFIG.PILOT_API_TREE_DEPTH || 0, 8);
      APP_CONFIG.BOM_FAST_DEPTH = Math.max(APP_CONFIG.BOM_FAST_DEPTH || 0, 8);
      APP_CONFIG.BOM_INITIAL_DEPTH = Math.max(APP_CONFIG.BOM_INITIAL_DEPTH || 0, 8);
    }
    global.__BOM_HOTFIX_20260608A__ = true;
    global.__BOM_HOTFIX_MODE__ = 'safe-non-invasive';
  } catch (e) {
    global.__BOM_HOTFIX_ERROR__ = e && e.message ? e.message : String(e);
  }
})(typeof window !== 'undefined' ? window : this);
