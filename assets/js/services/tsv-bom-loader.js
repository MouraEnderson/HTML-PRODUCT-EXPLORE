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

  function withinExpectedCount(n, expected) {
    if (expected < 1) return true;
    return n >= expected - 1 && n <= expected + 1;
  }

  function normalizeStructureToken(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function payloadRootMatches(payload, term) {
    if (!payload || !payload.items || !payload.items.length) return false;
    if (!term) return true;
    var hint = normalizeStructureToken(term);
    if (hint.length < 4) return true;
    var root = payload.items[0];
    var rootText = normalizeStructureToken(
      root.title || root.name || payload.productName || ''
    );
    if (!rootText) return true;
    var parts = hint.split(/\s+/).filter(function (t) {
      return t.length >= 4;
    });
    for (var i = 0; i < parts.length; i++) {
      if (rootText.indexOf(parts[i]) >= 0) return true;
    }
    parts = rootText.split(/\s+/).filter(function (t) {
      return t.length >= 4;
    });
    for (var j = 0; j < parts.length; j++) {
      if (hint.indexOf(parts[j]) >= 0) return true;
    }
    return false;
  }

  function payloadInSync(payload, term, expected) {
    if (!payload || !payload.items || !payload.items.length) return false;
    if (!withinExpectedCount(payload.items.length, expected)) return false;
    return payloadRootMatches(payload, term);
  }

  function applyPayload(pl, term, expected) {
    if (typeof BomSnapshot === 'undefined' || !BomSnapshot.applyPayload) {
      return Promise.reject(new Error('Módulo snapshot indisponível.'));
    }
    var itemN = pl && pl.items ? pl.items.length : 0;
    if (expected > 0 && itemN < expected - 1) {
      return Promise.reject(
        new Error(
          'TSV parcial ' + itemN + '/' + expected +
          ' — expanda todos os níveis no Explorer, Ctrl+A+Ctrl+C, ou aguarde API lazy.'
        )
      );
    }
    if (expected > 0 && itemN > expected + 1) {
      return Promise.reject(
        new Error(
          'TSV de estrutura antiga ' + itemN + '/' + expected +
          ' — clique na raiz no Explorer e Atualizar estrutura (limpa clipboard SKA/Drone).'
        )
      );
    }
    if (!payloadRootMatches(pl, term)) {
      return Promise.reject(
        new Error(
          'TSV não corresponde à estrutura aberta no Explorer — Atualizar estrutura de novo.'
        )
      );
    }
    APP_CONFIG.IMPORT_MODE = true;
    APP_CONFIG.DEMO_MODE = false;
    return BomSnapshot.applyPayload(pl).then(function (meta) {
      var count = BomService.getNodeCount();
      if (count < 1) count = meta.itemCount || itemN || 0;
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

  function tryScrollHarvest(term, partialPayload, expected) {
    if (!needsMore(partialPayload, expected)) return Promise.resolve(partialPayload);
    if (
      typeof ProductExplorerBridge === 'undefined' ||
      !ProductExplorerBridge.tryExplorerScrollHarvestAsync
    ) {
      return Promise.resolve(partialPayload);
    }
    setStatus('Varrendo grade Explorer (scroll)…');
    return ProductExplorerBridge.tryExplorerScrollHarvestAsync(term)
      .then(function (scrollPl) {
        if (!scrollPl || !scrollPl.items || !scrollPl.items.length) return partialPayload;
        if (!partialPayload || !partialPayload.items || !partialPayload.items.length) return scrollPl;
        return scrollPl.items.length >= partialPayload.items.length ? scrollPl : partialPayload;
      })
      .catch(function () {
        return partialPayload;
      });
  }

  function pickBestPayload(a, b, expected, term) {
    function keep(p) {
      if (!p || !p.items) return null;
      if (!payloadInSync(p, term, expected)) return null;
      return p;
    }
    a = keep(a);
    b = keep(b);
    if (!a) return b;
    if (!b) return a;
    if (expected > 0) {
      var ad = Math.abs(a.items.length - expected);
      var bd = Math.abs(b.items.length - expected);
      if (bd < ad) return b;
      if (ad < bd) return a;
    }
    return b.items.length > a.items.length ? b : a;
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

    function finish(payload) {
      if (!payloadInSync(payload, term, expected)) {
        return Promise.reject(
          new Error(
            'TSV não bate com Explorer (' +
              (payload && payload.items ? payload.items.length : 0) +
              '/' +
              expected +
              '). Clique na raiz no Explorer → Atualizar estrutura.'
          )
        );
      }
      if (!payload || !payload.items || payload.items.length < 1) {
        return Promise.reject(
          new Error(
            'TSV indisponível. No Explorer: expanda a estrutura → Ctrl+A na grade → Ctrl+C → Atualizar estrutura.'
          )
        );
      }
      return applyPayload(payload, term, expected);
    }

    function tryMirrorFirst() {
      if (typeof ProductExplorerBridge === 'undefined' || !ProductExplorerBridge.scrapeExplorerMirror) {
        return Promise.resolve(null);
      }
      var mirror = ProductExplorerBridge.scrapeExplorerMirror(term);
      if (!mirror || !mirror.items || mirror.items.length < 1) return Promise.resolve(null);
      if (expected > 0 && mirror.items.length < expected - 1) return Promise.resolve(null);
      if (!payloadRootMatches(mirror, term)) return Promise.resolve(null);
      return Promise.resolve(mirror);
    }

    function tryCopyFirst() {
      if (!allowAutoCopy) return Promise.resolve(null);
      return tryAutoCopy(term, true);
    }

    return tryCopyFirst()
      .then(function (copyPayload) {
        if (copyPayload && copyPayload.items && payloadInSync(copyPayload, term, expected)) {
          return finish(copyPayload);
        }
        return tryMirrorFirst().then(function (mirrorPayload) {
          if (mirrorPayload) return finish(mirrorPayload);
          return copyPayload;
        });
      })
      .then(function (autoPayload) {
        if (autoPayload && autoPayload.ok) return autoPayload;
        return tryAutoCopy(term, true)
          .then(function (autoPayload2) {
            return tryScrollHarvest(term, autoPayload2 || autoPayload, expected).then(function (harvested) {
              if (payloadInSync(harvested, term, expected)) return harvested;
              return tryClipboardTsv(term).then(function (clipPayload) {
                var best = pickBestPayload(harvested, clipPayload, expected, term);
                if (best && payloadInSync(best, term, expected)) return best;
                return tryAutoCopy(term, true).then(function (retryCopy) {
                  best = pickBestPayload(best, retryCopy, expected, term);
                  if (payloadInSync(best, term, expected)) return best;
                  return pickBestPayload(harvested, clipPayload, expected, term);
                });
              });
            });
          });
      })
      .then(function (res) {
        if (res && res.ok) return res;
        return finish(res);
      });
  }

  return {
    load: load,
    canUse: canUse
  };
})();
