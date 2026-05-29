/**
 * @file ui/drop-zone.js
 * Colar estrutura do Product Explorer (Ctrl+C) — sem arquivo.
 */
var DropZone = (function () {
  'use strict';

  function init(options) {
    options = options || {};
    var zone = document.getElementById('dropZone');
    var pasteArea = document.getElementById('pasteArea');
    if (!zone) return;

    if (pasteArea) {
      pasteArea.addEventListener('paste', function (e) {
        var text = '';
        if (e.clipboardData) text = e.clipboardData.getData('text/plain') || '';
        if (text) {
          e.preventDefault();
          pasteArea.value = text;
          processPaste(text, options);
        }
      });
    }

    var btnImport = document.getElementById('btnImportPaste');
    if (btnImport && pasteArea) {
      btnImport.addEventListener('click', function () {
        processPaste(pasteArea.value, options);
      });
    }

    var btnClip = document.getElementById('btnReadClipboard');
    if (btnClip) {
      btnClip.addEventListener('click', function () {
        if (!navigator.clipboard || !navigator.clipboard.readText) {
          if (options.onError) {
            options.onError('Use Ctrl+V na caixa de texto (leitura automática bloqueada no widget).');
          }
          return;
        }
        navigator.clipboard.readText().then(function (text) {
          if (pasteArea) pasteArea.value = text;
          processPaste(text, options);
        }).catch(function () {
          if (options.onError) {
            options.onError('Clique na caixa abaixo e pressione Ctrl+V.');
          }
        });
      });
    }

    var btnSample = document.getElementById('btnSampleImport');
    if (btnSample) {
      btnSample.addEventListener('click', function () {
        var sample =
          'Nível\tNome\tTitle\tTipo\tRevisão\tEstado\n' +
          '0\t01_SKA_Drone Assembly\tDrone Assembly\tVPMReference\tA\tRELEASED\n' +
          '1\tASM_Fuselage\tFuselage\tVPMReference\tB\tIN_WORK\n' +
          '2\tPRT_Frame_01\tFrame\tVPMPart\tA\tRELEASED';
        if (pasteArea) pasteArea.value = sample;
        processPaste(sample, options);
      });
    }

    var zoneFile = document.getElementById('fileDropOptional');
    if (zoneFile) {
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function (ev) {
        zoneFile.addEventListener(ev, prevent, false);
      });
      zoneFile.addEventListener('drop', function (e) {
        var files = e.dataTransfer && e.dataTransfer.files;
        if (files && files[0]) handleFiles(files[0], options);
      });
    }

    var input = document.getElementById('fileInput');
    if (input) {
      input.addEventListener('change', function () {
        if (input.files && input.files[0]) handleFiles(input.files[0], options);
      });
    }
  }

  function prevent(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  function processPaste(text, options) {
    if (!text || !String(text).trim()) {
      if (options.onError) options.onError('Nada para importar. Copie linhas no Explorer primeiro.');
      return;
    }
    var label = document.getElementById('dropZoneLabel');
    if (label) label.textContent = 'Processando dados colados...';

    FileImportService.parseTextAsync(text)
      .then(function (items) {
        return BomService.loadFromImportedItems(items);
      })
      .then(function () {
        finishImport(options, 'dados colados do Explorer');
      })
      .catch(function (err) {
        if (label) label.textContent = 'Cole aqui a estrutura copiada do Product Explorer';
        if (options.onError) options.onError(err.message || err);
      });
  }

  function handleFiles(file, options) {
    var label = document.getElementById('dropZoneLabel');
    if (label) label.textContent = 'Processando: ' + file.name + '...';

    FileImportService.parseFile(file)
      .then(function (items) {
        return BomService.loadFromImportedItems(items);
      })
      .then(function () {
        finishImport(options, file.name);
      })
      .catch(function (err) {
        if (label) label.textContent = 'Cole aqui a estrutura copiada do Product Explorer';
        if (options.onError) options.onError(err.message || err);
      });
  }

  function finishImport(options, sourceLabel) {
    var n = BomService.getNodeCount();
    var root = BomService.getRootId();
    if (root) {
      ProductExplorerBridge.setSelection({
        physicalid: root,
        name: BomService.getNode(root).name,
        displayName: BomService.getNode(root).title || BomService.getNode(root).name,
        type: BomService.getNode(root).type
      });
      var sel = document.getElementById('selectionLabel');
      if (sel) sel.textContent = (BomService.getNode(root).name || root) + ' (' + root + ')';
    }
    if (options.onImported) options.onImported(n, sourceLabel);
    var label = document.getElementById('dropZoneLabel');
    if (label) label.textContent = 'Importado: ' + n + ' itens (' + sourceLabel + ')';
  }

  return { init: init };
})();
