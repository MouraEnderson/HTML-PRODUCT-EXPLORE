/**
 * @file platform/compass.js
 * Resolução de serviços 3DSpace via i3DXCompassServices.
 */
var CompassServices = (function () {
  'use strict';

  var cache = {
    spaceUrl: null,
    federatedUrl: null
  };

  function getRequire() {
    if (typeof PlatformBridge !== 'undefined' && PlatformBridge.isExternalWidget()) {
      return PlatformBridge.safeGetRequire();
    }
    if (typeof require !== 'undefined') return require;
    try {
      if (window.parent && window.parent !== window) {
        return window.parent['require'];
      }
    } catch (e) { return null; }
    return null;
  }

  function tenantSpaceUrl() {
    if (!APP_CONFIG.TENANT_DEFAULTS || !APP_CONFIG.TENANT_DEFAULTS.spaceHost) return null;
    return 'https://' + APP_CONFIG.TENANT_DEFAULTS.spaceHost + '/enovia';
  }

  function get3DSpaceUrl(platformId) {
    if (APP_CONFIG.DEMO_MODE) {
      cache.spaceUrl = 'https://demo-3dspace.example.com/3dspace';
      return Promise.resolve(cache.spaceUrl);
    }
    if (typeof PlatformBridge !== 'undefined' && PlatformBridge.isExternalWidget()) {
      cache.spaceUrl = PlatformBridge.getSpaceUrl();
      return Promise.resolve(cache.spaceUrl);
    }
    if (cache.spaceUrl) return Promise.resolve(cache.spaceUrl);

    var fallback = tenantSpaceUrl();

    return new Promise(function (resolve, reject) {
      var settled = false;
      function done(url) {
        if (settled) return;
        settled = true;
        cache.spaceUrl = url.replace(/\/$/, '');
        resolve(cache.spaceUrl);
      }
      function fail(err) {
        if (settled) return;
        if (fallback) {
          done(fallback);
          return;
        }
        settled = true;
        reject(err || new Error('Falha ao obter URL 3DSpace'));
      }

      window.setTimeout(function () {
        if (!settled && fallback) done(fallback);
      }, 6000);

      if (typeof __3DX_COMPASS__ !== 'undefined' && __3DX_COMPASS__.getServiceUrl) {
        __3DX_COMPASS__.getServiceUrl({
          serviceName: '3DSpace',
          platformId: platformId || undefined,
          onComplete: done,
          onFailure: function () {
            if (fallback) done(fallback);
            else fail(new Error('Compass getServiceUrl failed'));
          }
        });
        return;
      }

      var req = getRequire();
      if (!req) {
        if (fallback) done(fallback);
        else fail(new Error('RequireJS indisponível'));
        return;
      }
      req(['DS/i3DXCompassServices/i3DXCompassServices'], function (Compass) {
        Compass.getServiceUrl({
          serviceName: '3DSpace',
          platformId: platformId || undefined,
          onComplete: done,
          onFailure: fail
        });
      }, function () {
        if (fallback) done(fallback);
        else fail(new Error('Compass module failed'));
      });
    });
  }

  function buildRestBase(spaceUrl) {
    return spaceUrl + '/resources/v1/modeler';
  }

  function fetchCsrfToken(spaceUrl) {
    if (!spaceUrl) return Promise.resolve(null);
    var url = spaceUrl + '/resources/v1/application/CSRF';
    if (typeof WafClient !== 'undefined') {
      return WafClient.get(url).then(function (data) {
        var token = (data && (data.csrf && data.csrf.value)) || data.value || data.token;
        if (token && typeof PlatformContext !== 'undefined') {
          PlatformContext.setCsrfToken(token);
        }
        return token;
      }).catch(function () { return null; });
    }
    return Promise.resolve(null);
  }

  return {
    get3DSpaceUrl: get3DSpaceUrl,
    fetchCsrfToken: fetchCsrfToken,
    buildRestBase: buildRestBase,
    clearCache: function () {
      cache.spaceUrl = null;
      cache.federatedUrl = null;
    }
  };
})();
