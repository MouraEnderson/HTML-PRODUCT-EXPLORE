/**
 * @file platform/waf-client.js
 * Cliente HTTP autenticado via WAFData.
 */
var WafClient = (function () {
  'use strict';

  function getWAFData() {
    if (typeof WAFData !== 'undefined') return WAFData;
    if (window.parent && window.parent.WAFData) {
      try { return window.parent.WAFData; } catch (e) { return null; }
    }
    return null;
  }

  function request(method, url, options) {
    options = options || {};
    var headers = Object.assign({}, PlatformContext.getHeaders(), options.headers || {});

    if (APP_CONFIG.DEMO_MODE) {
      return Promise.reject(new Error('DEMO_MODE: use BomService mock'));
    }

    var WAF = getWAFData();
    if (!WAF || !WAF.authenticatedRequest) {
      return fetch(url, {
        method: method,
        headers: headers,
        credentials: 'include',
        body: options.body ? JSON.stringify(options.body) : undefined
      }).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + url);
        return res.json();
      });
    }

    return new Promise(function (resolve, reject) {
      WAF.authenticatedRequest(url, {
        method: method,
        headers: headers,
        data: options.body,
        type: 'json',
        onComplete: function (data) {
          resolve(data);
        },
        onFailure: function (err) {
          reject(err || new Error('WAF request failed'));
        }
      });
    });
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
