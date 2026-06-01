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
    if (options.preferApi && ctx.canUseApi && ctx.hasValidPhysicalId) return 'api';
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
    if (typeof ApiBomLoader !== 'undefined' && ApiBomLoader.load) {
      return ApiBomLoader.load(ctx, selectionFromContext(ctx), {
        expectedCount: ctx.expectedCount,
        onProgress: options.onProgress
      });
    }
    if (typeof ExplorerScanner === 'undefined') {
      return Promise.reject(new Error('Scanner indisponível.'));
    }
    var sel = selectionFromContext(ctx);
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

    var mode = pickLoaderMode(ctx, options);
    var chain;
    var apiFlag = mode === 'api';

    if (apiFlag) root.__3DX_ALLOW_API__ = true;

    if (mode === 'api') {
      chain = runApiLoader(ctx, options);
    } else if (mode === 'paste') {
      chain = runPasteLoader(ctx, options);
    } else {
      chain = runTsvLoader(ctx, options);
    }

    if (options.source === 'manual') {
      chain = chain.catch(function (firstErr) {
        if (apiFlag) {
          apiFlag = false;
          root.__3DX_ALLOW_API__ = false;
        }
        if (mode === 'api') {
          return runTsvLoader(ctx, { source: 'manual', allowAutoCopy: true })
            .catch(function () {
              return runPasteLoader(ctx, options).catch(function () {
                return runDomFallbackLoader(ctx);
              });
            });
        }
        if (mode === 'tsv') {
          return runPasteLoader(ctx, options).catch(function () {
            return runDomFallbackLoader(ctx);
          });
        }
        if (mode === 'paste') {
          return runDomFallbackLoader(ctx);
        }
        throw firstErr;
      });
    }

    return withTimeout(chain, options.timeoutMs)
      .then(function (res) {
        return enrichResult(res, ctx, mode);
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
