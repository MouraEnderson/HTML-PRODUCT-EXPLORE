/**
 * @file platform/compass.js
 * Resolução de serviços 3DSpace via i3DXCompassServices.
 */
var CompassServices = (function () {
  'use strict';

  var cache = {
    spaceUrl: null,
    spaceUrlVerified: false,
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

  function ifweSpaceUrl() {
    if (!APP_CONFIG.TENANT_DEFAULTS || !APP_CONFIG.TENANT_DEFAULTS.platformHost) return null;
    return 'https://' + APP_CONFIG.TENANT_DEFAULTS.platformHost + '/enovia';
  }

  /** Garante envId correto no host (evita URL errada do Compass). */
  function normalizeSpaceUrl(url) {
    var env = APP_CONFIG.TENANT_DEFAULTS && APP_CONFIG.TENANT_DEFAULTS.envId;
    var sh = APP_CONFIG.TENANT_DEFAULTS && APP_CONFIG.TENANT_DEFAULTS.spaceHost;
    var ih = APP_CONFIG.TENANT_DEFAULTS && APP_CONFIG.TENANT_DEFAULTS.platformHost;
    var u = String(url || '').replace(/\/$/, '');
    if (sh && ih && u.indexOf(ih) >= 0) {
      u = u.replace(ih, sh);
    }
    if (!u || (env && u.indexOf(env) < 0)) {
      return tenantSpaceUrl() ? tenantSpaceUrl().replace(/\/$/, '') : u;
    }
    if (sh && u.indexOf(sh) >= 0 && !/\/enovia(?:\/|$)/i.test(u)) {
      u += '/enovia';
    }
    return u;
  }

  function runtimeHostnames() {
    var hosts = [];
    try {
      if (location.hostname) hosts.push(location.hostname);
    } catch (e) { /* */ }
    try {
      if (window.top && window.top !== window && window.top.location.hostname) {
        hosts.push(window.top.location.hostname);
      }
    } catch (e) { /* */ }
    try {
      if (window.parent && window.parent !== window && window.parent.location.hostname) {
        hosts.push(window.parent.location.hostname);
      }
    } catch (e) { /* */ }
    return hosts;
  }

  /** GitHub iframe no 3DDashboard ifwe: location é github.io, mas o tenant é ifwe. */
  function isDashboardOnIfwe() {
    try {
      var hosts = runtimeHostnames();
      for (var i = 0; i < hosts.length; i++) {
        if ((hosts[i] || '').toLowerCase().indexOf('ifwe') >= 0) return true;
      }
    } catch (e) {
      return false;
    }
    return false;
  }

  function getVerifiedSpaceUrl() {
    return cache.spaceUrlVerified && cache.spaceUrl ? cache.spaceUrl : null;
  }

  function spaceUrlCandidates(primary) {
    var list = [];
    var seen = {};
    function add(u) {
      u = String(u || '').replace(/\/$/, '');
      if (!u || seen[u]) return;
      seen[u] = true;
      list.push(u);
    }
    add(normalizeSpaceUrl(primary));
    add(tenantSpaceUrl());
    if (APP_CONFIG.ALLOW_IFWE_AS_3DSPACE === true && APP_CONFIG.SPACE_FALLBACK_VIA_IFWE !== false) {
      add(ifweSpaceUrl());
    }
    return list;
  }

  function probeSpaceUrl(url) {
    if (!url || typeof WafClient === 'undefined') return Promise.reject(new Error('sem WafClient'));
    var ping = url.replace(/\/$/, '') + '/resources/v1/application/CSRF';
    return WafClient.get(ping).then(function () {
      return url.replace(/\/$/, '');
    });
  }

  function applyVerifiedSpaceUrl(url) {
    cache.spaceUrl = String(url || '').replace(/\/$/, '');
    cache.spaceUrlVerified = true;
    return cache.spaceUrl;
  }

  function swapUrlHost(url, fromHost, toHost) {
    if (!url || !fromHost || !toHost || url.indexOf(fromHost) < 0) return null;
    return url.replace(fromHost, toHost);
  }

  function fastConnectIfwe() {
    if (APP_CONFIG.ALLOW_IFWE_AS_3DSPACE !== true) return null;
    if (!APP_CONFIG.SPACE_FALLBACK_VIA_IFWE && APP_CONFIG.SPACE_FALLBACK_VIA_IFWE !== undefined) {
      return null;
    }
    if (!isDashboardOnIfwe() && !APP_CONFIG.IFRAME_ON_IFWE_DASHBOARD) return null;
    var ifwe = ifweSpaceUrl();
    return ifwe ? applyVerifiedSpaceUrl(ifwe) : null;
  }

  function ensureWorkingSpaceUrl(platformId) {
    if (cache.spaceUrlVerified && cache.spaceUrl) {
      return Promise.resolve(cache.spaceUrl);
    }
    if (APP_CONFIG.SKIP_SPACE_PROBE) {
      var fast = fastConnectIfwe();
      if (fast) return Promise.resolve(fast);
    }
    cache.spaceUrlVerified = false;
    return probeCandidates(spaceUrlCandidates(null)).catch(function (err) {
      if (isDashboardOnIfwe()) {
        return Promise.reject(err || new Error('API ifwe indisponível no dashboard.'));
      }
      return get3DSpaceUrl(platformId).then(function (primary) {
        return probeCandidates(spaceUrlCandidates(primary));
      });
    });
  }

  function probeCandidates(candidates) {
    var idx = 0;
    function tryNext() {
      if (idx >= candidates.length) {
        return Promise.reject(new Error(
          '3DSpace inacessível (space e ifwe). Verifique DNS/VPN *-space.3dexperience.3ds.com'
        ));
      }
      var url = candidates[idx++];
      return probeSpaceUrl(url).then(function (ok) {
        return applyVerifiedSpaceUrl(ok);
      }).catch(function () {
        return tryNext();
      });
    }
    return tryNext();
  }

  function ensure3DSpaceServiceUrl(platformId) {
    if (cache.spaceUrlVerified && cache.spaceUrl) {
      return Promise.resolve(cache.spaceUrl);
    }
    cache.spaceUrlVerified = false;
    return get3DSpaceUrl(platformId).then(function (primary) {
      var candidates = spaceUrlCandidates(primary);
      if (APP_CONFIG.SKIP_SPACE_PROBE) {
        return applyVerifiedSpaceUrl(candidates[0] || primary);
      }
      return probeCandidates(candidates).catch(function () {
        if (primary) return applyVerifiedSpaceUrl(primary);
        return Promise.reject(new Error('3DSpace inacessivel via Compass.'));
      });
    });
  }

  function get3DSpaceUrl(platformId) {
    if (isDashboardOnIfwe() && APP_CONFIG.SPACE_FALLBACK_VIA_IFWE !== false) {
      var ifwe = ifweSpaceUrl();
      if (ifwe) {
        cache.spaceUrl = ifwe;
        cache.spaceUrlVerified = true;
        return Promise.resolve(ifwe);
      }
    }
    if (APP_CONFIG.DEMO_MODE) {
      cache.spaceUrl = 'https://demo-3dspace.example.com/3dspace';
      return Promise.resolve(cache.spaceUrl);
    }
    if (typeof PlatformBridge !== 'undefined' && PlatformBridge.isExternalWidget()) {
      cache.spaceUrl = normalizeSpaceUrl(PlatformBridge.getSpaceUrl());
      return Promise.resolve(cache.spaceUrl);
    }
    if (cache.spaceUrlVerified && cache.spaceUrl) return Promise.resolve(cache.spaceUrl);

    var fallback = tenantSpaceUrl();

    return new Promise(function (resolve, reject) {
      var settled = false;
      function done(url) {
        if (settled) return;
        settled = true;
        cache.spaceUrl = normalizeSpaceUrl(url);
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
    tenantSpaceUrl: tenantSpaceUrl,
    ifweSpaceUrl: ifweSpaceUrl,
    fastConnectIfwe: fastConnectIfwe,
    isDashboardOnIfwe: isDashboardOnIfwe,
    getVerifiedSpaceUrl: getVerifiedSpaceUrl,
    get3DSpaceUrl: get3DSpaceUrl,
    ensureWorkingSpaceUrl: ensure3DSpaceServiceUrl,
    applyVerifiedSpaceUrl: applyVerifiedSpaceUrl,
    swapUrlHost: swapUrlHost,
    normalizeSpaceUrl: normalizeSpaceUrl,
    ifweSpaceUrl: ifweSpaceUrl,
    fetchCsrfToken: fetchCsrfToken,
    buildRestBase: buildRestBase,
    clearCache: function () {
      cache.spaceUrl = null;
      cache.spaceUrlVerified = false;
      cache.federatedUrl = null;
    }
  };
})();
