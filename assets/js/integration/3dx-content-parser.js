/**
 * @file integration/3dx-content-parser.js
 * Lê deep-links 3DEXPERIENCE (#app:.../content:X3DContentId=...).
 */
var ThreeDXContentParser = (function () {
  'use strict';

  function tryParseJson(encoded) {
    try {
      return JSON.parse(decodeURIComponent(encoded));
    } catch (e1) {
      try {
        return JSON.parse(encoded);
      } catch (e2) {
        return null;
      }
    }
  }

  function extractFromHash(hash) {
    if (!hash) return null;
    var h = hash.charAt(0) === '#' ? hash.slice(1) : hash;
    var marker = 'X3DContentId=';
    var idx = h.indexOf(marker);
    if (idx < 0) return null;
    var raw = h.slice(idx + marker.length);
    var end = raw.indexOf('&');
    if (end > -1) raw = raw.slice(0, end);
    return tryParseJson(raw);
  }

  function parseLocations() {
    var sources = [window.location.hash, window.location.search];
    try {
      if (window.parent && window.parent !== window && window.parent.location) {
        sources.push(window.parent.location.hash);
        sources.push(window.parent.location.search);
      }
    } catch (e) { /* cross-origin */ }
    try {
      if (window.top && window.top.location) {
        sources.push(window.top.location.hash);
        sources.push(window.top.location.search);
      }
    } catch (e2) { /* */ }
    for (var i = 0; i < sources.length; i++) {
      var parsed = extractFromHash(sources[i]);
      if (parsed) return parsed;
    }
    return null;
  }

  function toSelection(content) {
    if (!content || !content.data || !content.data.items || !content.data.items.length) {
      return null;
    }
    var item = content.data.items[0];
    return {
      physicalid: item.objectId || item.resourceid,
      type: item.objectType || 'VPMReference',
      name: item.displayName || item.objectId,
      displayName: item.displayName || item.objectId,
      displayType: item.displayType || '',
      envId: item.envId || null,
      serviceId: item.serviceId || '3DSpace',
      contextId: item.contextId || null,
      i3dx: item.i3dx || null,
      widgetId: content.widgetId || null,
      source: content.source || null
    };
  }

  function toPlatformContext(content) {
    var sel = toSelection(content);
    if (!sel) return null;
    return {
      securityContext: sel.contextId,
      tenant: sel.envId,
      platformId: sel.envId
    };
  }

  /** Texto/JSON colado ou arrastado do 3DEXPERIENCE (Physical Product). */
  function parseJsonTextLoose(text) {
    var t = String(text || '');
    var idM = t.match(/"objectId"\s*:\s*"([^"]+)"/i) ||
      t.match(/"physicalid"\s*:\s*"([^"]+)"/i) ||
      t.match(/"resourceid"\s*:\s*"([^"]+)"/i);
    if (!idM) return null;
    var nameM = t.match(/"displayName"\s*:\s*"([^"]+)"/i);
    var typeM = t.match(/"objectType"\s*:\s*"([^"]+)"/i) ||
      t.match(/"type"\s*:\s*"([^"]+)"/i);
    return {
      physicalid: idM[1],
      type: typeM ? typeM[1] : 'VPMReference',
      name: nameM ? nameM[1] : idM[1],
      displayName: nameM ? nameM[1] : idM[1],
      displayType: 'Physical Product',
      source: 'loose-parse'
    };
  }

  function parseJsonText(text) {
    var trimmed = String(text || '').trim();
    if (!trimmed) return null;

    if (trimmed.charAt(0) !== '{' && trimmed.charAt(0) !== '[') {
      return parseJsonTextLoose(trimmed);
    }

    var obj = tryParseJson(trimmed);
    if (!obj) return parseJsonTextLoose(trimmed);

    if (obj.protocol === '3DXContent') {
      return toSelection(obj);
    }
    if (obj.data && obj.data.items && obj.data.items.length) {
      return toSelection(obj);
    }
    if (obj.items && obj.items.length) {
      return toSelection({ data: { items: obj.items } });
    }

    var id = obj.objectId || obj.physicalid || obj.id || obj.resourceid;
    if (!id) return null;

    return {
      physicalid: id,
      type: obj.objectType || obj.type || 'VPMReference',
      name: obj.displayName || obj.name || id,
      displayName: obj.displayName || obj.name || id,
      displayType: obj.displayType || 'Physical Product',
      envId: obj.envId || null,
      serviceId: obj.serviceId || '3DSpace',
      contextId: obj.contextId || obj.context || null,
      i3dx: obj.i3dx || null,
      source: obj.source || 'drop'
    };
  }

  return {
    parseLocations: parseLocations,
    parseJsonText: parseJsonText,
    parseJsonTextLoose: parseJsonTextLoose,
    toSelection: toSelection,
    toPlatformContext: toPlatformContext,
    extractFromHash: extractFromHash
  };
})();
