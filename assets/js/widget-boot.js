/**
 * Boot BOM Analytics (carregado depois do widget-uwa pintar widget.body).
 * Sem Promise no HTML UWA — compativel com motor antigo do 3DDashboard.
 */
var BomWidgetBoot = (function (global) {
  'use strict';

  var GH = 'https://mouraenderson.github.io/HTML-PRODUCT-EXPLORE/';
  var VER = 'bom20260606n';
  var BUNDLE = GH + 'assets/js/bom-bundle-' + VER + '.js';

  function setBar(msg, kind) {
    try {
      if (!global.widget || !widget.body) return;
      var el = widget.body.querySelector('#statusBar');
      if (!el) return;
      el.textContent = msg;
      if (kind === 'ok') {
        el.style.background = '#e8f5e9';
        el.style.color = '#1b5e20';
      } else if (kind === 'error') {
        el.style.background = '#ffebee';
        el.style.color = '#b71c1c';
      } else {
        el.style.background = '#e3f2fd';
        el.style.color = '#0d47a1';
      }
    } catch (e) { /* */ }
  }

  function getRequire() {
    try {
      if (global.widget && widget.requirejs) return widget.requirejs;
    } catch (e1) { /* */ }
    if (typeof global.require !== 'undefined') return global.require;
    return null;
  }

  function loadScript(url, optional, next) {
    var s = document.createElement('script');
    s.type = 'text/javascript';
    s.charset = 'UTF-8';
    s.src = url;
    s.onload = function () {
      if (next) next(null);
    };
    s.onerror = function () {
      if (optional) {
        if (next) next(null);
      } else if (next) {
        next(new Error('Bloqueado: ' + url));
      }
    };
    document.head.appendChild(s);
  }

  function loadWaf(next) {
    if (typeof global.WAFData !== 'undefined' && WAFData.authenticatedRequest) {
      next(null);
      return;
    }
    var req = getRequire();
    if (!req) {
      next(new Error('WAFData indisponivel'));
      return;
    }
    setBar('Carregando WAFData...', 'info');
    req(
      ['DS/WAFData/WAFData', 'DS/i3DXCompassServices/i3DXCompassServices', 'DS/PlatformAPI/PlatformAPI'],
      function (WAF, Compass, PAPI) {
        global.WAFData = WAF;
        global.__3DX_COMPASS__ = Compass;
        global.__3DX_PLATFORM_API__ = PAPI;
        next(null);
      },
      function (err) {
        next(err || new Error('Falha WAFData'));
      }
    );
  }

  function start() {
    setBar('Carregando modulos BOM...', 'info');
    loadWaf(function (err) {
      if (err) {
        setBar('Varredura falhou: ' + (err.message || err), 'error');
        return;
      }
      loadScript(GH + 'assets/vendor/chart.umd.min.js?v=' + VER, true, function () {
        loadScript(BUNDLE, false, function (err2) {
          if (err2) {
            setBar('Varredura falhou: ' + (err2.message || err2), 'error');
            return;
          }
          try {
            if (typeof detectRuntimeMode === 'function') detectRuntimeMode();
            if (typeof App !== 'undefined' && App.run) {
              App.run();
              setBar('Pronto - Mont10 - Varrer.', 'ok');
            } else {
              setBar('Bundle nao carregou.', 'error');
            }
          } catch (ex) {
            setBar('Erro: ' + (ex.message || ex), 'error');
          }
        });
      });
    });
  }

  return { start: start };
})(typeof window !== 'undefined' ? window : this);

if (typeof BomWidgetBoot !== 'undefined') {
  BomWidgetBoot.start();
}
