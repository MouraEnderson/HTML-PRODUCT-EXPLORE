/**
 * @file platform/platform-bridge.js
 * Comunicação com 3DDashboard quando HTML está em domínio externo (GitHub Pages).
 */
var PlatformBridge = (function () {
  'use strict';

  function isExternalWidget() {
    if (APP_CONFIG.DEMO_MODE) return false;
    var host = (location.hostname || '').toLowerCase();
    if (host.indexOf('3dexperience.3ds.com') >= 0) return false;
    if (host.indexOf('github.io') >= 0) return true;
    if (host.indexOf('githubusercontent.com') >= 0) return true;
    if (host.indexOf('jsdelivr.net') >= 0) return true;
    try {
      if (document.referrer && document.referrer.indexOf('3dexperience.3ds.com') >= 0) {
        return true;
      }
    } catch (e) { /* ignore */ }
    return false;
  }

  function getPlatformOrigin() {
    var host = APP_CONFIG.TENANT_DEFAULTS.platformHost;
    return 'https://' + host;
  }

  function getSpaceUrl() {
    var host = APP_CONFIG.TENANT_DEFAULTS.spaceHost;
    return 'https://' + host + '/enovia';
  }

  /**
   * Envia busca para o 3DDashboard (barra "Pesquisar" / 3DSearch).
   * Web Page Reader repassa postMessage ao dashboard pai em muitos tenants.
   */
  function launchPlatformSearch(query) {
    var origin = getPlatformOrigin();
    var q = String(query || '').trim();
    if (!q) return { ok: false, reason: 'empty' };

    var messages = [
      { type: '3DSearch', action: 'search', query: q, searchTerm: q, text: q },
      { type: 'dashboard-search', query: q },
      { type: 'WAFSearch', value: q },
      { event: 'search', data: { query: q, searchStr: q } },
      { event: '3DXSearch', query: q },
      { name: 'setSearchQuery', value: q },
      { protocol: '3DXWidgetMessage', action: 'search', payload: { query: q } },
      { method: 'Search', args: [q] }
    ];

    messages.forEach(function (msg) {
      try { window.top.postMessage(msg, origin); } catch (e1) { /* */ }
      try { window.top.postMessage(msg, '*'); } catch (e2) { /* */ }
      try { window.parent.postMessage(msg, origin); } catch (e3) { /* */ }
      try { window.parent.postMessage(msg, '*'); } catch (e4) { /* */ }
    });

    var appIds = APP_CONFIG.PLATFORM.SEARCH_APP_IDS || [];
    appIds.forEach(function (appId) {
      try {
        window.top.postMessage({
          protocol: '3DXContent',
          action: 'launchApp',
          appId: appId,
          search: q,
          query: q
        }, origin);
      } catch (e) { /* */ }
    });

    return { ok: true, mode: 'postMessage', query: q };
  }

  /**
   * Pede ao 3DDashboard o objeto atual (Product Explorer / seleção global).
   */
  function requestDashboardSelection() {
    var origin = getPlatformOrigin();
    var requests = [
      { type: '3DX_GET_SELECTION' },
      { type: '3DX_SELECTION_REQUEST' },
      { event: 'getSelection' },
      { protocol: '3DXWidgetMessage', action: 'getSelection' },
      { method: 'Selection.getSelection' }
    ];
    requests.forEach(function (msg) {
      try { window.top.postMessage(msg, origin); } catch (e1) { /* */ }
      try { window.top.postMessage(msg, '*'); } catch (e2) { /* */ }
    });
    return true;
  }

  function safeGetRequire() {
    if (typeof require !== 'undefined') return require;
    return null;
  }

  return {
    isExternalWidget: isExternalWidget,
    getPlatformOrigin: getPlatformOrigin,
    getSpaceUrl: getSpaceUrl,
    launchPlatformSearch: launchPlatformSearch,
    requestDashboardSelection: requestDashboardSelection,
    safeGetRequire: safeGetRequire
  };
})();
