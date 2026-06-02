/**
 * @file integration/3dplay-bridge.js
 * Sprint 3 — envia seleção E-BOM para 3DPlay (widget dashboard + player embutido).
 */
var ThreeDPlayBridge = (function () {
  'use strict';

  var lastStatus = { mode: 'idle', ok: false, message: '', physicalId: '' };
  var embeddedPlayer = null;
  var embeddedHost = null;
  var loadToken = 0;

  function cfg() {
    return (APP_CONFIG && APP_CONFIG.THREE_DPLAY) || {};
  }

  function tenantId() {
    if (APP_CONFIG && APP_CONFIG.TENANT_DEFAULTS && APP_CONFIG.TENANT_DEFAULTS.envId) {
      return APP_CONFIG.TENANT_DEFAULTS.envId;
    }
    return 'R1132100929518';
  }

  function platformOrigin() {
    if (typeof PlatformBridge !== 'undefined' && PlatformBridge.getPlatformOrigin) {
      return PlatformBridge.getPlatformOrigin();
    }
    if (APP_CONFIG && APP_CONFIG.TENANT_DEFAULTS && APP_CONFIG.TENANT_DEFAULTS.platformHost) {
      return 'https://' + APP_CONFIG.TENANT_DEFAULTS.platformHost;
    }
    return '';
  }

  function resolvePhysicalId(node) {
    if (!node) return '';
    if (typeof PartImage !== 'undefined' && PartImage.lookupPrdId) {
      return PartImage.lookupPrdId(node);
    }
    var pid = String(node.sourcePhysicalId || node.physicalid || '').trim();
    if (typeof ThreeDXContentParser !== 'undefined' && ThreeDXContentParser.normalizePhysicalId) {
      pid = ThreeDXContentParser.normalizePhysicalId(pid);
    }
    return pid;
  }

  function isPlayableId(pid) {
    if (!pid) return false;
    if (typeof PartImage !== 'undefined' && PartImage.isSyntheticId && PartImage.isSyntheticId(pid)) {
      return false;
    }
    if (typeof ThreeDXContentParser !== 'undefined' && ThreeDXContentParser.isValidPhysicalId) {
      return ThreeDXContentParser.isValidPhysicalId(pid);
    }
    return String(pid).length >= 8;
  }

  function resolveObjectType(node, physicalId) {
    var raw = String(
      (node && (node.objectType || node.type || node.displayType)) || ''
    ).trim();
    var low = raw.toLowerCase();
    if (low.indexOf('physical product') >= 0 || low.indexOf('physicalproduct') >= 0) {
      return 'Physical Product';
    }
    if (low.indexOf('vpmreference') >= 0 || low === 'vpm reference') {
      return 'VPMReference';
    }
    if (low.indexOf('provide') >= 0) return 'Provide';
    if (/^prd-/i.test(String(physicalId || ''))) return 'Physical Product';
    return (cfg().DEFAULT_OBJECT_TYPE) || 'VPMReference';
  }

  function buildContent(node) {
    var physicalId = resolvePhysicalId(node);
    if (!isPlayableId(physicalId)) return null;
    var objectType = resolveObjectType(node, physicalId);
    var name = (node && (node.name || node.title || node.displayName)) || physicalId;
    return {
      protocol: '3DXContent',
      source: 'BOM Analytics',
      data: {
        items: [{
          envId: tenantId(),
          objectId: physicalId,
          objectType: objectType,
          displayName: name,
          name: name,
          serviceId: '3DSpace',
          contextId: (APP_CONFIG && APP_CONFIG.TENANT_DEFAULTS &&
            APP_CONFIG.TENANT_DEFAULTS.securityContext) || null
        }]
      }
    };
  }

  function setStatus(mode, ok, message, physicalId) {
    lastStatus = {
      mode: mode || 'idle',
      ok: !!ok,
      message: String(message || ''),
      physicalId: String(physicalId || '')
    };
    return lastStatus;
  }

  function getLastStatus() {
    return lastStatus;
  }

  function postToDashboard(msg) {
    var origin = platformOrigin();
    var targets = [window.top, window.parent, window];
    var i;
    var t;
    for (i = 0; i < targets.length; i++) {
      t = targets[i];
      if (!t || !t.postMessage) continue;
      try { if (origin) t.postMessage(msg, origin); } catch (e1) { /* */ }
      try { t.postMessage(msg, '*'); } catch (e2) { /* */ }
    }
  }

  function pushViaPostMessage(content) {
    var appIds = cfg().APP_IDS || ['SWX3DPlay_AP', 'X3DPlay_AP', 'ENX3DPlay_AP'];
    var payload = {
      protocol: '3DXContent',
      action: 'load',
      type: '3DXContent',
      event: 'loadObject',
      data: content.data,
      content: content
    };
    postToDashboard(payload);
    var j;
    for (j = 0; j < appIds.length; j++) {
      postToDashboard({
        protocol: '3DXContent',
        action: 'launchApp',
        appId: appIds[j],
        type: '3DXContent',
        data: content.data,
        content: content
      });
      postToDashboard({
        type: '3DXContent',
        action: 'open',
        appId: appIds[j],
        data: content.data
      });
    }
    return true;
  }

  function pushViaInterCom(content, callback) {
    var req = (typeof PlatformBridge !== 'undefined' && PlatformBridge.safeGetRequire)
      ? PlatformBridge.safeGetRequire()
      : (typeof require !== 'undefined' ? require : null);
    if (!req) {
      if (callback) callback(false, 'require indisponível');
      return;
    }
    req(['UWA/Utils/InterCom'], function (InterCom) {
      if (!InterCom) {
        if (callback) callback(false, 'InterCom indisponível');
        return;
      }
      try {
        if (InterCom.publish) {
          InterCom.publish({
            event: '3DXContent',
            protocol: '3DXContent',
            data: content.data,
            sender: APP_CONFIG && APP_CONFIG.APP_ID
          });
        }
        if (InterCom.broadcast) {
          InterCom.broadcast('3DXContent', content);
        }
        if (callback) callback(true, 'InterCom');
      } catch (e) {
        if (callback) callback(false, e.message || 'InterCom falhou');
      }
    }, function () {
      if (callback) callback(false, 'InterCom módulo não carregou');
    });
  }

  function pushViaPlatformApi(content, callback) {
    var req = (typeof PlatformBridge !== 'undefined' && PlatformBridge.safeGetRequire)
      ? PlatformBridge.safeGetRequire()
      : (typeof require !== 'undefined' ? require : null);
    if (!req) {
      if (callback) callback(false, 'require indisponível');
      return;
    }
    req(['DS/PlatformAPI/PlatformAPI'], function (PlatformAPI) {
      if (!PlatformAPI) {
        if (callback) callback(false, 'PlatformAPI indisponível');
        return;
      }
      try {
        if (PlatformAPI.publish) {
          PlatformAPI.publish('3DXContent', content);
        }
        if (PlatformAPI.setSelection && content.data && content.data.items && content.data.items[0]) {
          PlatformAPI.setSelection(content.data.items);
        }
        if (callback) callback(true, 'PlatformAPI');
      } catch (e2) {
        if (callback) callback(false, e2.message || 'PlatformAPI falhou');
      }
    }, function () {
      if (callback) callback(false, 'PlatformAPI módulo não carregou');
    });
  }

  function destroyEmbeddedPlayer() {
    if (embeddedPlayer && embeddedPlayer.destroy) {
      try { embeddedPlayer.destroy(); } catch (e) { /* */ }
    }
    embeddedPlayer = null;
    if (embeddedHost) embeddedHost.innerHTML = '';
  }

  function tryEmbeddedModule(req, modules, container, content, token, callback) {
    if (token !== loadToken) return;
    if (!modules.length) {
      if (callback) callback(false, 'player embutido indisponível');
      return;
    }
    var head = modules[0];
    var tail = modules.slice(1);
    req([head], function (Mod) {
      if (token !== loadToken) return;
      if (!Mod) {
        tryEmbeddedModule(req, tail, container, content, token, callback);
        return;
      }
      var item = content.data.items[0];
      try {
        if (Mod.createPlayer && container) {
          destroyEmbeddedPlayer();
          embeddedHost = container;
          embeddedPlayer = Mod.createPlayer({
            element: container,
            physicalId: item.objectId,
            objectId: item.objectId,
            objectType: item.objectType,
            envId: item.envId
          });
          if (callback) callback(true, 'embedded:' + head);
          return;
        }
        if (Mod.init && container) {
          destroyEmbeddedPlayer();
          embeddedHost = container;
          embeddedPlayer = Mod.init(container, {
            physicalId: item.objectId,
            objectType: item.objectType
          });
          if (callback) callback(true, 'embedded:' + head);
          return;
        }
      } catch (eInit) {
        /* try next */
      }
      tryEmbeddedModule(req, tail, container, content, token, callback);
    }, function () {
      tryEmbeddedModule(req, tail, container, content, token, callback);
    });
  }

  function loadEmbeddedPlayer(container, node, callback) {
    if (cfg().EMBED_PLAYER === false) {
      if (callback) callback(false, 'embed desligado');
      return;
    }
    var content = buildContent(node);
    if (!content) {
      if (callback) callback(false, 'ID inválido para 3D');
      return;
    }
    var req = (typeof PlatformBridge !== 'undefined' && PlatformBridge.safeGetRequire)
      ? PlatformBridge.safeGetRequire()
      : (typeof require !== 'undefined' ? require : null);
    if (!req || !container) {
      if (callback) callback(false, 'require/container indisponível');
      return;
    }
    var token = ++loadToken;
    container.innerHTML = '<p class="bom-3dplay-loading">A carregar 3DPlay…</p>';
    var modules = cfg().REQUIRE_MODULES || [
      'DS/Visualization/WebVizPlayer/WebVizPlayer',
      'DS/Visualization/VisuOnlinePlayer/VisuOnlinePlayer',
      'DS/ENO6WWebViz/ENO6WWebViz'
    ];
    tryEmbeddedModule(req, modules, container, content, token, callback);
  }

  /**
   * Envia peça selecionada para 3DPlay (widget + tentativa embed).
   * @param {object} node linha E-BOM
   * @param {object} opts { container?: HTMLElement, skipEmbed?: boolean }
   * @param {function} done callback(status)
   */
  function showPart(node, opts, done) {
    if (typeof opts === 'function') {
      done = opts;
      opts = {};
    }
    opts = opts || {};
    var content = buildContent(node);
    var physicalId = content ? content.data.items[0].objectId : resolvePhysicalId(node);

    if (!content) {
      setStatus('invalid', false, 'Sem physicalId válido para 3DPlay.', physicalId);
      if (done) done(lastStatus);
      return lastStatus;
    }

    setStatus('loading', false, 'A carregar visualização 3D…', physicalId);

    var allowExternal = cfg().ALLOW_EXTERNAL_WIDGET_FALLBACK === true;
    if (allowExternal) {
      pushViaPostMessage(content);
    }

    var finished = false;
    function finish(mode, ok, message) {
      if (finished) return;
      finished = true;
      setStatus(mode, ok, message, physicalId);
      if (done) done(lastStatus);
    }

    function finishPanelFallback() {
      finish('panel', false,
        '3D no painel indisponível neste build — use miniatura 2D ou estrutura com prd- (API/Explorer).');
    }

    if (allowExternal) {
      pushViaInterCom(content, function (okIc, msgIc) {
        if (okIc) finish('intercom', true, msgIc);
      });
      pushViaPlatformApi(content, function (okPa, msgPa) {
        if (okPa) finish('platform', true, msgPa);
      });
    }

    if (!opts.skipEmbed && opts.container) {
      loadEmbeddedPlayer(opts.container, node, function (okEmb, msgEmb) {
        if (okEmb) {
          finish('embedded', true, cfg().WIDGET_HINT || 'Modelo 3D no painel');
          return;
        }
        if (!finished) finishPanelFallback();
      });
      window.setTimeout(function () {
        if (!finished) finishPanelFallback();
      }, cfg().PUSH_TIMEOUT_MS || 2200);
    } else {
      window.setTimeout(function () {
        if (!finished) finishPanelFallback();
      }, cfg().PUSH_TIMEOUT_MS || 1200);
    }

    return lastStatus;
  }

  function clear() {
    loadToken++;
    destroyEmbeddedPlayer();
    setStatus('idle', false, '', '');
  }

  return {
    buildContent: buildContent,
    resolvePhysicalId: resolvePhysicalId,
    isPlayableId: isPlayableId,
    showPart: showPart,
    clear: clear,
    getLastStatus: getLastStatus,
    pushViaPostMessage: pushViaPostMessage
  };
})();
