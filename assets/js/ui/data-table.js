/**
 * @file ui/data-table.js
 * Tabela E-BOM — thumbnails, scroll nativo, clique → preview.
 */
var DataTable = (function () {
  'use strict';

  var tbody;
  var thead;
  var tableEl;
  var data = [];
  var scrollContainer;
  var columns = [];
  var rowSelectHandler = null;
  var selectedId = null;
  var MAX_ROWS = 8000;

  function uiRoot() {
    return window.__3DX_UI_ROOT__ || document;
  }

  function getColumns() {
    if (APP_CONFIG.UI_CLEAN && APP_CONFIG.PILOT_TABLE_COLUMNS && APP_CONFIG.PILOT_TABLE_COLUMNS.length) {
      return APP_CONFIG.PILOT_TABLE_COLUMNS;
    }
    return APP_CONFIG.PRODUCT_EXPLORER_COLUMNS || [];
  }

  function init(tableSelector) {
    columns = getColumns();
    tableEl = uiRoot().querySelector(tableSelector);
    if (!tableEl) return;
    scrollContainer = tableEl.closest('.bom-table-wrap') || tableEl.parentElement;
    tbody = tableEl.querySelector('tbody');
    thead = tableEl.querySelector('thead tr');
    renderHeader();
    bindRowClicks();
    if (scrollContainer) {
      scrollContainer.style.overflowY = 'auto';
      scrollContainer.style.webkitOverflowScrolling = 'touch';
    }
  }

  function onRowSelect(handler) {
    rowSelectHandler = handler;
  }

  function bindRowClicks() {
    if (!tbody || tbody.__3DX_ROW_BOUND__) return;
    tbody.__3DX_ROW_BOUND__ = true;
    tbody.addEventListener('click', function (ev) {
      var tr = ev.target && ev.target.closest ? ev.target.closest('tr[data-id]') : null;
      if (!tr) return;
      var id = tr.getAttribute('data-id');
      var node = null;
      for (var i = 0; i < data.length; i++) {
        if (String(data[i].physicalid) === String(id)) {
          node = data[i];
          break;
        }
      }
      selectedId = id;
      tbody.querySelectorAll('tr.bom-row-selected').forEach(function (r) {
        r.classList.remove('bom-row-selected');
      });
      tr.classList.add('bom-row-selected');
      if (rowSelectHandler) rowSelectHandler(node, tr);
    });
  }

  function renderHeader() {
    if (!thead) return;
    thead.innerHTML = columns.map(function (c) {
      var cls = c.format === 'thumb' ? ' class="bom-col-thumb"' : '';
      return '<th' + cls + '>' + escapeHtml(c.label) + '</th>';
    }).join('');
  }

  function maturityLabel(n) {
    return String(n.maturity || n.state || '').trim();
  }

  function formatCell(n, col) {
    if (col.format === 'thumb' || col.key === '_thumb') {
      if (typeof PartImage !== 'undefined') return PartImage.thumbHtml(n, 'bom-thumb-md');
      return '<span class="bom-thumb-fallback">?</span>';
    }
    var v = n[col.key];
    if (col.format === 'bool') return v ? 'Sim' : 'Não';
    if (col.format === 'date') {
      if (!v) return '';
      try {
        return v instanceof Date ? v.toLocaleDateString('pt-BR') : new Date(v).toLocaleDateString('pt-BR');
      } catch (e) {
        return String(v);
      }
    }
    if (col.key === 'owner') {
      var o = v;
      if (typeof MetricsEngine !== 'undefined' && MetricsEngine.ownerLabel) {
        o = MetricsEngine.ownerLabel(n.owner);
      }
      return escapeHtml(o || '');
    }
    if (col.key === 'type') return escapeHtml(shortType(v));
    if (col.format === 'status' || col.key === 'state' || col.key === 'maturity') {
      var raw = maturityLabel(n);
      var matCls = AttributeService.classifyMaturity(raw);
      var status = maturityStatusBadge(matCls, raw);
      return '<span class="status-pill ' + status.cls + '">' + escapeHtml(status.text) + '</span>';
    }
    return escapeHtml(v == null ? '' : v);
  }

  function setData(nodes) {
    data = nodes || [];
    if (!tbody || !document.body.contains(tableEl)) {
      init('#bomTable');
    }
    render();
  }

  function render() {
    if (!tbody) return;
    var slice = data.slice(0, MAX_ROWS);
    if (!slice.length) {
      selectedId = null;
      tbody.innerHTML =
        '<tr><td colspan="' + (columns.length || 1) + '" class="bom-table-empty">' +
        'Nenhuma linha. Importe Ctrl+C no Explorer (inclua coluna Maturidade).</td></tr>';
      return;
    }
    tbody.innerHTML = slice.map(function (n) {
      var tds = columns.map(function (col) {
        var tdCls = col.format === 'thumb' ? ' class="bom-col-thumb"' : '';
        return '<td' + tdCls + '>' + formatCell(n, col) + '</td>';
      }).join('');
      var sel = selectedId && String(selectedId) === String(n.physicalid) ? ' bom-row-selected' : '';
      return '<tr class="bom-table-row' + sel + '" data-id="' + escapeAttr(n.physicalid) + '">' + tds + '</tr>';
    }).join('');
  }

  function maturityStatusBadge(matCls, raw) {
    var r = String(raw || '').trim();
    if (matCls === 'released') return { text: r || 'Aprovado', cls: 'status-ok' };
    if (matCls === 'in_work') return { text: r || 'Em Trabalho', cls: 'status-warn' };
    if (matCls === 'obsolete') return { text: r || 'Obsoleto', cls: 'status-bad' };
    return { text: r || 'Sem maturidade', cls: 'status-neutral' };
  }

  function shortType(t) {
    if (!t) return '';
    var parts = String(t).split(':');
    return parts[parts.length - 1];
  }

  function escapeHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function escapeAttr(s) {
    return String(s).replace(/"/g, '&quot;');
  }

  function exportExcel() {
    if (typeof XLSX === 'undefined') {
      alert('SheetJS não carregado.');
      return;
    }
    var rows = data.map(function (n) {
      var row = {};
      columns.forEach(function (col) {
        if (col.format === 'thumb') return;
        var v = n[col.key];
        if (col.format === 'date' && v) {
          v = v instanceof Date ? v.toISOString() : v;
        }
        if (col.format === 'bool') v = v ? 'Sim' : 'Nao';
        row[col.label] = v;
      });
      return row;
    });
    var ws = XLSX.utils.json_to_sheet(rows);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ProductExplorer');
    XLSX.writeFile(wb, 'bom-analytics-' + new Date().toISOString().slice(0, 10) + '.xlsx');
  }

  return {
    init: init,
    setData: setData,
    onRowSelect: onRowSelect,
    exportExcel: exportExcel,
    getColumns: getColumns
  };
})();
