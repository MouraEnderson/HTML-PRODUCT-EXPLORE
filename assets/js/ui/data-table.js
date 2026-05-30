/**
 * @file ui/data-table.js
 * Tabela virtualizada — colunas Product Explorer.
 */
var DataTable = (function () {
  'use strict';

  var tbody;
  var thead;
  var rowHeight = 36;
  var visibleRows = 25;
  var data = [];
  var scrollContainer;
  var columns = [];

  function getColumns() {
    if (APP_CONFIG.UI_CLEAN && APP_CONFIG.PILOT_TABLE_COLUMNS && APP_CONFIG.PILOT_TABLE_COLUMNS.length) {
      return APP_CONFIG.PILOT_TABLE_COLUMNS;
    }
    return APP_CONFIG.PRODUCT_EXPLORER_COLUMNS || [];
  }

  function init(tableSelector) {
    columns = getColumns();
    var table = (typeof qs3dx === 'function' ? qs3dx(tableSelector) : document.querySelector(tableSelector));
    if (!table) return;
    scrollContainer = table.closest('.table-scroll');
    tbody = table.querySelector('tbody');
    thead = table.querySelector('thead tr');
    renderHeader();
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', onScroll);
    }
  }

  function renderHeader() {
    if (!thead) return;
    thead.innerHTML = columns.map(function (c) {
      return '<th>' + escapeHtml(c.label) + '</th>';
    }).join('');
  }

  function formatCell(n, col) {
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
    if (col.key === 'type') return shortType(v);
    if (col.format === 'status' || col.key === 'state' || col.key === 'maturity') {
      var matCls = AttributeService.classifyMaturity(v || n.state || n.maturity);
      var status = maturityStatusBadge(matCls, v || n.state || n.maturity);
      return '<span class="status-pill ' + status.cls + '">' + escapeHtml(status.text) + '</span>';
    }
    return escapeHtml(v == null ? '' : v);
  }

  function setData(nodes) {
    data = nodes;
    render();
  }

  function onScroll() {
    render();
  }

  function getScrollTop() {
    return scrollContainer ? scrollContainer.scrollTop : 0;
  }

  function render() {
    if (!tbody) return;
    var colCount = columns.length || 1;
    var start = Math.floor(getScrollTop() / rowHeight);
    var end = Math.min(start + visibleRows + 5, data.length);
    start = Math.max(0, start - 2);

    var spacerTop = start * rowHeight;
    var spacerBottom = Math.max(0, (data.length - end) * rowHeight);

    var rows = data.slice(start, end).map(function (n) {
      var tds = columns.map(function (col) {
        var content = formatCell(n, col);
        var title = col.key === 'name' ? ' title="' + escapeAttr(n.physicalid) + '"' : '';
        return '<td' + title + '>' + content + '</td>';
      }).join('');
      return '<tr data-id="' + escapeAttr(n.physicalid) + '">' + tds + '</tr>';
    }).join('');

    tbody.innerHTML =
      (spacerTop ? '<tr class="spacer" style="height:' + spacerTop + 'px"><td colspan="' + colCount + '"></td></tr>' : '') +
      rows +
      (spacerBottom ? '<tr class="spacer" style="height:' + spacerBottom + 'px"><td colspan="' + colCount + '"></td></tr>' : '');
  }

  function maturityStatusBadge(matCls, raw) {
    if (matCls === 'released') return { text: 'Saudável', cls: 'status-ok' };
    if (matCls === 'in_work') return { text: 'Atenção', cls: 'status-warn' };
    if (matCls === 'obsolete') return { text: 'Crítico', cls: 'status-bad' };
    var r = String(raw || '').trim();
    return { text: r || 'Sem status', cls: 'status-neutral' };
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
    exportExcel: exportExcel,
    getColumns: getColumns
  };
})();
