/**
 * @file ui/product-search-panel.js
 * Busca e seleção de Physical Product (estilo Product Explorer).
 */
var ProductSearchPanel = (function () {
  'use strict';

  var onSelectCallback = null;
  var debounceTimer;

  function init(options) {
    onSelectCallback = options.onSelect;
    var input = document.getElementById('platformSearchInput');
    var btn = document.getElementById('btnPlatformSearch');
    var results = document.getElementById('platformSearchResults');

    if (!input || !btn || !results) return;

    btn.addEventListener('click', function () {
      runSearch(input.value.trim());
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') runSearch(input.value.trim());
    });

    input.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      var q = input.value.trim();
      if (q.length < APP_CONFIG.SEARCH.MIN_CHARS) {
        results.innerHTML = '';
        results.classList.remove('open');
        return;
      }
      debounceTimer = setTimeout(function () {
        runSearch(q);
      }, APP_CONFIG.SEARCH_DEBOUNCE_MS);
    });
  }

  function runSearch(term) {
    var results = document.getElementById('platformSearchResults');
    if (!term || term.length < APP_CONFIG.SEARCH.MIN_CHARS) {
      renderMessage('Digite ao menos ' + APP_CONFIG.SEARCH.MIN_CHARS + ' caracteres.');
      return;
    }
    renderMessage('Buscando na plataforma...');
    ProductSearchService.search(term)
      .then(function (items) {
        if (!items.length) {
          renderMessage('Nenhum Physical Product encontrado para: ' + escapeHtml(term));
          return;
        }
        renderResults(items);
      })
      .catch(function (err) {
        renderMessage('Erro na busca: ' + escapeHtml(err.message || String(err)));
      });
  }

  function renderMessage(msg) {
    var results = document.getElementById('platformSearchResults');
    results.innerHTML = '<div class="search-msg">' + msg + '</div>';
    results.classList.add('open');
  }

  function renderResults(items) {
    var results = document.getElementById('platformSearchResults');
    var html = '<table class="search-results-table"><thead><tr>' +
      '<th>Nome</th><th>Tipo</th><th>Rev</th><th>Estado</th><th>Owner</th><th>Collab Space</th>' +
      '</tr></thead><tbody>';
    items.forEach(function (item) {
      html += '<tr class="search-hit" data-id="' + escapeAttr(item.physicalid) + '">' +
        '<td>' + escapeHtml(item.displayName || item.name) + '</td>' +
        '<td>' + escapeHtml(item.displayType || shortType(item.type)) + '</td>' +
        '<td>' + escapeHtml(item.revision || '') + '</td>' +
        '<td>' + escapeHtml(item.state || '') + '</td>' +
        '<td>' + escapeHtml(item.owner || '') + '</td>' +
        '<td>' + escapeHtml(item.collabSpace || '') + '</td>' +
        '</tr>';
    });
    html += '</tbody></table>';
    results.innerHTML = html;
    results.classList.add('open');

    results.querySelectorAll('.search-hit').forEach(function (row) {
      row.addEventListener('click', function () {
        var id = row.getAttribute('data-id');
        var hit = items.find(function (x) { return x.physicalid === id; });
        if (!hit) return;
        selectHit(hit);
      });
    });
  }

  function selectHit(hit) {
    var sel = {
      physicalid: hit.physicalid,
      type: hit.type || 'VPMReference',
      name: hit.name,
      displayName: hit.displayName || hit.name,
      displayType: hit.displayType
    };
    ProductExplorerBridge.setSelection(sel);
    document.getElementById('platformSearchResults').classList.remove('open');
    if (onSelectCallback) onSelectCallback(sel);
  }

  function shortType(t) {
    if (!t) return '';
    var p = String(t).split(':');
    return p[p.length - 1];
  }

  function escapeHtml(s) {
    var d = document.createElement('div');
    d.textContent = s == null ? '' : s;
    return d.innerHTML;
  }

  function escapeAttr(s) {
    return String(s).replace(/"/g, '&quot;');
  }

  return { init: init, runSearch: runSearch };
})();
