/**
 * @file embed-query.js
 * Resolve ?snapshot= e demais params quando o widget roda no frame 3DDashboard
 * (uwaUrl no frame pai — location.search do documento interno vem vazio).
 */
(function (global) {
  'use strict';

  function parseQueryString(search) {
    var q = {};
    if (!search) return q;
    var s = String(search).replace(/^\?/, '');
    if (!s) return q;
    s.split('&').forEach(function (pair) {
      var p = pair.split('=');
      var k = decodeURIComponent(p[0] || '');
      if (!k) return;
      try {
        q[k] = decodeURIComponent((p[1] || '').replace(/\+/g, ' '));
      } catch (e) {
        q[k] = p[1] || '';
      }
    });
    return q;
  }

  function mergeInto(target, source) {
    if (!source) return target;
    Object.keys(source).forEach(function (k) {
      if (source[k] != null && source[k] !== '') target[k] = source[k];
    });
    return target;
  }

  function paramsFromUrl(url) {
    var q = {};
    if (!url) return q;
    var str = String(url);
    var qIdx = str.indexOf('?');
    if (qIdx >= 0) mergeInto(q, parseQueryString(str.slice(qIdx)));

    var m = str.match(/[?&]uwaUrl=([^&]+)/i);
    if (m && m[1]) {
      try {
        var inner = decodeURIComponent(m[1]);
        mergeInto(q, paramsFromUrl(inner));
      } catch (e) { /* */ }
    }
    return q;
  }

  function collectSources() {
    var list = [];
    try {
      list.push(global.location.href);
      list.push(global.location.search);
    } catch (e) { /* */ }
    try {
      if (global.frameElement && global.frameElement.src) list.push(global.frameElement.src);
    } catch (e2) { /* */ }
    var win = global;
    for (var d = 0; d < 5; d++) {
      try {
        if (!win.parent || win.parent === win) break;
        win = win.parent;
        list.push(win.location.href);
        list.push(win.location.search);
      } catch (e3) {
        break;
      }
    }
    return list;
  }

  function parseEmbedQuery() {
    var merged = {};
    if (global.__3DX_EMBED_QUERY__ && typeof global.__3DX_EMBED_QUERY__ === 'object') {
      mergeInto(merged, global.__3DX_EMBED_QUERY__);
    }
    collectSources().forEach(function (src) {
      mergeInto(merged, paramsFromUrl(src));
      var hash = '';
      try {
        if (src && src.indexOf('#') >= 0) hash = src.slice(src.indexOf('#'));
      } catch (e) { /* */ }
      if (hash.indexOf('?') >= 0) {
        mergeInto(merged, parseQueryString(hash.slice(hash.indexOf('?'))));
      }
    });
    mergeInto(merged, parseQueryString(global.location.search));

    if (global.__3DX_DEFAULT_SNAPSHOT__ && !merged.snapshot && !merged.snap && !merged.data) {
      merged.snapshot = global.__3DX_DEFAULT_SNAPSHOT__;
    }
    return merged;
  }

  global.parseEmbedQuery = parseEmbedQuery;
  global.__3DX_EMBED_QUERY__ = parseEmbedQuery();
})(typeof window !== 'undefined' ? window : this);
