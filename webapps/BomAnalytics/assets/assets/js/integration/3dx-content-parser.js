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
    var sources = [window.location.hash];
    try {
      if (window.parent && window.parent !== window && window.parent.location) {
        sources.push(window.parent.location.hash);
      }
    } catch (e) { /* cross-origin */ }
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

  return {
    parseLocations: parseLocations,
    toSelection: toSelection,
    toPlatformContext: toPlatformContext,
    extractFromHash: extractFromHash
  };
})();
