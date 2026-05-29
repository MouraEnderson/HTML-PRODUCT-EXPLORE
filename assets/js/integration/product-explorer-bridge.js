/**
 * @file integration/product-explorer-bridge.js
 * Ponte de seleção com Product Explorer / widgets 3DDashboard.
 */
var ProductExplorerBridge = (function () {
  'use strict';

  var listeners = [];
  var currentSelection = null;

  var MESSAGE_TYPES = [
    '3DX_SELECTION',
    '3DX_SELECTION_RESPONSE',
    'selectionChanged',
    'onSelectedObject',
    'productexplorer.selection',
    'DS/Selection/selected',
    'objectSelected',
    'selectedObjectChanged'
  ];

  function normalizeSelection(payload) {
    if (!payload) return null;
    var obj = payload.data || payload.object || payload.item || payload;
    var physicalid = obj.physicalid || obj.id || obj.objectId || obj['dseno:physicalid'];
    if (!physicalid) return null;
    return {
      physicalid: physicalid,
      type: obj.type || obj.objectType || obj['dseno:type'] || 'VPMReference',
      name: obj.name || obj.title || obj['dseno:name'] || '',
      displayName: obj.displayName || obj.title || obj.name || physicalid
    };
  }

  function setSelection(sel, opts) {
    if (!sel || !sel.physicalid) return;
    currentSelection = sel;
    if (opts && opts.silent) return;
    listeners.forEach(function (fn) {
      try { fn(sel); } catch (e) { console.error('[Bridge]', e); }
    });
  }

  function onMessage(event) {
    if (!event.data) return;
    var origin = event.origin || '';
    var okOrigin =
      !origin ||
      origin === location.origin ||
      origin.indexOf('3dexperience.3ds.com') >= 0 ||
      origin.indexOf('3ds.com') >= 0 ||
      origin.indexOf('github') >= 0;
    if (!okOrigin) return;

    var data = event.data;
    if (typeof data === 'string') {
      if (typeof ThreeDXContentParser !== 'undefined') {
        var loose = ThreeDXContentParser.parseJsonText(data);
        if (loose) {
          setSelection(loose);
          return;
        }
      }
      try { data = JSON.parse(data); } catch (e) { return; }
    }

    if (data.physicalid || data.objectId || data.resourceid) {
      var direct = normalizeSelection(data);
      if (direct) {
        setSelection(direct);
        return;
      }
    }
    if (data.protocol === '3DXContent' && data.data && data.data.items) {
      var sel3dx = ThreeDXContentParser.toSelection(data);
      if (sel3dx) setSelection(sel3dx);
      return;
    }
    if (data.items && data.items.length) {
      var selItems = normalizeSelection(data.items[0]);
      if (selItems) setSelection(selItems);
      return;
    }
    var type = data.type || data.event || data.name;
    if (MESSAGE_TYPES.indexOf(type) === -1 && !data.physicalid && !data.object && !data.objectId) return;
    var sel = normalizeSelection(data);
    if (sel) setSelection(sel);
  }

  function subscribe(fn) {
    listeners.push(fn);
    if (currentSelection) fn(currentSelection);
    return function () {
      listeners = listeners.filter(function (f) { return f !== fn; });
    };
  }

  function initFromQuery() {
    if (APP_QUERY.physicalid) {
      setSelection({
        physicalid: APP_QUERY.physicalid,
        type: APP_QUERY.type || 'VPMReference',
        name: APP_QUERY.name || APP_QUERY.physicalid,
        displayName: APP_QUERY.displayName || APP_QUERY.physicalid
      });
    }
  }

  function initFrom3DXDeepLink() {
    if (typeof ThreeDXContentParser === 'undefined') return;
    var content = ThreeDXContentParser.parseLocations();
    var sel = ThreeDXContentParser.toSelection(content);
    if (sel) setSelection(sel);
  }

  function initWidgetEvents() {
    if (typeof widget === 'undefined') return;
    if (widget.addEvent) {
      widget.addEvent('onLoad', function () {
        var val = widget.getValue && widget.getValue('selectedObject');
        if (val) setSelection(normalizeSelection(val));
      });
    }
    if (widget.addEvents) {
      widget.addEvents({
        onRefresh: function () {
          var val = widget.getValue && widget.getValue('selectedObject');
          if (val) setSelection(normalizeSelection(val));
        }
      });
    }
  }

  function initPlatformSelection() {
    var req = typeof require !== 'undefined' ? require : null;
    if (!req) return;
    try {
      req(['DS/Selection/Selection'], function (Selection) {
        if (Selection && Selection.getSelection) {
          Selection.getSelection().then(function (items) {
            if (items && items.length) setSelection(normalizeSelection(items[0]));
          });
        }
      });
    } catch (e) { /* opcional */ }
  }

  function pollSelection() {
    initPlatformSelection();
    if (typeof PlatformBridge !== 'undefined') {
      PlatformBridge.requestDashboardSelection();
    }
  }

  function startContentPoll() {
    window.setInterval(function () {
      if (typeof ThreeDXContentParser === 'undefined') return;
      var content = ThreeDXContentParser.parseLocations();
      var sel = content ? ThreeDXContentParser.toSelection(content) : null;
      if (!sel || !sel.physicalid) return;
      if (!currentSelection || currentSelection.physicalid !== sel.physicalid) {
        setSelection(sel);
      }
    }, 2500);
  }

  function init() {
    window.addEventListener('message', onMessage, false);
    initFromQuery();
    initFrom3DXDeepLink();
    initWidgetEvents();
    initPlatformSelection();
    startContentPoll();
    return {
      getSelection: function () { return currentSelection; },
      subscribe: subscribe,
      setSelection: setSelection
    };
  }

  return {
    init: init,
    subscribe: subscribe,
    setSelection: setSelection,
    getSelection: function () { return currentSelection; },
    normalizeSelection: normalizeSelection
  };
})();
