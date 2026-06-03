/**
 * @file services/paste-bom-loader.js
 * Sprint 2.5 — cola manual / clipboard (sem espelho DOM).
 */
var PasteBomLoader = (function () {
  'use strict';

  function load(ctx, options) {
    options = options || {};
    if (typeof ExplorerScanner === 'undefined') {
      return Promise.reject(new Error('Importação indisponível.'));
    }
    var chain;
    if (options.forceLoader === 'paste' && ExplorerScanner.scanViaClipboardOrPaste) {
      chain = ExplorerScanner.scanViaClipboardOrPaste();
    } else if (ExplorerScanner.scanViaImportBestEffort) {
      chain = ExplorerScanner.scanViaImportBestEffort();
    } else if (ExplorerScanner.scanViaClipboardOrPaste) {
      chain = ExplorerScanner.scanViaClipboardOrPaste();
    } else {
      return Promise.reject(new Error('Nenhuma fonte de cola disponível.'));
    }
    return chain.then(function (res) {
      if (!res) return res;
      res.loaderMode = res.loaderMode || 'paste';
      if (res.mode && res.mode.indexOf('explorer') >= 0) {
        res.loaderMode = 'paste';
      }
      return res;
    });
  }

  return { load: load };
})();
