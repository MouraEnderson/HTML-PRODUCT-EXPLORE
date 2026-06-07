/**
 * @file services/bom-orchestrator.js
 * Sprint 2.5 — item 2: fluxo único Atualizar estrutura (contexto → loader → snapshot).
 */
var BomOrchestrator = (function () {
  'use strict';

  var root = typeof window !== 'undefined' ? window : global;

  function hasExplorerPasteBuffer() {
    var text = '';
    if (typeof ExplorerScanner !== 'undefined' && ExplorerScanner.getPasteBuffer) {
      text = ExplorerScanner.getPasteBuffer() || '';
    }
    if (!text) {
      var area = document.getElementById('pasteArea');
      if (area && area.value) text = String(area.value);
    }
    text = String(text || '').trim();
    return text.indexOf('\t') >= 0 && text.split(/\r?\n/).filter(function (l) {
      return l.trim();
    }).length >= 2;
  }

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

    if (options.source === 'auto') {
      if (ctx.canUseApi && options.preferApi !== false) return 'api';
      if (APP_CONFIG.ALLOW_PASTE_FALLBACK === true && hasExplorerPasteBuffer()) return 'paste';
      return 'tsv';
    }

    var preferApiManual =
      options.preferApi === true ||
      (options.preferApi !== false &&
        APP_CONFIG.PREFER_API_ON_MANUAL_REFRESH !== false &&
        options.source === 'manual' &&
        ctx.canUseApi);

    if (options.source === 'manual' && expected <= maxTsv && !preferApiManual && options.preferApi === false) {
      return 'tsv';
    }
    if (options.source === 'manual' && expected > maxTsv && !preferApiManual && options.preferApi === false) {
      return ctx.canUseApi ? 'api' : 'tsv';
    }

    if (ctx.canUseApi) {
      if (preferApiManual || (options.preferApi === true && (options.source === 'manual' || primary === 'api'))) {
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
    if (expected > maxTsv) return ctx.canUseApi ? 'api' : 'tsv';
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
        (options.source === 'manual' && options.allowAutoCopy !== false) ||
        (options.source === 'auto' &&
          APP_CONFIG.AUTO_SYNC_ALLOW_COPY !== false &&
          options.allowAutoCopy !== false);
      return TsvBomLoader.load(ctx, {
        allowAutoCopy: allowAutoCopy,
        expectedCount: ctx.expectedCount,
        allowPartial: options.allowPartial === true,
        source: options.source || 'manual',
        pasteFirst: options.pasteFirst === true
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
    return Promise.reject(new Error('Nenhuma fonte de contingencia disponivel.'));
  }

  function runDomFallbackLoader(ctx) {
    if (typeof ExplorerScanner === 'undefined' || !ExplorerScanner.scanViaDomMirrorFallback) {
      return Promise.reject(new Error('Espelho DOM indisponível.'));
    }
    return ExplorerScanner.scanViaDomMirrorFallback(ctx.rootName, ctx.expectedCount);
  }

  function runLoaderMode(mode, ctx, options) {
    if (mode === 'api') return runApiLoader(ctx, options);
    if (mode === 'paste' && APP_CONFIG.ALLOW_PASTE_FALLBACK === true) return runPasteLoader(ctx, options);
    if (mode === 'paste') return runTsvLoader(ctx, options);
    if (mode === 'dom-fallback') return runDomFallbackLoader(ctx);
    return runTsvLoader(ctx, options);
  }

  function runManualFallbackChain(ctx, options, failedMode, firstErr) {
    options = options || {};
    var apiFallbackAllowed =
      options.allowApiFallback !== false &&
      APP_CONFIG &&
      APP_CONFIG.MANUAL_API_FALLBACK !== false;
    if (
      failedMode !== 'api' &&
      ctx &&
      ctx.canUseApi &&
      (ctx.hasValidPhysicalId || ctx.rootName) &&
      (options.preferApi !== false || apiFallbackAllowed)
    ) {
      root.__3DX_ALLOW_API__ = true;
      return runApiLoader(ctx, options).then(function (res) {
        var count = resultCount(res);
        if (ctx.expectedCount > 0 && count < ctx.expectedCount - 1) {
          return Promise.reject(
            new Error(
              'API retornou parcial ' + count + '/' + ctx.expectedCount +
              '. A leitura do Explorer tambem falhou: ' +
              ((firstErr && firstErr.message) || firstErr || 'sem detalhes')
            )
          );
        }
        return res;
      }).finally(function () {
        root.__3DX_ALLOW_API__ = false;
      });
    }
    return Promise.reject(
      firstErr ||
        new Error(
          'Leitura automatica falhou. Expanda a estrutura no Explorer e clique Atualizar estrutura novamente.'
        )
    );
  }

  /** Auto-sync: fluxo legado mantido desligado no produto. */
  function runAutoFallbackChain(ctx, options, failedMode, firstErr) {
    var maxTsv = (APP_CONFIG && APP_CONFIG.FAST_TSV_MAX) || 500;
    var order = [];
    if (APP_CONFIG.ALLOW_PASTE_FALLBACK === true && failedMode !== 'paste') order.push('paste');
    if (failedMode !== 'tsv' && ctx.expectedCount <= maxTsv) order.push('tsv');
    var domMax = (APP_CONFIG && APP_CONFIG.DOM_MIRROR_MANUAL_MAX_EXPECTED) || 25;
    if (
      APP_CONFIG.DOM_MIRROR_FALLBACK !== false &&
      failedMode !== 'dom-fallback' &&
      (ctx.expectedCount || 0) <= domMax
    ) {
      order.push('dom-fallback');
    }

    function attempt(i, lastErr) {
      if (i >= order.length) {
        return Promise.reject(lastErr || firstErr || new Error('Sync automático incompleto.'));
      }
      var mode = order[i];
      var runOpts = {
        source: 'auto',
        allowAutoCopy: options.allowAutoCopy !== false,
        preferApi: false,
        pasteFirst: APP_CONFIG.AUTO_SYNC_PREFER_PASTE !== false,
        onProgress: options.onProgress
      };
      if (mode === 'tsv') {
        runOpts.allowAutoCopy = true;
      }
      return runLoaderMode(mode, ctx, runOpts).catch(function (err) {
        return attempt(i + 1, err);
      });
    }

    return attempt(0, firstErr);
  }

  function enrichResult(res, ctx, loaderMode) {
    if (!res) return res;
    if (!res.loaderMode) res.loaderMode = loaderMode;
    res.refreshSource = res.refreshSource || '';
    res.context = {
      physicalId: ctx.physicalId,
      productName: ctx.productName,
      expectedCount: ctx.expectedCount,
      selectionCount: ctx.selectionCount,
      syncKey: ctx.syncKey
    };
    return res;
  }

  function resultCount(res) {
    if (res && res.meta && res.meta.itemCount) return res.meta.itemCount;
    if (typeof BomService !== 'undefined' && BomService.getNodeCount) return BomService.getNodeCount();
    return 0;
  }

  function maybeImprovePartialApi(res, ctx, options, mode) {
    if (!res || !res.partial || ((res.loaderMode || mode) !== 'api')) return Promise.resolve(res);
    if (!ctx || ctx.expectedCount < 2) return Promise.resolve(res);
    var beforeCount = resultCount(res);
    var apiSnap =
      typeof BomService !== 'undefined' && BomService.createSnapshot
        ? BomService.createSnapshot()
        : null;
    return runManualFallbackChain(ctx, options || {}, 'api', new Error('API parcial'))
      .then(function (fallback) {
        var afterCount = resultCount(fallback);
        if (afterCount > beforeCount) {
          fallback.partial = ctx.expectedCount > 0 && afterCount < ctx.expectedCount - 1;
          return fallback;
        }
        if (apiSnap && typeof BomService !== 'undefined' && BomService.restoreSnapshot) {
          BomService.restoreSnapshot(apiSnap);
        }
        return res;
      })
      .catch(function () {
        if (apiSnap && typeof BomService !== 'undefined' && BomService.restoreSnapshot) {
          BomService.restoreSnapshot(apiSnap);
        }
        return res;
      });
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
    if (/406|API parcial|Explorer parcial|DOM espelho incompleto|incompleto|parcial/i.test(msg)) {
      return (
        msg +
        ' - expanda todos os niveis no Explorer e clique Atualizar estrutura novamente.'
      );
    }
    if (ctx && ctx.expectedCount > 20) {
      return msg + ' - estrutura grande exige Explorer expandido ou contrato API completo.';
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
    if (options.source === 'manual' && typeof BomService !== 'undefined' && BomService.reset) {
      BomService.reset();
    }

    var dashCount =
      typeof BomService !== 'undefined' && BomService.getNodeCount ? BomService.getNodeCount() : 0;
    var contextMismatch =
      ctx.expectedCount > 0 &&
      dashCount > 0 &&
      Math.abs(dashCount - ctx.expectedCount) > 1;
    var priorIndex = null;
    if (
      dashCount > 0 &&
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

    if (options.source === 'manual' && options.allowFallback === true) {
      chain = chain.catch(function (firstErr) {
        if (apiFlag) {
          apiFlag = false;
          root.__3DX_ALLOW_API__ = false;
        }
        return runManualFallbackChain(ctx, options, mode, firstErr);
      });
    } else if (options.source === 'auto') {
      chain = chain.catch(function (firstErr) {
        return runAutoFallbackChain(ctx, options, mode, firstErr);
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
    if (!timeoutMs && options.source === 'auto') {
      timeoutMs = (APP_CONFIG && APP_CONFIG.AUTO_SYNC_TIMEOUT_MS) || 24000;
    }
    return withTimeout(chain, timeoutMs)
      .then(function (res) {
        var usedMode = (res && res.loaderMode) || mode;
        if (res) res.refreshSource = options.source || 'manual';
        return maybeImprovePartialApi(res, ctx, options, usedMode).then(function (best) {
          var bestMode = (best && best.loaderMode) || usedMode;
          if (best) best.refreshSource = options.source || 'manual';
          return enrichResult(best, ctx, bestMode);
        });
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
