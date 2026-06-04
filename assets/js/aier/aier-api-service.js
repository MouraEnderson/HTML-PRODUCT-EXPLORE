/**
 * @file aier-api-service.js
 * Cliente HTTP do Additional App Documentação 2D.
 */
var AierApiService = (function () {
  'use strict';

  function cfg() {
    return typeof AIER_CONFIG !== 'undefined' ? AIER_CONFIG : {};
  }

  function apiBase() {
    return (cfg().API_URL || 'http://127.0.0.1:5201').replace(/\/$/, '');
  }

  function webBase() {
    return (cfg().WEB_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
  }

  function request(path, options) {
    options = options || {};
    var url = apiBase() + path;
    return fetch(url, {
      method: options.method || 'GET',
      headers: Object.assign({ Accept: 'application/json' }, options.headers || {}),
      body: options.body || undefined
    }).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (t) {
          throw new Error('HTTP ' + res.status + (t ? ': ' + t.slice(0, 120) : ''));
        });
      }
      if (res.status === 204) return null;
      var ct = res.headers.get('content-type') || '';
      if (ct.indexOf('application/json') >= 0) return res.json();
      return res.text();
    });
  }

  return {
    apiBase: apiBase,
    webBase: webBase,
    health: function () { return request('/health'); },
    drawingHealthSummary: function () {
      return request('/api/v1/analyses/pilot/drawing-health-summary');
    },
    collectAssembly: function () {
      return request('/api/v1/analyses/pilot/collect/assembly', { method: 'POST' });
    },
    detailPartA: function () {
      return request('/api/v1/analyses/pilot/detail/a', { method: 'POST' });
    },
    refreshOutdated: function () {
      return request('/api/v1/analyses/pilot/refresh-outdated', { method: 'POST' });
    },
    getAnalysis: function (id) {
      return request('/api/v1/analyses/' + id);
    },
    analysisUrl: function (id) {
      return webBase().replace(/\/$/, '') + '/analyses/' + id;
    },
    previewPdfUrl: function (id) {
      return apiBase() + '/api/v1/analyses/' + id + '/preview.pdf';
    }
  };
})();
