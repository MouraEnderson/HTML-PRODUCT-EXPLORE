(function (global) {
  'use strict';

  function now() {
    return Date.now ? Date.now() : new Date().getTime();
  }

  function text(value) {
    return value == null ? '' : String(value).trim();
  }

  function number(value, fallback) {
    var parsed = parseInt(value, 10);
    return isNaN(parsed) ? (fallback || 0) : parsed;
  }

  function safeLog(label, detail) {
    if (!global.console || !console.info) return;
    console.info('[Auto-Context]', label, detail || '');
  }

  function objectValue(object, keys) {
    if (!object || typeof object !== 'object') return '';
    for (var i = 0; i < keys.length; i++) {
      var value = object[keys[i]];
      if (value != null && value !== '') return text(value);
    }
    return '';
  }

  function nestedValue(object, keys) {
    var direct = objectValue(object, keys);
    if (direct) return direct;
    var nested = [
      object && object.context,
      object && object.selection,
      object && object.currentSelection,
      object && object.data,
      object && object.platformItem,
      object && object.detail,
      object && object.payload
    ];
    for (var i = 0; i < nested.length; i++) {
      direct = objectValue(nested[i], keys);
      if (direct) return direct;
    }
    return '';
  }

  function normalizeDetectedObject(input, source) {
    input = input || {};
    var id = nestedValue(input, ['id', 'physicalId', 'physicalid', 'selectedId', 'objectId', 'rootId', 'referenceId']);
    var name = nestedValue(input, ['name', 'rootName', 'productName', 'displayName']);
    var title = nestedValue(input, ['title', 'label', 'displayName', 'productName', 'rootName', 'name']);
    var type = nestedValue(input, ['type', 'displayType', 'objectType']) || 'unknown';
    var expectedCount = number(nestedValue(input, ['expectedCount', 'childrenCount', 'childCount', 'selectionCount', 'objectCount']), 0);
    var selectedCount = number(nestedValue(input, ['selectionCount']), 0);
    var detectedDepth = number(nestedValue(input, ['depth', 'detectedDepth', 'level']), 0);
    if (!id && !name && !title) return null;
    return {
      id: id,
      name: name,
      title: title || name || id,
      type: type,
      source: source,
      expectedCount: expectedCount,
      selectionCount: selectedCount,
      detectedDepth: detectedDepth,
      raw: input
    };
  }

  function resultFor(name, startedAt, ok, detectedObject, reason, detail) {
    return {
      name: name,
      ok: !!ok,
      reason: text(reason || (ok ? 'ok' : 'not-available')),
      timingMs: Math.max(0, now() - startedAt),
      detectedObject: detectedObject,
      detail: detail || {}
    };
  }

  function promiseProbe(name, factory) {
    var startedAt = now();
    return Promise.resolve()
      .then(factory)
      .then(function (payload) {
        if (payload && payload.ok && payload.detectedObject) {
          var okResult = resultFor(name, startedAt, true, payload.detectedObject, payload.reason || 'detected', payload.detail);
          safeLog(name + ' OK', okResult);
          return okResult;
        }
        var failResult = resultFor(name, startedAt, false, null, payload && payload.reason, payload && payload.detail);
        safeLog(name + ' failed', failResult);
        return failResult;
      })
      .catch(function (error) {
        var failed = resultFor(name, startedAt, false, null, error && error.message, {});
        safeLog(name + ' exception', failed);
        return failed;
      });
  }

  function probePlatformApi() {
    return promiseProbe('PlatformAPI.getStructureContext()', function () {
      var api = global.__3DX_PLATFORM_API__ || global.PlatformAPI;
      if (!api || typeof api.getStructureContext !== 'function') {
        return { ok: false, reason: 'PlatformAPI.getStructureContext indisponível' };
      }
      return Promise.resolve(api.getStructureContext()).then(function (context) {
        var detected = normalizeDetectedObject(context, 'platform-api');
        return detected
          ? { ok: true, detectedObject: detected, detail: { provider: 'PlatformAPI' } }
          : { ok: false, reason: 'PlatformAPI retornou contexto vazio' };
      });
    });
  }

  function probeExplorerContext() {
    return promiseProbe('ExplorerContext.currentSelection', function () {
      var selection = null;
      var detail = {
        hasExplorerContext: !!global.ExplorerContext,
        hasProductExplorerBridge: !!global.ProductExplorerBridge
      };
      if (global.ExplorerContext && typeof global.ExplorerContext.refresh === 'function') {
        try {
          global.ExplorerContext.refresh(false);
        } catch (error) {
          detail.refreshError = text(error && error.message);
        }
      }
      if (global.ExplorerContext && global.ExplorerContext.currentSelection) {
        selection = global.ExplorerContext.currentSelection;
      }
      if (!selection && global.ProductExplorerBridge && typeof global.ProductExplorerBridge.getSelection === 'function') {
        selection = global.ProductExplorerBridge.getSelection();
      }
      if (!selection && global.ExplorerContext && typeof global.ExplorerContext.get === 'function') {
        selection = global.ExplorerContext.get();
      }
      var detected = normalizeDetectedObject(selection, 'explorer-context');
      return detected
        ? { ok: true, detectedObject: detected, detail: detail }
        : { ok: false, reason: 'ExplorerContext sem seleção compartilhada', detail: detail };
    });
  }

  function probeCompassContext() {
    return promiseProbe('3DXCompass context', function () {
      var candidates = [];
      if (global.__3DX_COMPASS__) candidates.push(global.__3DX_COMPASS__);
      if (global.CompassServices) candidates.push(global.CompassServices);
      if (global.widget && typeof global.widget.getValue === 'function') {
        try {
          candidates.push(global.widget.getValue('context'));
        } catch (error) {
          candidates.push({ widgetContextError: text(error && error.message) });
        }
      }
      if (global.__3DX_EMBED_QUERY__) candidates.push(global.__3DX_EMBED_QUERY__);
      for (var i = 0; i < candidates.length; i++) {
        var detected = normalizeDetectedObject(candidates[i], '3dx-compass');
        if (detected) {
          return {
            ok: true,
            detectedObject: detected,
            detail: { candidateIndex: i, totalCandidates: candidates.length }
          };
        }
      }
      return { ok: false, reason: '3DXCompass sem contexto resolvível', detail: { totalCandidates: candidates.length } };
    });
  }

  function messageResponseData(data) {
    if (!data || typeof data !== 'object') return null;
    if (data.type === 'BOM_AUTO_CONTEXT_RESPONSE' || data.event === 'BOM_AUTO_CONTEXT_RESPONSE') {
      return data.payload || data.context || data.selection || data;
    }
    if (data.type === '3DX_SELECTION' || data.type === 'selectionChanged' || data.event === 'onSelectedObject') {
      return data.selection || data.payload || data;
    }
    if (data.type === '3DX_STRUCTURE_CONTEXT') {
      return data.payload || data.context || data;
    }
    return null;
  }

  function accessibleSiblingFrames() {
    var list = [];
    try {
      var frames = global.parent && global.parent.document ? global.parent.document.getElementsByTagName('iframe') : [];
      for (var i = 0; i < frames.length; i++) {
        var frame = frames[i];
        if (frame === global.frameElement) continue;
        try {
          if (frame.contentWindow) list.push(frame);
        } catch (error) {
          /* ignore cross-origin siblings */
        }
      }
    } catch (errorOuter) {
      /* ignore */
    }
    return list;
  }

  function probePlatformBridge() {
    return promiseProbe('PlatformBridge postMessage', function () {
      return new Promise(function (resolve) {
        var finished = false;
        var timer = null;
        function done(payload) {
          if (finished) return;
          finished = true;
          if (timer) global.clearTimeout(timer);
          if (global.removeEventListener) global.removeEventListener('message', onMessage, false);
          resolve(payload);
        }
        function onMessage(event) {
          var detected = normalizeDetectedObject(messageResponseData(event && event.data), 'platform-bridge');
          if (!detected) return;
          done({
            ok: true,
            detectedObject: detected,
            detail: { via: 'postMessage-listener', origin: text(event && event.origin) }
          });
        }

        if (global.addEventListener) global.addEventListener('message', onMessage, false);

        var bridge = global.PlatformBridge;
        if (bridge && typeof bridge.requestExplorerStructure === 'function') {
          try { bridge.requestExplorerStructure(); } catch (errorA) { /* */ }
        }
        if (bridge && typeof bridge.requestDashboardSelection === 'function') {
          try { bridge.requestDashboardSelection(); } catch (errorB) { /* */ }
        }

        var request = {
          type: 'BOM_AUTO_CONTEXT_REQUEST',
          source: 'bom-auto-context-detector-bom20260622b'
        };
        try {
          if (global.parent && global.parent !== global && global.parent.postMessage) {
            global.parent.postMessage(request, '*');
          }
        } catch (errorParent) {
          /* ignore */
        }
        accessibleSiblingFrames().forEach(function (frame) {
          try {
            frame.contentWindow.postMessage(request, '*');
          } catch (errorFrame) {
            /* ignore */
          }
        });

        timer = global.setTimeout(function () {
          var selection = global.ProductExplorerBridge && typeof global.ProductExplorerBridge.getSelection === 'function'
            ? global.ProductExplorerBridge.getSelection()
            : null;
          var detected = normalizeDetectedObject(selection, 'platform-bridge');
          done(detected
            ? { ok: true, detectedObject: detected, detail: { via: 'bridge-selection-fallback' } }
            : { ok: false, reason: 'Sem resposta inter-widget controlada' });
        }, 450);
      });
    });
  }

  function probeDomInspection() {
    return promiseProbe('DOM inspection', function () {
      var frames = accessibleSiblingFrames();
      for (var i = 0; i < frames.length; i++) {
        var frame = frames[i];
        try {
          var query = frame.src || '';
          var matchId = query.match(/[?&#](?:physicalid|physicalId|selectedId|objectId|rootId)=([^&#]+)/);
          var matchName = query.match(/[?&#](?:displayName|title|name|rootName)=([^&#]+)/);
          var detected = normalizeDetectedObject({
            physicalId: matchId && matchId[1] ? decodeURIComponent(matchId[1]) : '',
            title: matchName && matchName[1] ? decodeURIComponent(matchName[1]) : '',
            type: 'iframe-query'
          }, 'dom-inspection');
          if (detected) {
            return { ok: true, detectedObject: detected, detail: { via: 'iframe-src-query' } };
          }
          var doc = frame.contentDocument || (frame.contentWindow && frame.contentWindow.document);
          if (doc) {
            var node = doc.querySelector('[data-physical-id],[data-object-id],[data-root-id]');
            if (node) {
              detected = normalizeDetectedObject({
                physicalId: node.getAttribute('data-physical-id') || node.getAttribute('data-object-id') || node.getAttribute('data-root-id'),
                title: node.getAttribute('data-title') || node.getAttribute('data-name') || text(node.textContent),
                type: node.getAttribute('data-type') || node.tagName
              }, 'dom-inspection');
              if (detected) return { ok: true, detectedObject: detected, detail: { via: 'iframe-dom-attributes' } };
            }
          }
        } catch (error) {
          /* ignore inaccessible DOM */
        }
      }
      return { ok: false, reason: 'Nenhum iframe irmão acessível com contexto' };
    });
  }

  function timingsFromResults(results, totalTimingMs) {
    var timings = {};
    results.forEach(function (item) {
      timings[item.name] = item.timingMs;
    });
    timings.total = totalTimingMs;
    return timings;
  }

  function detect() {
    var startedAt = now();
    return Promise.all([
      probePlatformApi(),
      probeExplorerContext(),
      probeCompassContext(),
      probePlatformBridge(),
      probeDomInspection()
    ]).then(function (results) {
      var winner = null;
      for (var i = 0; i < results.length; i++) {
        if (results[i].ok && results[i].detectedObject) {
          winner = results[i];
          break;
        }
      }
      var totalTimingMs = Math.max(0, now() - startedAt);
      var output = {
        ok: !!winner,
        source: winner ? winner.name : '',
        detectedObject: winner ? winner.detectedObject : null,
        autoContextProbeResults: results,
        autoContextTimings: timingsFromResults(results, totalTimingMs),
        totalTimingMs: totalTimingMs
      };
      safeLog('winner', output);
      return output;
    });
  }

  global.BomAutoContextDetector = {
    detect: detect,
    normalizeDetectedObject: normalizeDetectedObject
  };
})(window);
