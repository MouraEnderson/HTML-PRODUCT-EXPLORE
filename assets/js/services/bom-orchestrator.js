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
    if (options.preferApi && ctx.canUseApi) return 'api';
    if (typeof ExplorerContext !== 'undefined' && ExplorerContext.suggestLoaderMode) {
      return ExplorerContext.suggestLoaderMode();
    }
    var maxTsv = (APP_CONFIG && APP_CONFIG.FAST_TSV_MAX) || 500;
    if (ctx.expectedCount > maxTsv) return 'paste';
    return 'tsv';
  }

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
    if (ctx.canUseApi && failedMode !== 'api') order.push('api');
    if (failedMode !== 'tsv' && ctx.expectedCount <= maxTsv) order.push('tsv');
    if (failedMode !== 'paste') order.push('paste');
    if (APP_CONFIG.DOM_MIRROR_FALLBACK !== false && failedMode !== 'dom-fallback') {
      order.push('dom-fallback');
    }

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

    var priorIndex =
      typeof BomService !== 'undefined' && BomService.createSnapshot
        ? BomService.createSnapshot()
        : null;

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

    return withTimeout(chain, options.timeoutMs)
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
