/**
 * @file services/bom-orchestrator.js
 * Sprint 2.5 — item 2: fluxo único Atualizar estrutura (contexto → loader → snapshot).
 */
var BomOrchestrator = (function () {
  'use strict';

  var root = typeof window !== 'undefined' ? window : global;

  function getContext(refresh) {
    if (typeof ExplorerContext === 'undefined' || !ExplorerContext.refresh) {
      return null;
    }
    return ExplorerContext.refresh(refresh !== false);
  }

  function selectionFromContext(ctx) {
    if (!ctx || !ctx.hasValidPhysicalId) return null;
    return {
      physicalid: ctx.physicalId,
      name: ctx.productName || ctx.rootName || ctx.physicalId,
      displayName: ctx.displayName || ctx.productName || ctx.physicalId,
      type: 'VPMReference',
      source: ctx.source || 'explorer-context'
    };
  }

  function pickLoaderMode(ctx, options) {
    options = options || {};
    if (options.forceLoader) return options.forceLoader;
    var maxTsv = (APP_CONFIG && APP_CONFIG.FAST_TSV_MAX) || 500;
    var expected = ctx.expectedCount || 0;
    var primary = (APP_CONFIG && APP_CONFIG.PRIMARY_LOADER) || 'auto';

    if (options.source === 'manual' && expected <= maxTsv && options.preferApi === false) {
      return 'tsv';
    }
    if (options.source === 'manual' && expected > maxTsv && options.preferApi === false) {
      return 'paste';
    }

    if (ctx.canUseApi) {
      if (options.preferApi === true && (options.source === 'manual' || primary === 'api')) {
        return 'api';
      }
      if (primary === 'api' && options.preferApi !== false) return 'api';
      if (typeof ExplorerContext !== 'undefined' && ExplorerContext.suggestLoaderMode) {
        var suggested = ExplorerContext.suggestLoaderMode();
        if (suggested === 'api' && options.preferApi !== false) return 'api';
      }
    }

    if (options.source === 'manual' && expected <= maxTsv) {
      return 'tsv';
    }
    if (options.preferApi && ctx.canUseApi) return 'api';
    if (typeof ExplorerContext !== 'undefined' && ExplorerContext.suggestLoaderMode) {
      return ExplorerContext.suggestLoaderMode();
    }
    if (expected > maxTsv) return 'paste';
    return 'tsv';
  }

  /** SKA 79+: quando expectedCount > maxTsv o suggestLoaderMode escolhe paste/API lazy. */

  function withTimeout(promise, ms) {
    ms = ms || (APP_CONFIG && APP_CONFIG.SCAN_TIMEOUT_MS) || 90000;
    return Promise.race([
      promise,
      new Promise(function (_, reject) {
        window.setTimeout(function () {
          reject(new Error('Atualização demorou mais de ' + Math.round(ms / 1000) + 's.'));
        }, ms);
      })
    ]);
  }

  function runApiLoader(ctx, options) {
    options = options || {};
    var sel = selectionFromContext(ctx);
    if (!sel && ctx && ctx.hasValidPhysicalId) {
      sel = {
        physicalid: ctx.physicalId,
        name: ctx.rootName || ctx.productName,
        displayName: ctx.displayName || ctx.productName
      };
    }
    if (typeof ApiBomLoader !== 'undefined' && ApiBomLoader.load) {
      return ApiBomLoader.load(ctx, sel, {
        expectedCount: ctx.expectedCount,
        onProgress: options.onProgress
      });
    }
    if (typeof ExplorerScanner === 'undefined') {
      return Promise.reject(new Error('Scanner indisponível.'));
    }
    if (sel && ExplorerScanner.scanViaApi) {
      return ExplorerScanner.scanViaApi(sel);
    }
    if (ExplorerScanner.scanViaApiOrSelection) {
      return ExplorerScanner.scanViaApiOrSelection();
    }
    return Promise.reject(new Error('API ENOVIA indisponível neste widget.'));
  }

  function runTsvLoader(ctx, options) {
    options = options || {};
    if (typeof TsvBomLoader !== 'undefined' && TsvBomLoader.load) {
      var allowAutoCopy =
        options.allowAutoCopy === true ||
        (options.source === 'manual' && options.allowAutoCopy !== false);
      return TsvBomLoader.load(ctx, {
        allowAutoCopy: allowAutoCopy,
        expectedCount: ctx.expectedCount
      });
    }
    if (typeof ExplorerScanner === 'undefined' || !ExplorerScanner.scanViaExplorerGrid) {
      return Promise.reject(new Error('Leitura da grade Explorer indisponível.'));
    }
    return ExplorerScanner.scanViaExplorerGrid({ allowAutoCopy: options.allowAutoCopy === true });
  }

  function runPasteLoader(ctx, options) {
    if (typeof PasteBomLoader !== 'undefined' && PasteBomLoader.load) {
      return PasteBomLoader.load(ctx, options);
    }
    if (typeof ExplorerScanner === 'undefined') {
      return Promise.reject(new Error('Importação indisponível.'));
    }
    if (ExplorerScanner.scanViaImportBestEffort) {
      return ExplorerScanner.scanViaImportBestEffort();
    }
    if (ExplorerScanner.scanViaClipboardOrPaste) {
      return ExplorerScanner.scanViaClipboardOrPaste();
    }
    return Promise.reject(new Error('Nenhuma fonte de cola disponível.'));
  }

  function runDomFallbackLoader(ctx) {
    if (typeof ExplorerScanner === 'undefined' || !ExplorerScanner.scanViaDomMirrorFallback) {
      return Promise.reject(new Error('Espelho DOM indisponível.'));
    }
    return ExplorerScanner.scanViaDomMirrorFallback(ctx.rootName, ctx.expectedCount);
  }

  function runLoaderMode(mode, ctx, options) {
    if (mode === 'api') return runApiLoader(ctx, options);
    if (mode === 'paste') return runPasteLoader(ctx, options);
    if (mode === 'dom-fallback') return runDomFallbackLoader(ctx);
    return runTsvLoader(ctx, options);
  }

  function runManualFallbackChain(ctx, options, failedMode, firstErr) {
    var maxTsv = (APP_CONFIG && APP_CONFIG.FAST_TSV_MAX) || 500;
    var order = [];
    if (failedMode !== 'paste') order.push('paste');
    if (failedMode !== 'tsv' && ctx.expectedCount <= maxTsv) order.push('tsv');
    var domMax = (APP_CONFIG && APP_CONFIG.DOM_MIRROR_MANUAL_MAX_EXPECTED) || 25;
    if (
      APP_CONFIG.DOM_MIRROR_FALLBACK !== false &&
      failedMode !== 'dom-fallback' &&
      (ctx.expectedCount || 0) <= domMax
    ) {
      order.push('dom-fallback');
    }
    if (ctx.canUseApi && failedMode !== 'api' && options.preferApi === true) order.push('api');

    function attempt(i, lastErr) {
      if (i >= order.length) {
        return Promise.reject(lastErr || firstErr || new Error('Nenhuma fonte obteve a E-BOM completa.'));
      }
      var mode = order[i];
      var runOpts = options;
      if (mode === 'tsv') {
        runOpts = {
          source: 'manual',
          allowAutoCopy: options.allowAutoCopy !== false,
          onProgress: options.onProgress
        };
      }
      var run = runLoaderMode(mode, ctx, runOpts);
      if (mode === 'api') {
        root.__3DX_ALLOW_API__ = true;
        run = run.finally(function () {
          root.__3DX_ALLOW_API__ = false;
        });
      }
      return run.catch(function (err) {
        return attempt(i + 1, err);
      });
    }

    return attempt(0, firstErr);
  }

  function enrichResult(res, ctx, loaderMode) {
    if (!res) return res;
    if (!res.loaderMode) res.loaderMode = loaderMode;
    res.context = {
      physicalId: ctx.physicalId,
      productName: ctx.productName,
      expectedCount: ctx.expectedCount,
      selectionCount: ctx.selectionCount,
      syncKey: ctx.syncKey
    };
    return res;
  }

  function updateSelectionLabel(ctx) {
    if (!ctx || !ctx.rootName) return;
    var label = document.getElementById('selectionLabel');
    if (label) {
      label.textContent = ctx.rootName;
      label.setAttribute('title', ctx.rootName);
    }
  }

  function formatFailureMessage(err, ctx) {
    var msg = (err && err.message) ? err.message : String(err || 'Falha na importação.');
    if (/Ctrl\+A|Ctrl\+C|Atualizar estrutura/i.test(msg)) return msg;
    if (/406|API parcial|TSV parcial|DOM espelho incompleto|incompleto|parcial/i.test(msg)) {
      return (
        msg +
        ' — No Explorer: expanda todos os níveis → Ctrl+A → Ctrl+C → Atualizar estrutura.'
      );
    }
    if (ctx && ctx.expectedCount > 20) {
      return msg + ' — Alternativa: Ctrl+A → Ctrl+C na grade → Atualizar estrutura.';
    }
    return msg;
  }

  /**
   * @param {object} [options]
   * @param {'manual'|'auto'} [options.source]
   * @param {boolean} [options.allowAutoCopy]
   * @param {boolean} [options.preferApi]
   * @param {string} [options.forceLoader] api|tsv|paste
   */
  function refreshStructure(options) {
    options = options || {};
    var ctx = getContext(true);
    if (!ctx || (!ctx.rootName && !ctx.expectedCount && !ctx.hasValidPhysicalId)) {
      return Promise.reject(
        new Error('Abra uma estrutura no Product Structure Explorer ao lado do widget.')
      );
    }
    updateSelectionLabel(ctx);

    var dashCount =
      typeof BomService !== 'undefined' && BomService.getNodeCount ? BomService.getNodeCount() : 0;
    var contextMismatch =
      ctx.expectedCount > 0 &&
      dashCount > 0 &&
      Math.abs(dashCount - ctx.expectedCount) > 1;
    var priorIndex = null;
    if (
      !contextMismatch &&
      typeof BomService !== 'undefined' &&
      BomService.createSnapshot
    ) {
      priorIndex = BomService.createSnapshot();
    }

    var mode = pickLoaderMode(ctx, options);
    var chain;
    var apiFlag = mode === 'api';

    if (apiFlag) root.__3DX_ALLOW_API__ = true;
    chain = runLoaderMode(mode, ctx, options);

    if (options.source === 'manual') {
      chain = chain.catch(function (firstErr) {
        if (apiFlag) {
          apiFlag = false;
          root.__3DX_ALLOW_API__ = false;
        }
        return runManualFallbackChain(ctx, options, mode, firstErr);
      });
    }

    var timeoutMs = options.timeoutMs;
    if (!timeoutMs && options.source === 'manual') {
      var smallMax = (APP_CONFIG && APP_CONFIG.FAST_STRUCTURE_MAX) || 12;
      if (ctx.expectedCount > 0 && ctx.expectedCount <= smallMax) {
        timeoutMs = (APP_CONFIG && APP_CONFIG.MANUAL_REFRESH_TIMEOUT_SMALL_MS) || 12000;
      } else {
        timeoutMs = (APP_CONFIG && APP_CONFIG.MANUAL_REFRESH_TIMEOUT_MS) || 28000;
      }
    }
    return withTimeout(chain, timeoutMs)
      .then(function (res) {
        var usedMode = (res && res.loaderMode) || mode;
        return enrichResult(res, ctx, usedMode);
      })
      .catch(function (err) {
        if (
          priorIndex &&
          priorIndex.nodeCount > 0 &&
          typeof BomService !== 'undefined' &&
          BomService.restoreSnapshot
        ) {
          BomService.restoreSnapshot(priorIndex);
        }
        return Promise.reject(new Error(formatFailureMessage(err, ctx)));
      })
      .finally(function () {
        if (apiFlag) root.__3DX_ALLOW_API__ = false;
      });
  }

  return {
    refreshStructure: refreshStructure,
    pickLoaderMode: pickLoaderMode,
    getContext: function () {
      return getContext(true);
    }
  };
})();
