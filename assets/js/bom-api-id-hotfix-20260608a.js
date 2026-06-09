/* BOM API safe hotfix - 20260608d */
(function (global) {
  'use strict';
  try {
    if (typeof APP_CONFIG !== 'undefined') {
      APP_CONFIG.BUILD = 'bom20260608d';
      APP_CONFIG.API_ENG_BOM_FIRST = true;
      APP_CONFIG.ALLOW_PHYSICAL_BOM_FALLBACK = false;
      APP_CONFIG.PRIMARY_LOADER = 'api';
      APP_CONFIG.PREFER_API_ON_MANUAL_REFRESH = true;
      APP_CONFIG.PILOT_API_TREE_DEPTH = Math.max(APP_CONFIG.PILOT_API_TREE_DEPTH || 0, 10);
      APP_CONFIG.BOM_FAST_DEPTH = Math.max(APP_CONFIG.BOM_FAST_DEPTH || 0, 10);
      APP_CONFIG.BOM_INITIAL_DEPTH = Math.max(APP_CONFIG.BOM_INITIAL_DEPTH || 0, 10);
      APP_CONFIG.BOM_MAX_NODES = Math.max(APP_CONFIG.BOM_MAX_NODES || 0, 500);
    }
    if (typeof AttributeService !== 'undefined' && !AttributeService.__BOM20260608D_PATCHED__) {
      var oldAssemblyCheck = AttributeService.isAssemblyType;
      AttributeService.isAssemblyType = function (type) {
        var t = String(type || '').trim().toLowerCase();
        if (t === 'dsxcad:product' || t === 'product' || t === 'physical product' || t === 'vpmreference') return true;
        if (t.indexOf('assembly') >= 0 || t.indexOf('montagem') >= 0) return true;
        if (typeof oldAssemblyCheck === 'function') return oldAssemblyCheck.apply(this, arguments);
        return false;
      };
      AttributeService.__BOM20260608D_PATCHED__ = true;
    }
    global.__BOM_HOTFIX_20260608A__ = true;
    global.__BOM_HOTFIX_MODE__ = 'product-recursion';
  } catch (e) {
    global.__BOM_HOTFIX_ERROR__ = e && e.message ? e.message : String(e);
  }
})(typeof window !== 'undefined' ? window : this);
