/**
 * @file platform/context.js
 * Security context, tenant e CSRF para requisições ENOVIA.
 */
var PlatformContext = (function () {
  'use strict';

  var state = {
    securityContext: null,
    tenant: null,
    csrfToken: null,
    platformId: null,
    collabSpace: null,
    user: null,
    ready: false
  };

  function getRequire() {
    if (typeof PlatformBridge !== 'undefined' && PlatformBridge.isTrustedRuntime && PlatformBridge.isTrustedRuntime()) {
      if (typeof require !== 'undefined') return require;
    }
    if (typeof PlatformBridge !== 'undefined' && PlatformBridge.isExternalWidget()) {
      return PlatformBridge.safeGetRequire();
    }
    if (typeof require !== 'undefined') return require;
    try {
      if (window.parent && window.parent !== window) {
        return window.parent['require'];
      }
    } catch (e) { /* cross-origin: não acessar parent */ }
    return null;
  }

  function loadFromWidget() {
    return new Promise(function (resolve) {
      var req = getRequire();
      if (!req) {
        resolve(false);
        return;
      }
      try {
        req(['DS/PlatformAPI/PlatformAPI'], function (PlatformAPI) {
          PlatformAPI.getSecurityContext().then(function (ctx) {
            state.securityContext = ctx;
            return PlatformAPI.getTenant();
          }).then(function (tenant) {
            state.tenant = tenant;
            state.ready = true;
            resolve(true);
          }).catch(function () {
            resolve(false);
          });
        }, function () {
          resolve(false);
        });
      } catch (e) {
        resolve(false);
      }
    });
  }

  function loadFromWAF() {
    return new Promise(function (resolve) {
      if (typeof widget === 'undefined' || !widget.wafSecurityContext) {
        resolve(false);
        return;
      }
      state.securityContext = widget.wafSecurityContext;
      state.collabSpace = widget.collabSpace || null;
      state.platformId = widget.x3dPlatformId || null;
      state.ready = !!state.securityContext;
      resolve(state.ready);
    });
  }

  function loadFrom3DXDeepLink() {
    if (typeof ThreeDXContentParser === 'undefined') return false;
    var content = ThreeDXContentParser.parseLocations();
    var ctx = ThreeDXContentParser.toPlatformContext(content);
    if (!ctx || !ctx.securityContext) return false;
    state.securityContext = ctx.securityContext;
    state.tenant = ctx.tenant || state.tenant;
    state.platformId = ctx.platformId || state.platformId;
    state.ready = true;
    return true;
  }

  function init() {
    if (APP_CONFIG.DEMO_MODE) {
      state.securityContext = 'ctx::VPLMProjectLeader.Company Name.Default';
      state.tenant = 'demo-tenant';
      state.user = { login: 'demo.user' };
      state.ready = true;
      return Promise.resolve(state);
    }
    if (loadFrom3DXDeepLink()) {
      return Promise.resolve(state);
    }
    if (!state.securityContext && APP_CONFIG.TENANT_DEFAULTS && APP_CONFIG.TENANT_DEFAULTS.securityContext) {
      state.securityContext = APP_CONFIG.TENANT_DEFAULTS.securityContext;
      state.tenant = APP_CONFIG.TENANT_DEFAULTS.envId || state.tenant;
      state.platformId = APP_CONFIG.TENANT_DEFAULTS.envId || state.platformId;
      state.ready = true;
    }

    return loadFromWidget().then(function (ok) {
      if (ok) return state;
      return loadFromWAF().then(function () {
        if (!state.ready) loadFrom3DXDeepLink();
        if (!state.ready && APP_CONFIG.TENANT_DEFAULTS && APP_CONFIG.TENANT_DEFAULTS.securityContext) {
          state.securityContext = APP_CONFIG.TENANT_DEFAULTS.securityContext;
          state.tenant = APP_CONFIG.TENANT_DEFAULTS.envId;
          state.platformId = APP_CONFIG.TENANT_DEFAULTS.envId;
          state.ready = true;
        }
        return state;
      });
    });
  }

  function getHeaders() {
    var h = {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    };
    if (state.securityContext) {
      h.SecurityContext = state.securityContext;
    }
    if (state.csrfToken) {
      h['X-CSRF-Token'] = state.csrfToken;
    }
    return h;
  }

  return {
    init: init,
    getState: function () { return Object.assign({}, state); },
    getHeaders: getHeaders,
    setCsrfToken: function (t) { state.csrfToken = t; },
    isReady: function () { return state.ready; }
  };
})();
