/**
 * @file config.js
 * Configuração do Additional App Documentação 2D (AiER) — independente do BOM Analytics.
 */
(function (global) {
  'use strict';

  var query = {};
  try {
    var qs = (global.location && global.location.search) || '';
    qs.replace(/^\?/, '').split('&').forEach(function (pair) {
      var p = pair.split('=');
      if (p[0]) query[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || '');
    });
  } catch (e) { /* */ }

  function pickUrl(raw, fallback) {
    if (!raw || typeof raw !== 'string') return fallback;
    var v = raw.trim();
    if (!v || v.indexOf('://') < 0) return fallback;
    if (/SUA-API|SEU-SERVIDOR|SEU-DASHBOARD|your-api|your-web/i.test(v)) return fallback;
    return v;
  }

  var AIER_CONFIG = {
    APP_ID: 'AIER_2D_AUTOPILOT',
    APP_TITLE: '2D AUTOPILOT',
    APP_SUBTITLE: 'Documentação 2D — AI Engineering Reviewer',
    BUILD: 'aier20260604a',
    API_URL: 'http://127.0.0.1:5201',
    WEB_URL: 'http://127.0.0.1:3000',
    SHOW_BUILD_TAG: true
  };

  var apiQ = query.aierApi || query.userApi || query.api;
  var webQ = query.aierWeb || query.userWeb || query.web;
  AIER_CONFIG.API_URL = pickUrl(apiQ, AIER_CONFIG.API_URL);
  AIER_CONFIG.WEB_URL = pickUrl(webQ, AIER_CONFIG.WEB_URL);

  var buildQ = query.build || query.v;
  if (buildQ && /^aier20/.test(String(buildQ))) AIER_CONFIG.BUILD = buildQ;

  if (global.__AIER_WIDGET_BUILD_ID__ && /^aier20/.test(String(global.__AIER_WIDGET_BUILD_ID__))) {
    AIER_CONFIG.BUILD = String(global.__AIER_WIDGET_BUILD_ID__);
  }

  global.AIER_CONFIG = AIER_CONFIG;
  global.AIER_QUERY = query;
})(typeof window !== 'undefined' ? window : this);
