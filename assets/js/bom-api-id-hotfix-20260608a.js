/* BOM API safe hotfix - 20260608g */
(function (global) {
  'use strict';
  try {
    if (typeof APP_CONFIG !== 'undefined') {
      APP_CONFIG.BUILD = 'bom20260608g';
      APP_CONFIG.PRIMARY_LOADER = 'api';
      APP_CONFIG.PREFER_API_ON_MANUAL_REFRESH = true;
      APP_CONFIG.API_ENG_BOM_FIRST = true;
      APP_CONFIG.ALLOW_PHYSICAL_BOM_FALLBACK = false;
      APP_CONFIG.PILOT_API_TREE_DEPTH = 12;
      APP_CONFIG.BOM_INITIAL_DEPTH = 12;
      APP_CONFIG.BOM_FAST_DEPTH = 12;
      APP_CONFIG.BOM_MAX_NODES = Math.max(APP_CONFIG.BOM_MAX_NODES || 0, 500);
    }
    if (typeof AttributeService !== 'undefined' && !AttributeService.__BOM20260608G_PATCHED__) {
      var oldCheck = AttributeService.isAssemblyType;
      AttributeService.isAssemblyType = function (type) {
        var t = String(type || '').toLowerCase();
        if (t === 'dsxcad:product' || t === 'product' || t === 'physical product' || t === 'vpmreference') return true;
        if (t.indexOf('assembly') >= 0 || t.indexOf('montagem') >= 0) return true;
        return typeof oldCheck === 'function' ? oldCheck.apply(this, arguments) : false;
      };
      AttributeService.__BOM20260608G_PATCHED__ = true;
    }
    if (typeof BomService !== 'undefined' && BomService.loadLazyFull && !BomService.__BOM20260608G_PATCHED__) {
      BomService.loadInitialScope = BomService.loadLazyFull;
      BomService.__BOM20260608G_PATCHED__ = true;
    }
    global.__BOM_BUILD_ID__ = 'bom20260608g';
    global.__BOM_HOTFIX_MODE__ = 'manual-refresh-full-bom-load';
  } catch (e) {
    global.__BOM_HOTFIX_ERROR__ = e && e.message ? e.message : String(e);
  }
})(typeof window !== 'undefined' ? window : this);
