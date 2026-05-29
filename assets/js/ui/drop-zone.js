/**
 * @file ui/drop-zone.js
 * Colar E-BOM, arrastar Physical Product (JSON 3DXContent), ou arquivo.
 */
var DropZone = (function () {
  'use strict';

  function init(options) {
    options = options || {};
    var zone = document.getElementById('dropZone');
    var pasteArea = document.getElementById('pasteArea');
    if (!zone) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function (ev) {
      zone.addEventListener(ev, prevent, false);
    });
    zone.addEventListener('dragover', function () {
      zone.classList.add('drag-over');
    });
    zone.addEventListener('dragleave', function () {
      zone.classList.remove('drag-over');
    });
    zone.addEventListener('drop', function (e) {
      zone.classList.remove('drag-over');
      onDrop(e, options, pasteArea);
    });

    if (pasteArea) {
      pasteArea.addEventListener('paste', function (e) {
        var text = extractClipboardText(e);
        if (text) {
          e.preventDefault();
          pasteArea.value = text;
          processInput(text, options);
        }
      });
    }

    var btnImport = document.getElementById('btnImportPaste');
    if (btnImport && pasteArea) {
      btnImport.addEventListener('click', function () {
        processInput(pasteArea.value, options);
      });
    }

    var btnClip = document.getElementById('btnReadClipboard');
    if (btnClip) {
      btnClip.addEventListener('click', function () {
        if (!navigator.clipboard || !navigator.clipboard.readText) {
          if (options.onError) {
            options.onError('Use Ctrl+V na caixa ou arraste o produto do Explorer.');
          }
          return;
        }
        navigator.clipboard.readText().then(function (text) {
          if (pasteArea) pasteArea.value = text;
          processInput(text, options);
        }).catch(function () {
          if (options.onError) options.onError('Ctrl+V na caixa ou arraste o Physical Product.');
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
        processInput(sample, options);
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

  function extractClipboardText(e) {
    if (!e.clipboardData) return '';
    return e.clipboardData.getData('text/plain') || e.clipboardData.getData('text') || '';
  }

  function extractDropText(e) {
    var dt = e.dataTransfer;
    if (!dt) return '';
    var text = dt.getData('text/plain') || dt.getData('text') || '';
    if (text) return text;
    try {
      text = dt.getData('application/json') || '';
    } catch (err) { /* */ }
    return text;
  }

  function onDrop(e, options, pasteArea) {
    var dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length) {
      handleFiles(dt.files[0], options);
      return;
    }
    var text = extractDropText(e);
    if (text && pasteArea) pasteArea.value = text;
    processInput(text, options);
  }

  function processInput(text, options) {
    var trimmed = String(text || '').trim();
    if (!trimmed) {
      if (options.onError) {
        options.onError('Arraste o Physical Product do Explorer para a caixa ou cole a E-BOM (Ctrl+C).');
      }
      return;
    }

    var sel = typeof ThreeDXContentParser !== 'undefined'
      ? ThreeDXContentParser.parseJsonText(trimmed)
      : null;

    if (sel && sel.physicalid) {
      import3DXProduct(sel, options);
      return;
    }

    var label = document.getElementById('dropZoneLabel');
    if (label) label.textContent = 'Processando linhas da E-BOM...';

    FileImportService.parseTextAsync(trimmed)
      .then(function (items) {
        return BomService.loadFromImportedItems(items);
      })
      .then(function () {
        finishImport(options, 'E-BOM colada');
      })
      .catch(function (err) {
        if (label) label.textContent = 'Arraste o produto ou cole linhas da grade E-BOM';
        if (options.onError) {
          options.onError(
            (err.message || err) + ' — Se arrastou um produto, solte na caixa azul e clique Importar.'
          );
        }
      });
  }

  function import3DXProduct(sel, options) {
    var label = document.getElementById('dropZoneLabel');
    if (label) label.textContent = 'Vinculando: ' + (sel.displayName || sel.physicalid) + '...';

    ProductExplorerBridge.setSelection(sel);

    BomService.loadFrom3DXProduct(sel)
      .then(function () {
        var n = BomService.getNodeCount();
        var selLabel = document.getElementById('selectionLabel');
        if (selLabel) {
          selLabel.textContent = (sel.displayName || sel.name) + ' (' + sel.physicalid + ')';
        }
        if (options.on3DXProduct) {
          options.on3DXProduct(sel, n);
        } else {
          finishImport(options, sel.displayName || 'produto 3DEXPERIENCE');
        }
        if (label) {
          label.textContent = 'Produto: ' + (sel.displayName || sel.physicalid) + ' (' + n + ' itens)';
        }
      })
      .catch(function (err) {
        if (label) label.textContent = 'Arraste o produto ou cole linhas da grade E-BOM';
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
        if (label) label.textContent = 'Arraste o produto ou cole linhas da grade E-BOM';
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
