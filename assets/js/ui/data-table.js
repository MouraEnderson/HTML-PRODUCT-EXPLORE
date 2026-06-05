/**
 * @file ui/data-table.js
 * Tabela E-BOM — thumbnails, scroll, clique → preview.
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
  var selectedIndex = -1;
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

  function uiContains(el) {
    if (!el) return false;
    var root = uiRoot();
    return root === el || (root.contains && root.contains(el));
  }

  function init(tableSelector) {
    columns = getColumns();
    var sel = tableSelector || '#bomTable';
    tableEl = uiRoot().querySelector(sel);
    if (!tableEl) return;
    tbody = tableEl.querySelector('tbody');
    thead = tableEl.querySelector('thead tr');
    scrollContainer = tableEl.closest('.bom-table-wrap') || tableEl.parentElement;
    renderHeader();
    bindRowClicks();
    if (scrollContainer) {
      scrollContainer.style.overflowY = 'scroll';
      scrollContainer.style.overflowX = 'auto';
      scrollContainer.style.webkitOverflowScrolling = 'touch';
    }
  }

  function onRowSelect(handler) {
    rowSelectHandler = handler;
  }

  function highlightRow(index) {
    if (!syncTableRefs() || !tbody) return;
    selectedIndex = index;
    tbody.querySelectorAll('tr.bom-row-selected').forEach(function (r) {
      r.classList.remove('bom-row-selected');
    });
    var tr = tbody.querySelector('tr[data-row-index="' + index + '"]');
    if (tr) {
      tr.classList.add('bom-row-selected');
      if (tr.scrollIntoView) {
        tr.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }

  function selectRow(index, silent) {
    if (!data.length || index < 0 || index >= data.length) return null;
    highlightRow(index);
    if (!silent && rowSelectHandler) rowSelectHandler(data[index]);
    return data[index];
  }

  function selectFirst(silent) {
    return selectRow(0, silent);
  }

  function syncTableRefs() {
    var el = uiRoot().querySelector('#bomTable');
    if (!el) return false;
    if (el !== tableEl) {
      tableEl = el;
      tbody = tableEl.querySelector('tbody');
      thead = tableEl.querySelector('thead tr');
      scrollContainer = tableEl.closest('.bom-table-wrap') || tableEl.parentElement;
    }
    return !!(tableEl && tbody);
  }

  function handleRowPointer(ev) {
    if (!ev || !ev.target || !ev.target.closest) return;
    if (!syncTableRefs()) return;
    var tr = ev.target.closest('tr.bom-table-row[data-row-index]');
    if (!tr || !tbody || !tbody.contains(tr)) return;
    var idx = parseInt(tr.getAttribute('data-row-index'), 10);
    if (isNaN(idx)) return;
    if (ev.type === 'click' || ev.type === 'pointerup') {
      if (ev.button != null && ev.button !== 0) return;
    }
    selectRow(idx, false);
  }

  function exposeRowPicker() {
    var root = typeof window !== 'undefined' ? window : null;
    if (!root) return;
    root.__bomPickRow = function (idx) {
      var n = parseInt(idx, 10);
      if (isNaN(n)) return;
      selectRow(n, false);
    };
  }

  function bindRowClicks() {
    syncTableRefs();
    exposeRowPicker();
    var root = uiRoot();
    if (!root || !root.addEventListener) return;
    if (root.__3DX_ROW_HANDLER__) {
      root.removeEventListener('click', root.__3DX_ROW_HANDLER__, true);
      root.removeEventListener('pointerup', root.__3DX_ROW_HANDLER__, true);
    }
    root.__3DX_ROW_HANDLER__ = handleRowPointer;
    root.__3DX_ROW_ROOT_BOUND__ = true;
    root.addEventListener('click', handleRowPointer, true);
    root.addEventListener('pointerup', handleRowPointer, true);
    if (scrollContainer && !scrollContainer.__3DX_ROW_BOUND__) {
      scrollContainer.__3DX_ROW_BOUND__ = true;
      scrollContainer.addEventListener('pointerup', handleRowPointer);
      scrollContainer.addEventListener('click', handleRowPointer);
    }
  }

  function renderHeader() {
    if (!thead) return;
    thead.innerHTML = '';
    columns.forEach(function (c) {
      var th = document.createElement('th');
      if (c.format === 'thumb') th.className = 'bom-col-thumb';
      th.textContent = c.label || '';
      thead.appendChild(th);
    });
  }

  function maturityLabel(n) {
    return String(n.maturity || n.state || '').trim();
  }

  function formatCell(n, col) {
    if (col.format === 'thumb' || col.key === '_thumb') {
      if (typeof PartImage !== 'undefined') return PartImage.thumbHtml(n, 'bom-thumb-md');
      return '<span class="bom-thumb-wrap bom-thumb-md"><span class="bom-thumb-fallback">?</span></span>';
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
    if (!tbody || !tableEl || !uiContains(tableEl)) {
      init('#bomTable');
    }
    if (selectedIndex >= data.length) selectedIndex = -1;
    render();
  }

  function render() {
    if (!tbody) return;
    var slice = data.slice(0, MAX_ROWS);
    if (!slice.length) {
      selectedIndex = -1;
      tbody.innerHTML =
        '<tr><td colspan="' + (columns.length || 1) + '" class="bom-table-empty">' +
        'Nenhuma linha. Abra uma estrutura no Product Structure Explorer e clique Atualizar estrutura.</td></tr>';
      return;
    }
    tbody.innerHTML = slice.map(function (n, idx) {
      var tds = columns.map(function (col) {
        var tdCls = col.format === 'thumb' ? ' class="bom-col-thumb"' : '';
        return '<td' + tdCls + '>' + formatCell(n, col) + '</td>';
      }).join('');
      var sel = selectedIndex === idx ? ' bom-row-selected' : '';
      return (
        '<tr class="bom-table-row' + sel + '" data-row-index="' + idx + '" data-id="' +
        escapeAttr(n.physicalid) + '" tabindex="0" role="row"' +
        ' onclick="window.__bomPickRow&&window.__bomPickRow(' + idx + ')"' +
        ' onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();window.__bomPickRow&&window.__bomPickRow(' + idx + ');}">' +
        tds + '</tr>'
      );
    }).join('');
    if (typeof PartImage !== 'undefined' && PartImage.hydrateThumbs) {
      PartImage.hydrateThumbs(tbody);
    }
    bindRowClicks();
    if (selectedIndex >= 0) highlightRow(selectedIndex);
  }

  function maturityStatusBadge(matCls, raw) {
    var r = String(raw || '').trim();
    if (!r) return { text: 'Sem maturidade', cls: 'status-neutral' };
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
    selectRow: selectRow,
    selectFirst: selectFirst,
    getSelectedIndex: function () { return selectedIndex; },
    exportExcel: exportExcel,
    getColumns: getColumns
  };
})();
