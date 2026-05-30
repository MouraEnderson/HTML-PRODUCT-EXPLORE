/**
 * @file platform/waf-bootstrap.js
 * Carrega WAFData / Compass via require do 3DDashboard (obrigatório para API ENOVIA).
 */
var WafBootstrap = (function (global) {
  'use strict';

  var loadPromise = null;

  function getRequire() {
    if (typeof require !== 'undefined') return require;
    try {
      if (global.widget && global.widget.requirejs) return global.widget.requirejs;
    } catch (e1) { /* */ }
    try {
      if (global.top && global.top !== global && global.top.require) return global.top.require;
    } catch (e2) { /* */ }
    try {
      if (global.parent && global.parent !== global && global.parent.require) {
        return global.parent.require;
      }
    } catch (e3) { /* */ }
    return null;
  }

  function ensure() {
    if (loadPromise) return loadPromise;

    loadPromise = new Promise(function (resolve, reject) {
      if (typeof WAFData !== 'undefined' && WAFData.authenticatedRequest) {
        resolve({ WAFData: WAFData });
        return;
      }

      var req = getRequire();
      if (!req) {
        reject(new Error(
          'WAFData indisponível. Widget deve rodar no 3DDashboard (Additional App), não no Chrome direto.'
        ));
        return;
      }

      req([
        'DS/WAFData/WAFData',
        'DS/i3DXCompassServices/i3DXCompassServices',
        'DS/PlatformAPI/PlatformAPI'
      ], function (WAF, Compass, PlatformAPI) {
        if (WAF) global.WAFData = WAF;
        if (Compass) global.__3DX_COMPASS__ = Compass;
        if (PlatformAPI) global.__3DX_PLATFORM_API__ = PlatformAPI;
        resolve({ WAFData: WAF, Compass: Compass, PlatformAPI: PlatformAPI });
      }, function (err) {
        reject(err || new Error('Falha ao carregar módulos DS (WAFData)'));
      });
    });

    return loadPromise;
  }

  return {
    ensure: ensure,
    getRequire: getRequire
  };
})(typeof window !== 'undefined' ? window : this);
