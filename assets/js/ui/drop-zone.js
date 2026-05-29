/**
 * @file ui/drop-zone.js
 * Drag & drop — export Product Explorer (Excel/CSV).
 */
var DropZone = (function () {
  'use strict';

  function init(options) {
    options = options || {};
    var zone = document.getElementById('dropZone');
    if (!zone) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function (ev) {
      zone.addEventListener(ev, prevent, false);
      document.body.addEventListener(ev, prevent, false);
    });

    zone.addEventListener('dragover', function () {
      zone.classList.add('drag-over');
    });
    zone.addEventListener('dragleave', function () {
      zone.classList.remove('drag-over');
    });

    zone.addEventListener('drop', function (e) {
      zone.classList.remove('drag-over');
      var files = e.dataTransfer && e.dataTransfer.files;
      if (!files || !files.length) return;
      handleFiles(files[0], options);
    });

    var input = document.getElementById('fileInput');
    if (input) {
      input.addEventListener('change', function () {
        if (input.files && input.files[0]) handleFiles(input.files[0], options);
      });
    }

    var btnSample = document.getElementById('btnSampleImport');
    if (btnSample) {
      btnSample.addEventListener('click', function () {
        var url = (window.__3DX_ASSET_ROOT__ || 'assets/') + 'samples/estrutura-exemplo.csv';
        setStatus('Carregando exemplo...', 'info');
        fetch(url)
          .then(function (r) {
            if (!r.ok) throw new Error('Exemplo não encontrado (' + r.status + '). Use importar.html');
            return r.text();
          })
          .then(function (text) {
            var blob = new Blob([text], { type: 'text/csv' });
            var file = new File([blob], 'estrutura-exemplo.csv', { type: 'text/csv' });
            handleFiles(file, options);
          })
          .catch(function (err) {
            if (options.onError) options.onError(err.message || err);
          });
      });
    }
  }

  function setStatus(msg) {
    var bar = document.getElementById('statusBar');
    if (bar) bar.textContent = msg;
  }

  function prevent(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleFiles(file, options) {
    var label = document.getElementById('dropZoneLabel');
    if (label) label.textContent = 'Processando: ' + file.name + '...';

    FileImportService.parseFile(file)
      .then(function (items) {
        return BomService.loadFromImportedItems(items);
      })
      .then(function () {
        var n = BomService.getNodeCount();
        var root = BomService.getRootId();
        if (root) {
          ProductExplorerBridge.setSelection({
            physicalid: root,
            name: BomService.getNode(root).name,
            displayName: BomService.getNode(root).title || BomService.getNode(root).name,
            type: BomService.getNode(root).type
          });
        }
        if (options.onImported) options.onImported(n, file.name);
        if (label) label.textContent = 'Arquivo carregado: ' + file.name + ' (' + n + ' itens)';
      })
      .catch(function (err) {
        if (label) label.textContent = 'Solte aqui o Excel/CSV exportado do Product Explorer';
        if (options.onError) options.onError(err.message || err);
      });
  }

  return { init: init };
})();
