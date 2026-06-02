/**
 * @file platform/waf-bootstrap.js
 * Carrega WAFData / Compass via require do 3DDashboard (obrigatório para API ENOVIA).
 */
var WafBootstrap = (function (global) {
  'use strict';

  var loadPromise = null;

  function getWafFromWidget() {
    try {
      if (global.widget && global.widget.WAFData && global.widget.WAFData.authenticatedRequest) {
        return global.widget.WAFData;
      }
    } catch (eW) { /* */ }
    return null;
  }

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
      var fromWidget = getWafFromWidget();
      if (fromWidget) {
        global.WAFData = fromWidget;
        resolve({ WAFData: fromWidget });
        return;
      }
      if (typeof WAFData !== 'undefined' && WAFData.authenticatedRequest) {
        resolve({ WAFData: WAFData });
        return;
      }

      var attempts = 0;
      var maxAttempts = 24;

      function tryRequire() {
        var req = getRequire();
        if (!req) {
          attempts++;
          if (attempts < maxAttempts) {
            window.setTimeout(tryRequire, 250);
            return;
          }
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
          attempts++;
          if (attempts < maxAttempts) {
            window.setTimeout(tryRequire, 250);
            return;
          }
          reject(err || new Error('Falha ao carregar módulos DS (WAFData)'));
        });
      }

      tryRequire();
    });

    return loadPromise;
  }

  return {
    ensure: ensure,
    getRequire: getRequire
  };
})(typeof window !== 'undefined' ? window : this);
