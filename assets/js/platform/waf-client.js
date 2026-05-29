/**
 * @file platform/waf-client.js
 * Cliente HTTP autenticado via WAFData (nunca fetch cross-origin para 3DSpace).
 */
var WafClient = (function () {
  'use strict';

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

  function ifweRetryUrl(url) {
    if (!APP_CONFIG.TENANT_DEFAULTS || APP_CONFIG.SPACE_FALLBACK_VIA_IFWE === false) return null;
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
    return /ResponseCode.*(403|400|406)|\b403\b|\b400\b|\b406\b/i.test(msg || '');
  }

  function mustUseIfweOnly() {
    if (APP_CONFIG.IFRAME_ON_IFWE_DASHBOARD) return true;
    return (
      typeof CompassServices !== 'undefined' &&
      CompassServices.isDashboardOnIfwe &&
      CompassServices.isDashboardOnIfwe()
    );
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
    if (APP_CONFIG.CLOUD_PHYSICAL_ONLY && /\/dseng\/dseng:EngItem\//i.test(url)) {
      throw new Error(
        'EngItem bloqueado (tenant cloud). Atualize o bundle: ' + (APP_CONFIG.BUILD || 'bom20260602e')
      );
    }
    return url;
  }

  function request(method, url, options) {
    options = options || {};
    url = normalizeRequestUrl(url);
    var headers = Object.assign({}, PlatformContext.getHeaders(), options.headers || {});

    if (APP_CONFIG.DEMO_MODE) {
      return Promise.reject(new Error('DEMO_MODE: use BomService mock'));
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
        WAF.authenticatedRequest(targetUrl, {
          method: method,
          headers: headers,
          data: options.body,
          type: 'json',
          onComplete: function (data) {
            resolve(data);
          },
          onFailure: function (err) {
            var msg = (err && (err.message || err.error)) || 'WAF request failed';
            if (!retried && (isNetworkZero(msg) || isRetryableHttp(msg))) {
              var onIfwe =
                typeof CompassServices !== 'undefined' &&
                CompassServices.isDashboardOnIfwe &&
                CompassServices.isDashboardOnIfwe();
              var alt = onIfwe ? ifweRetryUrl(targetUrl) : (ifweRetryUrl(targetUrl) || swapSpaceIfwe(targetUrl));
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
                runOnce(alt, true).then(resolve).catch(reject);
                return;
              }
            }
            if (isNetworkZero(msg) && /space\.3dexperience/i.test(targetUrl)) {
              msg =
                'Rede bloqueou *-space (código 0). No 3DDashboard use só *-ifwe — atualize para build bom20260602c.';
            }
            if (isRetryableHttp(msg) && /dseng:EngItem/i.test(targetUrl)) {
              msg =
                'EngItem não suportado neste tenant (400/406). Atualize o Additional App para build bom20260602d.';
            }
            if (isRetryableHttp(msg) && /dspfl:PhysicalProduct/i.test(targetUrl)) {
              msg = 'Physical Product API: ' + msg + ' — confirme Security Context no widget.';
            }
            reject(new Error(msg));
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
