/**
 * @file services/paste-bom-loader.js
 * Fonte unica para o botao Atualizar estrutura: TSV vindo de Ctrl+C/Ctrl+V.
 */
var PasteBomLoader = (function () {
  'use strict';

  function readPasteText() {
    var text = '';
    if (typeof ExplorerScanner !== 'undefined' && ExplorerScanner.getPasteBuffer) {
      text = ExplorerScanner.getPasteBuffer() || '';
    }
    if (!text) {
      var area = document.getElementById('pasteArea');
      if (area && area.value) text = String(area.value);
    }
    text = String(text || '').trim();
    if (text) return Promise.resolve(text);
    if (APP_CONFIG && APP_CONFIG.SKIP_CLIPBOARD_READ) return Promise.resolve('');
    if (!navigator.clipboard || !navigator.clipboard.readText) return Promise.resolve('');
    return Promise.race([
      navigator.clipboard.readText().catch(function () { return ''; }),
      new Promise(function (resolve) {
        window.setTimeout(function () { resolve(''); }, 1800);
      })
    ]).then(function (clip) {
      return String(clip || '').trim();
    });
  }

  function expectedCount(ctx, options) {
    if (options && options.expectedCount > 0) return options.expectedCount;
    if (ctx && ctx.expectedCount > 0) return ctx.expectedCount;
    if (typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.getExplorerObjectCount) {
      return ProductExplorerBridge.getExplorerObjectCount() || 0;
    }
    return 0;
  }

  function rootName(ctx) {
    if (ctx && (ctx.rootName || ctx.productName)) return ctx.rootName || ctx.productName;
    if (typeof ProductExplorerBridge !== 'undefined' && ProductExplorerBridge.getStructureNameHint) {
      return ProductExplorerBridge.getStructureNameHint() || '';
    }
    return '';
  }

  function buildPayload(items, term) {
    var name = term || 'E-BOM';
    items.forEach(function (it, idx) {
      if (idx === 0 || it.level === 0) name = it.title || it.name || name;
    });
    return BomSnapshot.buildFromImported(items, name);
  }

  function loadStrictPaste(ctx, options) {
    if (typeof FileImportService === 'undefined' || !FileImportService.parseTextAsync) {
      return Promise.reject(new Error('Parser de importacao indisponivel.'));
    }
    if (typeof BomSnapshot === 'undefined' || !BomSnapshot.applyPayload) {
      return Promise.reject(new Error('Modulo snapshot indisponivel.'));
    }
    var expected = expectedCount(ctx, options);
    var term = rootName(ctx);
    return readPasteText().then(function (text) {
      if (!text || text.indexOf('\t') < 0) {
        throw new Error(
          'Nenhum TSV completo no clipboard. No Explorer: expanda todos os niveis -> Ctrl+A -> Ctrl+C -> Atualizar estrutura.'
        );
      }
      return FileImportService.parseTextAsync(text);
    }).then(function (items) {
      if (!items || !items.length) {
        throw new Error('Nenhuma linha reconhecida no TSV do Explorer.');
      }
      if (expected > 0 && items.length !== expected) {
        throw new Error(
          'TSV incompleto ' + items.length + '/' + expected +
          '. Expanda todos os niveis no Explorer, selecione a grade inteira e copie novamente.'
        );
      }
      var payload = buildPayload(items, term);
      if (!payload || !payload.items || !payload.items.length) {
        throw new Error('Falha ao normalizar TSV do Explorer.');
      }
      APP_CONFIG.IMPORT_MODE = true;
      APP_CONFIG.DEMO_MODE = false;
      return BomSnapshot.applyPayload(payload).then(function (meta) {
        var count = BomService.getNodeCount() || meta.itemCount || items.length;
        return {
          ok: true,
          mode: 'paste',
          loaderMode: 'paste',
          meta: meta,
          partial: false,
          message:
            'TSV ' + count + (expected > 0 ? '/' + expected : '') +
            ' - ' + (meta.productName || term || 'E-BOM')
        };
      });
    });
  }

  function load(ctx, options) {
    options = options || {};
    if (options.forceLoader === 'paste') {
      return loadStrictPaste(ctx, options);
    }
    if (typeof ExplorerScanner === 'undefined' || !ExplorerScanner.scanViaClipboardOrPaste) {
      return Promise.reject(new Error('Nenhuma fonte de cola disponivel.'));
    }
    return ExplorerScanner.scanViaClipboardOrPaste().then(function (res) {
      if (!res) return res;
      res.loaderMode = 'paste';
      return res;
    });
  }

  return { load: load };
})();
