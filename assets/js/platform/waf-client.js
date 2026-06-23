/**
 * @file platform/waf-client.js
 * Cliente HTTP autenticado via WAFData (nunca fetch cross-origin para 3DSpace).
 */
var WafClient = (function () {
  'use strict';

  var root = typeof window !== 'undefined' ? window : this;

  function getWAFData() {
    if (typeof WAFData !== 'undefined' && WAFData.authenticatedRequest) return WAFData;
    try {
      if (typeof widget !== 'undefined' && widget && widget.WAFData) return widget.WAFData;
    } catch (e) { /* */ }
    return null;
  }

  function is3DSpaceUrl(url) {
    return (url || '').indexOf('3dexperience.3ds.com') >= 0 ||
      (url || '').indexOf('/enovia') >= 0;
  }

  function ifweRetryUrl(url, force) {
    var allowConfigured =
      APP_CONFIG.ALLOW_IFWE_AS_3DSPACE === true &&
      APP_CONFIG.SPACE_FALLBACK_VIA_IFWE !== false;
    if (!force && !allowConfigured) return null;
    if (!APP_CONFIG.TENANT_DEFAULTS) return null;
    var sh = APP_CONFIG.TENANT_DEFAULTS.spaceHost;
    var ih = APP_CONFIG.TENANT_DEFAULTS.platformHost;
    if (typeof CompassServices !== 'undefined' && CompassServices.swapUrlHost) {
      return CompassServices.swapUrlHost(url, sh, ih);
    }
    if (!sh || !ih || url.indexOf(sh) < 0) return null;
    return url.replace(sh, ih);
  }

  function isNetworkZero(msg) {
    return /ResponseCode.*0|NetworkError/i.test(msg || '');
  }

  function isRetryableHttp(msg) {
    if (/ResponseCode.*406|\b406\b/i.test(msg || '')) return true;
    return /ResponseCode.*(403|400)|\b403\b|\b400\b/i.test(msg || '');
  }

  function isEmbeddedWidget() {
    /* Additional App runs in an iframe whose parent is cross-origin (3DDashboard).
     * isDashboardOnIfwe() cannot read window.top.location → returns false.
     * Detect embedding: frameElement present, or accessing top.location throws SecurityError. */
    try {
      if (root.frameElement) return true;
    } catch (e) {
      return true; /* SecurityError: cross-origin access blocked → we are embedded */
    }
    try {
      if (root.top && root.top !== root) {
        /* This line throws in cross-origin contexts */
        void root.top.location.href;
      }
    } catch (e) {
      return true;
    }
    return false;
  }

  function isSpaceBlockedInIfweSession(onIfwe, msg, targetUrl) {
    if (!isNetworkZero(msg) || !/space\.3dexperience/i.test(targetUrl || '')) return false;
    if (onIfwe) return true;
    /* In Additional App the parent 3DDashboard is cross-origin, so isDashboardOnIfwe()
     * returns false even though WAF session is IFWE-based. Force IFWE retry whenever
     * *-space is network-blocked and the widget is running inside an iframe. */
    return isEmbeddedWidget();
  }

  function mustUseIfweOnly() {
    return APP_CONFIG.ALLOW_IFWE_AS_3DSPACE === true && APP_CONFIG.FORCE_IFWE_AS_3DSPACE === true;
  }

  function swapSpaceIfwe(url) {
    if (mustUseIfweOnly()) return ifweRetryUrl(url);
    if (!APP_CONFIG.TENANT_DEFAULTS) return null;
    var sh = APP_CONFIG.TENANT_DEFAULTS.spaceHost;
    var ih = APP_CONFIG.TENANT_DEFAULTS.platformHost;
    if (typeof CompassServices !== 'undefined' && CompassServices.swapUrlHost) {
      if (url.indexOf(sh) >= 0) return CompassServices.swapUrlHost(url, sh, ih);
      if (url.indexOf(ih) >= 0) return CompassServices.swapUrlHost(url, ih, sh);
    }
    return null;
  }

  function normalizeRequestUrl(url) {
    if (!url) return url;
    if (mustUseIfweOnly() && APP_CONFIG.TENANT_DEFAULTS) {
      var sh = APP_CONFIG.TENANT_DEFAULTS.spaceHost;
      var ih = APP_CONFIG.TENANT_DEFAULTS.platformHost;
      if (sh && ih && url.indexOf(sh) >= 0) {
        url = url.replace(sh, ih);
      }
    }
    if (
      APP_CONFIG.CLOUD_PHYSICAL_ONLY &&
      APP_CONFIG.API_ENG_BOM_FIRST === false &&
      /\/dseng\/dseng:EngItem\//i.test(url)
    ) {
      throw new Error(
        'EngItem bloqueado (tenant cloud). Ative API_ENG_BOM_FIRST ou atualize o bundle: ' +
          (APP_CONFIG.BUILD || 'bom20260606f')
      );
    }
    return url;
  }

  function pilotApiBlocked() {
    if (!APP_CONFIG || APP_CONFIG.PILOT_BLOCK_API_UNLESS_ALLOWED === false) return false;
    if (!APP_CONFIG.PILOT_GRID_FIRST) return false;
    try {
      if (root.__3DX_FORCE_API__ || root.__3DX_ALLOW_API__) return false;
    } catch (e0) { /* */ }
    var q = typeof APP_QUERY !== 'undefined' ? APP_QUERY : {};
    if (q.api === '1' || q.api === 'true') return false;
    return true;
  }

  function request(method, url, options) {
    options = options || {};
    url = normalizeRequestUrl(url);
    var headers = Object.assign({}, PlatformContext.getHeaders(), options.headers || {});
    if (String(method || '').toUpperCase() === 'GET') {
      var st =
        typeof PlatformContext !== 'undefined' && PlatformContext.getState
          ? PlatformContext.getState()
          : {};
      headers = Object.assign({ Accept: 'application/json' }, options.headers || {});
      if (st && st.securityContext) headers.SecurityContext = st.securityContext;
    }

    if (APP_CONFIG.DEMO_MODE) {
      return Promise.reject(new Error('DEMO_MODE: use BomService mock'));
    }

    if (pilotApiBlocked() && is3DSpaceUrl(url)) {
      return Promise.reject(
        new Error('API piloto bloqueada — clique Varrer (árvore Explorer). Build ' + (APP_CONFIG.BUILD || ''))
      );
    }

    function runOnce(targetUrl, retried) {
      var WAF = getWAFData();
      if (!WAF || !WAF.authenticatedRequest) {
        if (is3DSpaceUrl(targetUrl)) {
          return Promise.reject(new Error(
            'API ENOVIA bloqueada (sem WAFData). Use Additional App no 3DDashboard ou HTML no 3DSpace.'
          ));
        }
        return Promise.reject(new Error('WAFData não disponível para: ' + targetUrl));
      }

      return new Promise(function (resolve, reject) {
        var timeoutMs = (APP_CONFIG && APP_CONFIG.WAF_REQUEST_TIMEOUT_MS) || 15000;
        var settled = false;
        function finish(fn, val) {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          fn(val);
        }
        var timer = window.setTimeout(function () {
          finish(reject, new Error('API timeout (' + timeoutMs + 'ms)'));
        }, timeoutMs);

        WAF.authenticatedRequest(targetUrl, {
          method: method,
          headers: headers,
          data: options.body,
          type: 'json',
          onComplete: function (data) {
            finish(resolve, data);
          },
          onFailure: function (err) {
            var msg = (err && (err.message || err.error)) || 'WAF request failed';
            try {
              if (!window.__3DX_API_DIAG__) window.__3DX_API_DIAG__ = [];
              window.__3DX_API_DIAG__.push({
                ts: new Date().toISOString(),
                step: 'WAF ' + method,
                ok: false,
                detail: msg,
                url: targetUrl
              });
            } catch (eDiag) { /* */ }
            if (!retried && (isNetworkZero(msg) || isRetryableHttp(msg))) {
              var onIfwe =
                typeof CompassServices !== 'undefined' &&
                CompassServices.isDashboardOnIfwe &&
                CompassServices.isDashboardOnIfwe();
              var shouldForceIfweRetry = isSpaceBlockedInIfweSession(onIfwe, msg, targetUrl);
              /* Always pass shouldForceIfweRetry to ifweRetryUrl so the IFWE alternative
               * is used when *-space is blocked, even when onIfwe detection failed
               * due to cross-origin restrictions in the Additional App. */
              var alt = ifweRetryUrl(targetUrl, shouldForceIfweRetry) ||
                (!shouldForceIfweRetry ? swapSpaceIfwe(targetUrl) : null);
              if (alt && alt !== targetUrl) {
                if (typeof CompassServices !== 'undefined' && CompassServices.applyVerifiedSpaceUrl) {
                  var baseMatch = alt.match(/^(https:\/\/[^/]+\/enovia)/i);
                  var base = baseMatch ? baseMatch[1] : null;
                  if (base) {
                    CompassServices.applyVerifiedSpaceUrl(base);
                    try {
                      if (typeof EnoviaApi !== 'undefined' && EnoviaApi.init) EnoviaApi.init(base);
                      if (typeof SearchApi !== 'undefined' && SearchApi.init) SearchApi.init(base);
                    } catch (eInit) { /* */ }
                  }
                }
                runOnce(alt, true).then(function (d) { finish(resolve, d); }).catch(function (e) { finish(reject, e); });
                return;
              }
            }
            if (isNetworkZero(msg) && /space\.3dexperience/i.test(targetUrl)) {
              msg =
                'Rede bloqueou *-space. Use build ' + (APP_CONFIG.BUILD || 'bom20260602f') + ' no Additional App.';
            }
            if (isRetryableHttp(msg) && /dseng:EngItem/i.test(targetUrl)) {
              msg =
                'EngItem não suportado neste tenant. Use build ' +
                (APP_CONFIG.BUILD || 'bom20260602f') +
                ' (' +
                msg +
                ')';
            }
            finish(reject, new Error(msg));
          }
        });
      });
    }

    function doRequest() {
      return runOnce(url, false);
    }

    if (typeof WafBootstrap !== 'undefined') {
      return WafBootstrap.ensure().then(doRequest).catch(function (err) {
        if (getWAFData()) return doRequest();
        throw err;
      });
    }

    return doRequest();
  }

  function get(url, headers) {
    return request('GET', url, { headers: headers });
  }

  function post(url, body, headers) {
    return request('POST', url, { body: body, headers: headers });
  }

  return {
    get: get,
    post: post,
    request: request
  };
})();
