/*
 * Auto-context orchestrator for widget-v3.
 * Boots detection on widget startup, updates the UI state, fills manual inputs,
 * and optionally triggers the existing controller load flow with resolved data.
 */
(function (global) {
  'use strict';

  var state = {
    booted: false,
    running: false,
    controllerVersion: '',
    status: 'idle',
    lastAttemptAt: 0,
    autoTriggered: false,
    autoContextProbeResults: [],
    detectedObject: null,
    resolverStrategy: '',
    expectedChildCount: 0,
    estimatedDepth: 0,
    autoContextTimings: {},
    resolvedRoot: null,
    lastError: '',
    lastSelectionKey: ''
  };

  function text(value) {
    return value == null ? '' : String(value).trim();
  }

  function byId(id) {
    var root = global.__3DX_UI_ROOT__ || global.document;
    return root && root.querySelector ? root.querySelector('#' + id) : null;
  }

  function safeLog(label, detail) {
    if (!global.console || !console.info) return;
    console.info('[Auto-Context]', label, detail || '');
  }

  function statusBar(message, tone, controller) {
    if (controller && typeof controller.setStatusMessage === 'function') {
      controller.setStatusMessage(message, tone);
      return;
    }
    var bar = byId('statusBar');
    if (!bar) return;
    bar.textContent = text(message);
    bar.className = 'bom-st' + (tone ? ' bom-st-' + tone : '');
  }

  function badge(status, label) {
    var badgeNode = byId('autoContextBadge');
    var labelNode = byId('autoContextLabel');
    if (badgeNode) {
      badgeNode.textContent = status === 'detected' ? 'Auto-contexto detectado' : 'Aguardando contexto';
      badgeNode.className = 'bom-build-pill bom-auto-context-badge ' +
        (status === 'detected' ? 'bom-auto-context-detected' : 'bom-auto-context-waiting');
    }
    if (labelNode) {
      labelNode.textContent = text(label) || 'Aguardando seleção no Explorer';
    }
    var banner = byId('syncBanner');
    if (banner) {
      banner.classList.remove('bom-hidden');
      banner.textContent = status === 'detected'
        ? 'Auto-contexto detectado: ' + (text(label) || 'estrutura ativa') + '.'
        : (text(label) || 'Aguardando seleção no Explorer. Você pode informar o ID manualmente ou tentar detectar novamente.');
    }
  }

  function enableManualFallback(message, controller) {
    state.status = 'waiting-manual';
    state.lastError = text(message);
    badge('waiting', message || 'Aguardando seleção no Explorer');
    statusBar(message || 'Aguardando seleção no Explorer.', 'info', controller);
    safeLog('manual-fallback', { message: message });
  }

  function autoFillResolved(resolvedRoot) {
    var idInput = byId('explorerObjectId');
    var depthInput = byId('skaDepthInput');
    var nameInput = byId('explorerObjectName');
    if (idInput) idInput.value = text(resolvedRoot && resolvedRoot.rootEngItemId);
    if (depthInput) depthInput.value = String(resolvedRoot && resolvedRoot.detectedDepth ? resolvedRoot.detectedDepth : 1);
    if (nameInput) nameInput.value = text(resolvedRoot && resolvedRoot.title);
  }

  function bindRetry(controller) {
    var button = byId('btnRetryAutoContext');
    if (!button || button.__bomRetryBound) return;
    button.__bomRetryBound = true;
    button.addEventListener('click', function (event) {
      event.preventDefault();
      run(controller, { reason: 'retry-button', force: true }).catch(function () {});
    });
  }

  function selectionKey(detectedObject) {
    detectedObject = detectedObject || {};
    return [text(detectedObject.id), text(detectedObject.name), text(detectedObject.title), text(detectedObject.source)].join('|');
  }

  function run(controller, options) {
    options = options || {};
    if (state.running) return Promise.resolve(state);
    if (!global.BomAutoContextDetector || !global.BomExpandableObjectResolver) {
      enableManualFallback('Auto-contexto indisponível; use o campo manual.', controller);
      return Promise.resolve(state);
    }
    state.running = true;
    state.lastAttemptAt = Date.now();
    state.status = 'detecting';
    state.autoTriggered = false;
    state.lastError = '';
    statusBar('Detectando contexto do Product Explorer...', 'info', controller);
    badge('waiting', 'Detectando contexto do Product Explorer…');
    safeLog('detection-start', { reason: options.reason || 'boot' });

    return global.BomAutoContextDetector.detect()
      .then(function (detection) {
        state.autoContextProbeResults = detection.autoContextProbeResults || [];
        state.autoContextTimings = detection.autoContextTimings || {};
        state.detectedObject = detection.detectedObject || null;
        if (!detection.ok || !state.detectedObject) {
          enableManualFallback('Aguardando seleção no Explorer para detectar automaticamente.', controller);
          return state;
        }
        var key = selectionKey(state.detectedObject);
        if (!options.force && state.lastSelectionKey && state.lastSelectionKey === key && state.resolvedRoot) {
          badge('detected', state.detectedObject.title || state.detectedObject.name || state.detectedObject.id);
          return state;
        }
        state.lastSelectionKey = key;
        return global.BomExpandableObjectResolver.resolve(state.detectedObject).then(function (resolved) {
          state.resolverStrategy = text(resolved && resolved.resolverStrategy);
          state.resolvedRoot = resolved && resolved.ok ? resolved : null;
          state.expectedChildCount = resolved && resolved.ok ? (resolved.expectedChildCount || 0) : 0;
          state.estimatedDepth = resolved && resolved.ok ? (resolved.detectedDepth || 1) : 0;
          if (!resolved || !resolved.ok) {
            enableManualFallback(text(resolved && resolved.reason) || 'Não foi possível resolver a seleção atual.', controller);
            return state;
          }
          state.status = 'detected';
          autoFillResolved(resolved);
          badge('detected', resolved.title || state.detectedObject.title || state.detectedObject.name || state.detectedObject.id);
          statusBar('Auto-contexto detectado. Preparando carregamento automático...', 'success', controller);
          safeLog('resolved-root', resolved);
          if (resolved.detectedDepth > 0 && controller && typeof controller.loadManualInput === 'function') {
            state.autoTriggered = true;
            return controller.loadManualInput().then(function () {
              statusBar('Auto-contexto detectado e E-BOM carregada.', 'success', controller);
              return state;
            }).catch(function (error) {
              state.lastError = text(error && error.message);
              enableManualFallback('Auto-contexto detectado, mas o carregamento falhou: ' + state.lastError, controller);
              return state;
            });
          }
          return state;
        });
      })
      .finally(function () {
        state.running = false;
      });
  }

  function boot(controller) {
    controller = controller || global.__bomWafSessionController;
    bindRetry(controller);
    if (state.booted) return Promise.resolve(state);
    state.booted = true;
    state.controllerVersion = text(controller && controller.getState && controller.getState().controller);
    return run(controller, { reason: 'boot' });
  }

  function getDiagnostics() {
    return {
      status: state.status,
      autoTriggered: state.autoTriggered,
      autoContextProbeResults: state.autoContextProbeResults.slice(),
      detectedObject: state.detectedObject,
      resolverStrategy: state.resolverStrategy,
      expectedChildCount: state.expectedChildCount,
      estimatedDepth: state.estimatedDepth,
      autoContextTimings: state.autoContextTimings,
      resolvedRoot: state.resolvedRoot,
      lastError: state.lastError,
      lastSelectionKey: state.lastSelectionKey
    };
  }

  global.__bomAutoExpandOrchestrator = {
    boot: boot,
    retry: function () { return run(global.__bomWafSessionController, { reason: 'retry-api', force: true }); },
    getDiagnostics: getDiagnostics
  };
})(window);
