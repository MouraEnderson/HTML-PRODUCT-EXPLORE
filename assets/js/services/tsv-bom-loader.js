/**
 * @file services/tsv-bom-loader.js
 * Sprint 2.5 — item 4: fast-path TSV (auto-copy Explorer) até FAST_TSV_MAX.
 */
var TsvBomLoader = (function () {
  'use strict';

  var SESSION_ROOT_NAME = 'bom_last_root_name';

  function saveRootName(name) {
    try {
      if (name) sessionStorage.setItem(SESSION_ROOT_NAME, name);
    } catch (e) { /* */ }
  }

  function rootTerm(ctx) {
    if (ctx && ctx.rootName) return ctx.rootName;
    if (typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.getStructureNameHint) {
      return ProductExplorerBridge.getStructureNameHint() || '';
    }
    return '';
  }

  function resolveExpected(ctx) {
    if (ctx && ctx.expectedCount > 0) return ctx.expectedCount;
    if (typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.getExplorerObjectCount) {
      return ProductExplorerBridge.getExplorerObjectCount() || 0;
    }
    return 0;
  }

  function pollExplorer() {
    if (typeof ProductExplorerBridge === 'undefined') return false;
    if (ProductExplorerBridge.pollDashboardExplorerChrome) {
      ProductExplorerBridge.pollDashboardExplorerChrome();
    }
    if (ProductExplorerBridge.pollStructureHint) ProductExplorerBridge.pollStructureHint();
    return true;
  }

  function canUse(ctx) {
    var maxTsv = (APP_CONFIG && APP_CONFIG.FAST_TSV_MAX) || 500;
    var expected = resolveExpected(ctx);
    if (expected > maxTsv) return false;
    return typeof ProductExplorerBridge !== 'undefined';
  }

  function needsMore(pl, expected) {
    if (!pl || !pl.items || pl.items.length < 1) return true;
    if (expected > 0 && pl.items.length < expected - 1) return true;
    return false;
  }

  function formatMessage(meta, count, expected, term) {
    var msg = 'TSV ' + count;
    if (expected > 0) msg += '/' + expected;
    msg += ' — ' + (meta.productName || term || 'E-BOM');
    return msg;
  }

  function setStatus(msg) {
    if (typeof App !== 'undefined' && App.setStatus) {
      App.setStatus(msg, 'info');
      return;
    }
    var el = document.getElementById('statusBar');
    if (el) {
      el.textContent = msg;
      el.className = 'status-bar status-info';
    }
  }

  function applyPayload(pl, term, expected) {
    if (typeof BomSnapshot === 'undefined' || !BomSnapshot.applyPayload) {
      return Promise.reject(new Error('Módulo snapshot indisponível.'));
    }
    APP_CONFIG.IMPORT_MODE = true;
    APP_CONFIG.DEMO_MODE = false;
    return BomSnapshot.applyPayload(pl).then(function (meta) {
      var count = BomService.getNodeCount();
      if (count < 1) count = meta.itemCount || (pl.items && pl.items.length) || 0;
      if (expected > 0 && count < expected - 1) {
        return Promise.reject(
          new Error(
            'TSV parcial ' + count + '/' + expected +
            ' — expanda todos os níveis no Explorer, Ctrl+A+Ctrl+C, ou aguarde API lazy.'
          )
        );
      }
      saveRootName(meta.productName || term);
      return {
        ok: true,
        mode: 'tsv',
        loaderMode: 'tsv',
        meta: meta,
        partial: expected > 0 && count < expected - 1,
        message: formatMessage(meta, count, expected, term)
      };
    });
  }

  function buildPayloadFromItems(items, term) {
    if (!items || !items.length || typeof BomSnapshot === 'undefined') return null;
    var name = items[0].title || items[0].name || term || 'E-BOM';
    items.forEach(function (it) {
      if (it.level === 0) name = it.title || it.name || name;
    });
    var payload = BomSnapshot.buildFromImported(items, name);
    if (payload) payload.scrapeSource = 'tsv-clipboard';
    return payload;
  }

  function tryAutoCopy(term, allowAutoCopy) {
    if (!allowAutoCopy) return Promise.resolve(null);
    if (typeof ProductExplorerBridge === 'undefined' || !ProductExplorerBridge.tryExplorerAutoCopyParse) {
      return Promise.resolve(null);
    }
    setStatus('Lendo TSV do Explorer (Ctrl+A+copy)…');
    return ProductExplorerBridge.tryExplorerAutoCopyParse(term);
  }

  function readPasteText() {
    if (typeof ExplorerScanner !== 'undefined' && ExplorerScanner.getPasteBuffer) {
      var buf = ExplorerScanner.getPasteBuffer();
      if (buf) return Promise.resolve(buf);
    }
    var area = document.getElementById('pasteArea');
    if (area && area.value && String(area.value).trim()) {
      return Promise.resolve(String(area.value).trim());
    }
    if (!navigator.clipboard || !navigator.clipboard.readText) {
      return Promise.resolve('');
    }
    return navigator.clipboard.readText().catch(function () {
      return '';
    });
  }

  function tryClipboardTsv(term) {
    setStatus('Lendo TSV da área de transferência…');
    return readPasteText().then(function (text) {
      text = String(text || '').trim();
      if (!text || text.indexOf('\t') < 0) return null;
      if (typeof FileImportService === 'undefined' || !FileImportService.parseTextAsync) {
        return null;
      }
      return FileImportService.parseTextAsync(text).then(function (items) {
        if (!items || items.length < 1) return null;
        return buildPayloadFromItems(items, term);
      });
    });
  }

  /**
   * @param {object} [ctx] ExplorerContext snapshot
   * @param {{ allowAutoCopy?: boolean, expectedCount?: number }} [options]
   */
  function load(ctx, options) {
    options = options || {};
    ctx = ctx || null;

    if (!pollExplorer()) {
      return Promise.reject(
        new Error('Iframe do Explorer inacessível — abra a árvore ao lado do widget.')
      );
    }

    var maxTsv = (APP_CONFIG && APP_CONFIG.FAST_TSV_MAX) || 500;
    var expected = options.expectedCount || resolveExpected(ctx);
    if (expected > maxTsv) {
      return Promise.reject(
        new Error('Estrutura com ' + expected + ' peças — use API lazy (limite TSV ' + maxTsv + ').')
      );
    }

    var term = rootTerm(ctx);
    var allowAutoCopy = options.allowAutoCopy === true;

    return tryAutoCopy(term, allowAutoCopy)
      .then(function (autoPayload) {
        if (autoPayload && !needsMore(autoPayload, expected)) {
          return autoPayload;
        }
        return tryClipboardTsv(term).then(function (clipPayload) {
          if (clipPayload && !needsMore(clipPayload, expected)) return clipPayload;
          if (clipPayload && autoPayload) {
            return clipPayload.items.length >= autoPayload.items.length ? clipPayload : autoPayload;
          }
          return clipPayload || autoPayload;
        });
      })
      .then(function (payload) {
        if (!payload || !payload.items || payload.items.length < 1) {
          return Promise.reject(
            new Error(
              'TSV indisponível. No Explorer: expanda a estrutura → Ctrl+A na grade → Ctrl+C → Atualizar estrutura.'
            )
          );
        }
        return applyPayload(payload, term, expected);
      });
  }

  return {
    load: load,
    canUse: canUse
  };
})();
