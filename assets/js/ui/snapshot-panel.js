/**
 * @file ui/snapshot-panel.js
 * Colar estrutura do Explorer ou carregar arquivo JSON no widget.
 */
var SnapshotPanel = (function () {
  'use strict';

  function init(options) {
    options = options || {};
    var btn = document.getElementById('btnImportPaste');
    var area = document.getElementById('pasteArea');
    var fileInput = document.getElementById('snapshotFileInput');
    var btnFile = document.getElementById('btnLoadSnapshotFile');

    if (btn && area) {
      btn.addEventListener('click', function () {
        importText(area.value, options);
      });
      area.addEventListener('paste', function (e) {
        var t = (e.clipboardData && e.clipboardData.getData('text/plain')) || '';
        if (t) {
          e.preventDefault();
          area.value = t;
          importText(t, options);
        }
      });
    }

    if (btnFile && fileInput) {
      btnFile.addEventListener('click', function () {
        fileInput.click();
      });
      fileInput.addEventListener('change', function () {
        if (!fileInput.files || !fileInput.files[0]) return;
        var reader = new FileReader();
        reader.onload = function () {
          try {
            var data = JSON.parse(reader.result);
            if (options.onSnapshot) options.onSnapshot(data, 'arquivo JSON');
          } catch (err) {
            if (options.onError) options.onError('JSON inválido: ' + (err.message || err));
          }
        };
        reader.readAsText(fileInput.files[0], 'UTF-8');
      });
    }
  }

  function importText(text, options) {
    var trimmed = String(text || '').trim();
    if (!trimmed) {
      if (options.onError) {
        options.onError(
          'Importação manual desativada. Use Atualizar estrutura (Explorer Mirror — fonte oficial).'
        );
      }
      return;
    }
    if (trimmed.charAt(0) === '{' || trimmed.charAt(0) === '[') {
      try {
        var data = JSON.parse(trimmed);
        if (options.onSnapshot) options.onSnapshot(data, 'JSON colado');
        return;
      } catch (e) { /* segue como TSV */ }
    }
    if (typeof FileImportService === 'undefined') {
      if (options.onError) options.onError('Parser não carregado.');
      return;
    }
    FileImportService.parseTextAsync(trimmed)
      .then(function (items) {
        if (!items.length) throw new Error('Nenhuma linha reconhecida');
        var payload = BomSnapshot.buildFromImported(items, items[0].name || items[0].title);
        if (options.onSnapshot) options.onSnapshot(payload, 'cola Explorer');
      })
      .catch(function (err) {
        if (options.onError) options.onError(err.message || err);
      });
  }

  return { init: init, importText: importText };
})();
